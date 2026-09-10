import { Pinecone, type Index } from "@pinecone-database/pinecone";

/**
 * Pinecone-backed dense retrieval.
 *
 * The in-process store embeds the whole corpus on first request and holds the
 * vectors in module scope. That is fine for a 36-chunk demo corpus and it is
 * what keeps the offline kiosk working, but it re-embeds on every cold start
 * and cannot grow to the real corpus — the Cooperative Societies Act, every
 * state's by-laws and the full PMFBY circular set is far past what belongs in
 * a serverless function's memory.
 *
 * This module is therefore additive, not a replacement: when Pinecone is
 * configured the semantic half of retrieval queries it, and when it is not,
 * retrieval falls back to the in-process vectors. The kiosk keeps working with
 * no network, which is the whole reason that path exists.
 */

/** mistral-embed output width. The index must be created with this dimension. */
export const EMBED_DIMENSION = 1024;

/** Cosine, to match the similarity the in-process path computes. */
export const INDEX_METRIC = "cosine";

const INDEX_NAME = process.env.PINECONE_INDEX ?? "pacs-sahayak";

let client: Pinecone | null = null;
let index: Index | null = null;

export function hasPineconeConfig(): boolean {
  return !!process.env.PINECONE_API_KEY;
}

export function pineconeIndexName(): string {
  return INDEX_NAME;
}

function getClient(): Pinecone {
  const apiKey = process.env.PINECONE_API_KEY;
  if (!apiKey) throw new Error("PINECONE_API_KEY is not configured");
  if (!client) client = new Pinecone({ apiKey });
  return client;
}

export function getIndex(): Index {
  if (!index) index = getClient().index(INDEX_NAME);
  return index;
}

/**
 * Metadata stored alongside each vector.
 *
 * The passage text rides along so a query returns everything needed to build
 * an answer without a second lookup, and `source`/`url`/`verifiedOn` travel
 * with it so a retrieved passage can still be cited — a vector hit that cannot
 * name its source is unusable here.
 */
export interface VectorMetadata extends Record<string, string> {
  chunkId: string;
  text: string;
  source: string;
  agent: string;
  url: string;
  verifiedOn: string;
}

export interface VectorMatch {
  chunkId: string;
  score: number;
  metadata: VectorMetadata;
}

/** Queries the index for the nearest passages to an already-embedded query. */
export async function queryVectors(
  vector: number[],
  topK: number
): Promise<VectorMatch[]> {
  const res = await getIndex().query({
    vector,
    topK,
    includeMetadata: true,
  });

  return (res.matches ?? [])
    .filter((m) => m.metadata)
    .map((m) => ({
      chunkId: (m.metadata as VectorMetadata).chunkId ?? m.id,
      score: m.score ?? 0,
      metadata: m.metadata as VectorMetadata,
    }));
}

/** Creates the index if it does not exist yet, then waits for it to be ready. */
export async function ensureIndex(): Promise<void> {
  const pc = getClient();
  const existing = await pc.listIndexes();
  if (existing.indexes?.some((i) => i.name === INDEX_NAME)) return;

  await pc.createIndex({
    name: INDEX_NAME,
    dimension: EMBED_DIMENSION,
    metric: INDEX_METRIC,
    spec: { serverless: { cloud: "aws", region: "us-east-1" } },
    waitUntilReady: true,
  });
}
