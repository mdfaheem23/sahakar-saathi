/**
 * Embeds the corpus with multilingual-e5 and writes the vectors to
 *   1. lib/rag/vectors.json — baked into the build, so a cold start embeds
 *      only the question and the offline kiosk has every vector;
 *   2. pgvector on Supabase, when it is configured — the hosted index.
 *
 *   npm run index:corpus
 *
 * Re-run whenever a passage in the corpus changes. Retrieval notices a stale
 * vector (the text hash no longer matches) and embeds it on the fly, but says
 * so in the logs, because that cost lands on a member's request.
 */
import { config } from "dotenv";
config({ path: ".env", quiet: true });

import { writeFileSync } from "node:fs";
import path from "node:path";
import { CORPUS } from "@/lib/rag/corpus";
import { EMBED_DIMENSION, EMBED_MODEL, embedPassages, passageText, textHash } from "@/lib/rag/embeddings";
import { adminSecret, hasDatabase, rpc } from "@/lib/server/supabase";

const OUT = path.join(__dirname, "..", "lib", "rag", "vectors.json");
const UPSERT_BATCH = 40;

async function main() {
  console.log(`corpus: ${CORPUS.length} chunks · model ${EMBED_MODEL} (${EMBED_DIMENSION}-dim)`);
  const inputs = CORPUS.map(passageText);
  const t0 = Date.now();
  const vectors = await embedPassages(inputs);
  console.log(`embedded in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  const baked = {
    model: EMBED_MODEL,
    vectors: Object.fromEntries(
      CORPUS.map((c, i) => [
        c.id,
        // Rounded: six decimals is far below e5's own noise and halves the file.
        { hash: textHash(inputs[i]), v: vectors[i].map((x) => Math.round(x * 1e6) / 1e6) },
      ])
    ),
  };
  writeFileSync(OUT, JSON.stringify(baked) + "\n");
  console.log(`wrote ${OUT}`);

  if (!hasDatabase()) {
    console.log("SUPABASE_URL not set — skipped pgvector");
    return;
  }

  const rows = CORPUS.map((c, i) => ({
    chunk_id: c.id,
    agent: c.agent,
    state: c.state ?? "",
    model: EMBED_MODEL,
    text_hash: textHash(inputs[i]),
    embedding: `[${vectors[i].join(",")}]`,
  }));
  for (let i = 0; i < rows.length; i += UPSERT_BATCH) {
    await rpc("admin_upsert_vectors", { p_secret: adminSecret(), p_rows: rows.slice(i, i + UPSERT_BATCH) }, 30000);
    console.log(`pgvector: upserted ${Math.min(i + UPSERT_BATCH, rows.length)}/${rows.length}`);
  }
  const pruned = await rpc<number>("admin_prune_vectors", { p_secret: adminSecret(), p_keep: CORPUS.map((c) => c.id) });
  console.log(`pgvector: pruned ${pruned} vectors no longer in the corpus`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
