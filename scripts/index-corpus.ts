/**
 * Embeds the retrieval corpus and upserts it into Pinecone.
 *
 * Run after any change to knowledge.ts, myths.ts, entitlements.ts or
 * govSources.ts — the index is a copy of the corpus, and a stale copy answers
 * from withdrawn text while citing a clause that has since changed.
 *
 *   npx tsx --tsconfig tsconfig.json scripts/index-corpus.ts
 *
 * Needs MISTRAL_API_KEY (to embed) and PINECONE_API_KEY (to store).
 */
import { config } from "dotenv";
config({ path: ".env", quiet: true });

import { CORPUS } from "@/lib/rag/corpus";
import { embedTexts } from "@/lib/rag/embeddings";
import {
  ensureIndex,
  getIndex,
  hasPineconeConfig,
  pineconeIndexName,
  EMBED_DIMENSION,
  type VectorMetadata,
} from "@/lib/rag/pinecone";

const UPSERT_BATCH = 50;

async function main() {
  if (!process.env.MISTRAL_API_KEY) {
    throw new Error("MISTRAL_API_KEY is not set — embedding needs it.");
  }
  if (!hasPineconeConfig()) {
    throw new Error(
      "PINECONE_API_KEY is not set. Create a free account at pinecone.io, then " +
        "add PINECONE_API_KEY (and optionally PINECONE_INDEX) to .env"
    );
  }

  console.log(`corpus: ${CORPUS.length} chunks`);
  console.log(`index : ${pineconeIndexName()} (dim ${EMBED_DIMENSION}, cosine)`);

  await ensureIndex();
  console.log("index ready");

  // Same input shape the in-process path embeds, so a passage scores the same
  // whichever store answers the query.
  const inputs = CORPUS.map((c) =>
    c.aliases.length ? `${c.text}\n\nRelated terms: ${c.aliases.join(", ")}` : c.text
  );

  const vectors = await embedTexts(inputs);
  console.log(`embedded ${vectors.length} chunks`);

  const records = CORPUS.map((chunk, i) => ({
    id: chunk.id,
    values: vectors[i],
    metadata: {
      chunkId: chunk.id,
      text: chunk.text,
      source: chunk.source,
      agent: chunk.agent,
      // Pinecone metadata rejects undefined, and an unverified passage is a
      // real state worth recording rather than an omission.
      url: chunk.url ?? "",
      verifiedOn: chunk.verifiedOn ?? "",
    } satisfies VectorMetadata,
  }));

  const index = getIndex();
  for (let i = 0; i < records.length; i += UPSERT_BATCH) {
    const batch = records.slice(i, i + UPSERT_BATCH);
    // SDK v8 takes { records }, not a bare array.
    await index.upsert({ records: batch });
    console.log(`upserted ${Math.min(i + batch.length, records.length)}/${records.length}`);
  }

  const verified = CORPUS.filter((c) => c.verifiedOn).length;
  console.log(`\ndone — ${records.length} vectors live, ${verified} carrying a source URL`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
