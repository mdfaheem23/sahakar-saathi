import { hasDatabase, rpc } from "../server/supabase";
import { EMBED_MODEL } from "./embeddings";

/**
 * pgvector on Supabase (Mumbai) — the hosted vector index.
 *
 * Optional by design. The in-process vectors in embeddings.ts hold the same
 * corpus, so retrieval never depends on this: the kiosk runs without it, and
 * a database outage costs nothing but the log line. What the index adds is
 * one place the fleet's vectors live, which matters once the corpus grows
 * past what every instance should hold in memory.
 */

export function hasVectorStore(): boolean {
  return hasDatabase() && process.env.DISABLE_PGVECTOR !== "1";
}

export interface VectorMatch {
  chunkId: string;
  score: number;
}

export async function queryVectors(vector: number[], topK: number): Promise<VectorMatch[]> {
  const rows = await rpc<{ chunk_id: string; similarity: number }[]>(
    "match_passages",
    { p_embedding: `[${vector.join(",")}]`, p_model: EMBED_MODEL, p_count: topK },
    4000
  );
  return (rows ?? []).map((r) => ({ chunkId: r.chunk_id, score: r.similarity }));
}
