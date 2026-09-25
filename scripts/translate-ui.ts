/**
 * Generates lib/i18n.generated.json — interface strings for the languages the
 * hand-written tables do not cover yet.
 *
 *   npm run translate:ui            fill only what is missing
 *   npm run translate:ui -- --all   retranslate every generated string
 *
 * Only strings with no hand-written translation are sent. Existing generated
 * entries are kept unless --all is passed, so a native speaker's correction
 * made directly in the JSON survives the next run.
 */
import "dotenv/config";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { STRINGS } from "../lib/i18n";
import { FRESHNESS_TEXT } from "../lib/sources/freshness";
import { SMALLTALK_REPLIES } from "../lib/rag/smalltalk";
import { AGENT_LABELS } from "../lib/router";
import { collectLocalized } from "../lib/i18n.overlay";
import { LangCode } from "../lib/types";

const OUT = path.join(__dirname, "..", "lib", "i18n.generated.json");
const TARGETS: { code: LangCode; name: string }[] = [
  { code: "mr", name: "Marathi" },
  { code: "bn", name: "Bengali" },
  { code: "gu", name: "Gujarati" },
  { code: "pa", name: "Punjabi (Gurmukhi script)" },
  { code: "or", name: "Odia" },
];
const BATCH = 8;

const SYSTEM = `You translate the interface of a free government assistant for Indian farmers and cooperative (PACS) members.
Return a JSON object with exactly the same keys as the input, each value translated into {LANG}.
Rules: plain words a farmer with little schooling understands; keep {date} and any {placeholder} exactly; keep PMFBY, PACS, KCC, NCCT, Aadhaar, IVR as recognisable transliterations; keep numbers exactly; no added or removed meaning; keep it about the same length (these are buttons and labels).`;

function parseJson(content: string): Record<string, string> {
  // Models wrap JSON in fences or a sentence; take the outermost object.
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("no JSON object in reply");
  return JSON.parse(content.slice(start, end + 1)) as Record<string, string>;
}

/**
 * Sarvam first: it is trained for Indian languages and is the Indian-hosted
 * option. Mistral is the fallback when Sarvam is unavailable.
 */
async function viaSarvam(entries: Record<string, string>, lang: string): Promise<Record<string, string> | null> {
  const key = process.env.SARVAM_API_KEY;
  if (!key) return null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch("https://api.sarvam.ai/v1/chat/completions", {
      method: "POST",
      headers: { "api-subscription-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "sarvam-105b",
        temperature: 0,
        // It reasons before answering; without headroom the JSON is cut off.
        max_tokens: 8000,
        reasoning_effort: "low",
        messages: [
          { role: "system", content: SYSTEM.replace("{LANG}", lang) + " Output only the JSON object." },
          { role: "user", content: JSON.stringify(entries) },
        ],
      }),
    });
    if (res.status === 429 || res.status >= 500) {
      await res.body?.cancel().catch(() => {});
      await new Promise((r) => setTimeout(r, 4000 * (attempt + 1)));
      continue;
    }
    if (!res.ok) {
      console.warn(`  Sarvam ${res.status}: ${await res.text()}`);
      return null;
    }
    const json = (await res.json()) as { choices: { message: { content: string | null } }[] };
    try {
      return parseJson(json.choices[0].message.content ?? "");
    } catch {
      console.warn("  Sarvam returned unparseable JSON; retrying");
    }
  }
  return null;
}

async function viaMistral(entries: Record<string, string>, lang: string): Promise<Record<string, string>> {
  const key = process.env.MISTRAL_API_KEY;
  if (!key) throw new Error("MISTRAL_API_KEY is not set");
  const models = [process.env.MISTRAL_CHAT_MODEL ?? "mistral-medium-latest", "mistral-small-latest"];
  for (let attempt = 0; attempt < 8; attempt++) {
    const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        // The free tier rate-limits per model, so alternate rather than wait on one.
        model: models[attempt % models.length],
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM.replace("{LANG}", lang) },
          { role: "user", content: JSON.stringify(entries) },
        ],
      }),
    });
    if (res.status === 429 || res.status >= 500) {
      await res.body?.cancel().catch(() => {});
      await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
      continue;
    }
    if (!res.ok) throw new Error(`Mistral ${res.status}: ${await res.text()}`);
    const json = (await res.json()) as { choices: { message: { content: string } }[] };
    return parseJson(json.choices[0].message.content);
  }
  throw new Error("Mistral kept rate-limiting");
}

async function translateBatch(entries: Record<string, string>, lang: string): Promise<Record<string, string>> {
  return (await viaSarvam(entries, lang)) ?? (await viaMistral(entries, lang));
}

async function main() {
  const all = process.argv.includes("--all");
  let existing: Record<string, Partial<Record<LangCode, string>>> = {};
  try {
    existing = JSON.parse(readFileSync(OUT, "utf8"));
  } catch {}

  const items = [
    ...collectLocalized("ui", STRINGS),
    ...collectLocalized("fresh", FRESHNESS_TEXT),
    ...collectLocalized("smalltalk", SMALLTALK_REPLIES),
    ...collectLocalized("agents", AGENT_LABELS),
  ];

  const save = () => writeFileSync(OUT, JSON.stringify(existing, null, 2) + "\n");

  await Promise.all(
    TARGETS.map(async ({ code, name }) => {
      const todo: Record<string, string> = {};
      for (const { path: p, text } of items) {
        const handWritten = text[code] && text[code] !== existing[p]?.[code];
        if (handWritten) continue;
        if (!all && existing[p]?.[code]) continue;
        todo[p] = text.en;
      }
      const keys = Object.keys(todo);
      console.log(`${name}: ${keys.length} strings`);
      for (let i = 0; i < keys.length; i += BATCH) {
        const slice = Object.fromEntries(keys.slice(i, i + BATCH).map((k) => [k, todo[k]]));
        const out = await translateBatch(slice, name);
        for (const k of Object.keys(slice)) {
          if (typeof out[k] !== "string" || !out[k].trim()) {
            console.warn(`  ${name}: missing ${k}`);
            continue;
          }
          if (todo[k].includes("{date}") && !out[k].includes("{date}")) {
            console.warn(`  ${name}: dropped {date} in ${k}; skipped`);
            continue;
          }
          (existing[k] ??= {})[code] = out[k].trim();
        }
        save();
        console.log(`  ${name}: ${Math.min(i + BATCH, keys.length)}/${keys.length}`);
      }
    })
  );
  console.log(`wrote ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
