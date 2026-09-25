import { CORPUS, Chunk } from "./corpus";
import BAKED from "./vectors.json";

/**
 * Dense retrieval via multilingual-e5, run in-process.
 *
 * No embedding API: the model runs inside this server (ONNX, quantised), so a
 * member's question is never sent anywhere to be embedded, and the same code
 * embeds on the offline kiosk. e5 was trained with task prefixes and scores
 * noticeably worse without them — "query: " for questions, "passage: " for
 * the corpus.
 *
 * Corpus vectors are baked into vectors.json by `npm run index:corpus`, keyed
 * by chunk id and a hash of the embedded text, so a cold start embeds only the
 * question. A chunk edited since the last bake is embedded lazily and a
 * warning names the script to re-run.
 */

export const EMBED_MODEL = process.env.EMBED_MODEL ?? "Xenova/multilingual-e5-small";
export const EMBED_DIMENSION = 384;

type Extractor = (
  texts: string[],
  opts: { pooling: "mean"; normalize: boolean }
) => Promise<{ tolist(): number[][] }>;

let extractor: Promise<Extractor> | null = null;

function loadExtractor(): Promise<Extractor> {
  if (!extractor) {
    extractor = (async () => {
      const { pipeline, env } = await import("@huggingface/transformers");
      // Serverless file systems are read-only outside /tmp.
      env.cacheDir = process.env.HF_CACHE_DIR ?? (process.env.VERCEL ? "/tmp/hf" : "./.cache/hf");
      const pipe = await pipeline("feature-extraction", EMBED_MODEL, { dtype: "q8" });
      return pipe as unknown as Extractor;
    })().catch((err) => {
      extractor = null;
      throw err;
    });
  }
  return extractor;
}

export function hasEmbeddings(): boolean {
  return process.env.DISABLE_EMBEDDINGS !== "1";
}

/** What is embedded for a chunk. Aliases carry the multilingual surface forms. */
export function passageText(c: Pick<Chunk, "text" | "aliases">): string {
  return c.aliases.length ? `${c.text}\n\nRelated terms: ${c.aliases.join(", ")}` : c.text;
}

/** Stable short hash of the embedded text, so a stale baked vector is noticed. */
export function textHash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

async function embed(inputs: string[]): Promise<number[][]> {
  const run = await loadExtractor();
  const out: number[][] = [];
  const BATCH = 16;
  for (let i = 0; i < inputs.length; i += BATCH) {
    const res = await run(inputs.slice(i, i + BATCH), { pooling: "mean", normalize: true });
    out.push(...res.tolist());
  }
  return out;
}

export async function embedQuery(query: string): Promise<number[]> {
  const [vec] = await embed([`query: ${query}`]);
  return vec;
}

/** Embeds corpus-style passages. Shared with the indexing script. */
export async function embedPassages(texts: string[]): Promise<number[][]> {
  return embed(texts.map((t) => `passage: ${t}`));
}

type Baked = { model: string; vectors: Record<string, { hash: string; v: number[] }> };

let corpusVectors: number[][] | null = null;
let inflight: Promise<number[][]> | null = null;

/** Corpus vectors, from the bake where current, embedded here where not. */
export async function getCorpusVectors(): Promise<number[][]> {
  if (corpusVectors) return corpusVectors;
  if (inflight) return inflight;

  inflight = (async () => {
    const baked = BAKED as Baked;
    const usable = baked.model === EMBED_MODEL ? baked.vectors : {};
    const out: number[][] = new Array(CORPUS.length);
    const missing: number[] = [];

    CORPUS.forEach((c, i) => {
      const hit = usable[c.id];
      if (hit && hit.hash === textHash(passageText(c))) out[i] = hit.v;
      else missing.push(i);
    });

    if (missing.length) {
      console.warn(`[rag] ${missing.length} corpus passages not in vectors.json - run npm run index:corpus`);
      const fresh = await embedPassages(missing.map((i) => passageText(CORPUS[i])));
      missing.forEach((docIndex, j) => (out[docIndex] = fresh[j]));
    }

    corpusVectors = out;
    return out;
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}
