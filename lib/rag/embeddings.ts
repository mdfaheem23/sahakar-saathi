import { CORPUS } from "./corpus";
import { mistralFetch } from "./mistralFetch";

/**
 * Dense retrieval via Mistral embeddings.
 *
 * The corpus is small and static, so vectors are computed once and held in
 * module scope for the lifetime of the server process. `scripts/build-index.ts`
 * can bake them into a JSON file for cold-start-free production; without that
 * file we embed lazily on the first request and cache the result.
 */

const EMBED_MODEL = "mistral-embed";
const EMBED_ENDPOINT = "https://api.mistral.ai/v1/embeddings";

let corpusVectors: number[][] | null = null;
let inflight: Promise<number[][]> | null = null;

export function hasMistralKey(): boolean {
  return !!process.env.MISTRAL_API_KEY;
}

async function embedBatch(inputs: string[]): Promise<number[][]> {
  const key = process.env.MISTRAL_API_KEY;
  if (!key) throw new Error("MISTRAL_API_KEY is not configured");

  const res = await mistralFetch(
    EMBED_ENDPOINT,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: EMBED_MODEL, input: inputs }),
    },
    "embed"
  );

  if (!res.ok) {
    throw new Error(`Mistral embeddings failed (${res.status}): ${await res.text()}`);
  }

  const json = (await res.json()) as { data: { index: number; embedding: number[] }[] };
  // The API does not guarantee ordering; place by the index it returns.
  const out: number[][] = new Array(inputs.length);
  for (const row of json.data) out[row.index] = row.embedding;
  return out;
}

export async function embedQuery(query: string): Promise<number[]> {
  const [vec] = await embedBatch([query]);
  return vec;
}

/**
 * Embeds an arbitrary list of texts, batched to stay inside request limits.
 *
 * Shared with the Pinecone indexing script so the vectors stored remotely are
 * produced by the same call as the ones computed in process — a different
 * model or input shape between the two would make the two retrieval paths
 * disagree about what is relevant.
 */
export async function embedTexts(inputs: string[]): Promise<number[][]> {
  const BATCH = 32;
  const vectors: number[][] = [];
  for (let i = 0; i < inputs.length; i += BATCH) {
    vectors.push(...(await embedBatch(inputs.slice(i, i + BATCH))));
  }
  return vectors;
}

/** Embeds the whole corpus once; concurrent callers share one in-flight call. */
export async function getCorpusVectors(): Promise<number[][]> {
  if (corpusVectors) return corpusVectors;
  if (inflight) return inflight;

  inflight = (async () => {
    // Aliases are appended so the embedded passage carries the same
    // multilingual surface forms the sparse index sees.
    const inputs = CORPUS.map((c) =>
      c.aliases.length ? `${c.text}\n\nRelated terms: ${c.aliases.join(", ")}` : c.text
    );

    const BATCH = 32;
    const vectors: number[][] = [];
    for (let i = 0; i < inputs.length; i += BATCH) {
      vectors.push(...(await embedBatch(inputs.slice(i, i + BATCH))));
    }
    corpusVectors = vectors;
    return vectors;
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

/** Preloads vectors from a baked index, skipping the lazy embed path. */
export function primeCorpusVectors(vectors: number[][]) {
  corpusVectors = vectors;
}
