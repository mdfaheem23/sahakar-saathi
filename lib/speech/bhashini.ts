import { LangCode } from "../types";

/**
 * Bhashini (MeitY, National Language Translation Mission) — speech and
 * translation, the primary provider for every language task.
 *
 * Bhashini's documented integration is two calls. The config call, made with
 * the integrator's ULCA credentials, names the service that handles a task in
 * a language and returns the inference endpoint with a key for it. The
 * compute call then runs the task. Config responses change rarely, so they are
 * cached per task and language; a compute failure evicts the entry so the next
 * request re-resolves rather than hammering a service that has moved.
 *
 * Every function returns null instead of throwing. The caller always has a
 * backup (Sarvam), and a Bhashini outage must never be a member-visible error.
 */

const CONFIG_URL = "https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline";
// MeitY's public pipeline, which covers ASR, NMT and TTS for the scheduled languages.
const DEFAULT_PIPELINE_ID = "64392f96daac500b55c543cd";
const CONFIG_TTL_MS = 60 * 60 * 1000;
const TIMEOUT_MS = 12_000;

type Task = "asr" | "translation" | "tts";

interface Resolved {
  serviceId: string;
  callbackUrl: string;
  authName: string;
  authValue: string;
  at: number;
}

const configCache = new Map<string, Resolved>();

export function hasBhashini(): boolean {
  return !!(process.env.BHASHINI_USER_ID && process.env.BHASHINI_API_KEY);
}

/** Bhashini language codes are ISO-639 and match ours, including Odia "or". */
function code(lang: LangCode): string {
  return lang;
}

function cacheKey(task: Task, source: LangCode, target?: LangCode): string {
  return `${task}:${source}:${target ?? ""}`;
}

async function withTimeout(url: string, init: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

function languageConfig(source: LangCode, target?: LangCode) {
  return target
    ? { sourceLanguage: code(source), targetLanguage: code(target) }
    : { sourceLanguage: code(source) };
}

async function resolve(task: Task, source: LangCode, target?: LangCode): Promise<Resolved | null> {
  const key = cacheKey(task, source, target);
  const hit = configCache.get(key);
  if (hit && Date.now() - hit.at < CONFIG_TTL_MS) return hit;

  const userID = process.env.BHASHINI_USER_ID;
  const ulcaApiKey = process.env.BHASHINI_API_KEY;
  if (!userID || !ulcaApiKey) return null;

  try {
    const res = await withTimeout(CONFIG_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", userID, ulcaApiKey },
      body: JSON.stringify({
        pipelineTasks: [{ taskType: task, config: { language: languageConfig(source, target) } }],
        pipelineRequestConfig: {
          pipelineId: process.env.BHASHINI_PIPELINE_ID || DEFAULT_PIPELINE_ID,
        },
      }),
    });
    if (!res.ok) {
      console.warn(`[bhashini] config ${task}/${source} → ${res.status}: ${await res.text()}`);
      return null;
    }
    const json = (await res.json()) as {
      pipelineResponseConfig?: { taskType: string; config: { serviceId: string }[] }[];
      pipelineInferenceAPIEndPoint?: {
        callbackUrl: string;
        inferenceApiKey: { name: string; value: string };
      };
    };
    const serviceId = json.pipelineResponseConfig?.[0]?.config?.[0]?.serviceId;
    const endpoint = json.pipelineInferenceAPIEndPoint;
    if (!serviceId || !endpoint?.callbackUrl || !endpoint.inferenceApiKey?.value) {
      console.warn(`[bhashini] no ${task} service for ${source}${target ? `→${target}` : ""}`);
      return null;
    }
    const resolved: Resolved = {
      serviceId,
      callbackUrl: endpoint.callbackUrl,
      authName: endpoint.inferenceApiKey.name || "Authorization",
      authValue: endpoint.inferenceApiKey.value,
      at: Date.now(),
    };
    configCache.set(key, resolved);
    return resolved;
  } catch (err) {
    console.warn(`[bhashini] config ${task}/${source} failed:`, err);
    return null;
  }
}

async function compute<T>(
  task: Task,
  source: LangCode,
  target: LangCode | undefined,
  extraConfig: Record<string, unknown>,
  inputData: Record<string, unknown>
): Promise<T | null> {
  const svc = await resolve(task, source, target);
  if (!svc) return null;
  try {
    const res = await withTimeout(svc.callbackUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", [svc.authName]: svc.authValue },
      body: JSON.stringify({
        pipelineTasks: [
          {
            taskType: task,
            config: { language: languageConfig(source, target), serviceId: svc.serviceId, ...extraConfig },
          },
        ],
        inputData,
      }),
    });
    if (!res.ok) {
      console.warn(`[bhashini] ${task}/${source} → ${res.status}: ${await res.text()}`);
      configCache.delete(cacheKey(task, source, target));
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.warn(`[bhashini] ${task}/${source} failed:`, err);
    configCache.delete(cacheKey(task, source, target));
    return null;
  }
}

type PipelineResponse = {
  pipelineResponse?: {
    output?: { source?: string; target?: string }[];
    audio?: { audioContent?: string }[];
  }[];
};

/** Speech-to-text. `wavBase64` must be 16 kHz mono WAV. */
export async function bhashiniTranscribe(wavBase64: string, lang: LangCode): Promise<string | null> {
  const json = await compute<PipelineResponse>(
    "asr",
    lang,
    undefined,
    { audioFormat: "wav", samplingRate: 16000 },
    { audio: [{ audioContent: wavBase64 }] }
  );
  const text = json?.pipelineResponse?.[0]?.output?.[0]?.source?.trim();
  return text || null;
}

/** Text-to-speech. Returns base64 WAV clips, in playback order. */
export async function bhashiniSpeak(text: string, lang: LangCode): Promise<string[] | null> {
  const json = await compute<PipelineResponse>(
    "tts",
    lang,
    undefined,
    { gender: process.env.BHASHINI_TTS_GENDER || "female", samplingRate: 22050 },
    { input: [{ source: text }] }
  );
  const clips = (json?.pipelineResponse?.[0]?.audio ?? [])
    .map((a) => a.audioContent)
    .filter((a): a is string => !!a);
  return clips.length ? clips : null;
}

/** Machine translation between two supported languages. */
export async function bhashiniTranslate(
  text: string,
  source: LangCode,
  target: LangCode
): Promise<string | null> {
  if (source === target) return text;
  const json = await compute<PipelineResponse>("translation", source, target, {}, {
    input: [{ source: text }],
  });
  const out = json?.pipelineResponse?.[0]?.output?.[0]?.target?.trim();
  return out || null;
}
