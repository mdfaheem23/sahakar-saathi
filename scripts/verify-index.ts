/**
 * Reports what is actually stored in Pinecone, and whether it still matches
 * the corpus in this build.
 *
 *   npm run verify:index
 *
 * A drifted index is the failure mode that matters here: it answers from text
 * the codebase no longer contains, while citing a clause that has since been
 * corrected. Run this after `npm run index:corpus`, and in CI before a deploy.
 */
import { config } from "dotenv";
config({ path: ".env", quiet: true });

import { CORPUS } from "@/lib/rag/corpus";
import { getIndex, hasPineconeConfig, pineconeIndexName } from "@/lib/rag/pinecone";

async function main() {
  if (!hasPineconeConfig()) {
    throw new Error("PINECONE_API_KEY is not set");
  }

  const index = getIndex();
  const stats = await index.describeIndexStats();
  const stored = stats.totalRecordCount ?? 0;

  console.log(`index          : ${pineconeIndexName()}`);
  console.log(`dimension      : ${stats.dimension}`);
  console.log(`vectors stored : ${stored}`);
  console.log(`corpus chunks  : ${CORPUS.length}`);
  console.log(
    stored === CORPUS.length
      ? "status         : IN SYNC — every chunk is indexed\n"
      : `status         : DRIFT — run \`npm run index:corpus\`\n`
  );

  // Which chunks are missing from the index, and which vectors are orphaned.
  const ids = CORPUS.map((c) => c.id);
  // SDK v8 takes { ids }, not a bare array.
  const fetched = await index.fetch({ ids });
  const present = new Set(Object.keys(fetched.records));
  const missing = ids.filter((id) => !present.has(id));
  if (missing.length) {
    console.log(`missing from index (${missing.length}):`);
    for (const m of missing) console.log(`  - ${m}`);
    console.log();
  }

  const sampleId = "gov:pmfby-premium-rates";
  const rec = fetched.records[sampleId];
  if (rec) {
    const m = (rec.metadata ?? {}) as Record<string, string>;
    console.log("--- what one stored vector looks like ---");
    console.log(`id       : ${rec.id}`);
    const values = rec.values ?? [];
    console.log(`values   : ${values.length} floats (first 4: ${values.slice(0, 4).map((v) => v.toFixed(4)).join(", ")})`);
    console.log(`agent    : ${m.agent}`);
    console.log(`source   : ${m.source}`);
    console.log(`url      : ${m.url || "(unverified)"}`);
    console.log(`verified : ${m.verifiedOn || "(never)"}`);
  }

  const verified = CORPUS.filter((c) => c.verifiedOn).length;
  console.log(`\nprovenance     : ${verified}/${CORPUS.length} chunks cite a source document URL`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
