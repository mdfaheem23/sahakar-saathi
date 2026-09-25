/**
 * Reports whether the baked vectors and the pgvector index still match the
 * corpus in this build.
 *
 *   npm run verify:index
 *
 * A drifted index is the failure mode that matters here: it answers from text
 * the codebase no longer contains, while citing a clause that has since been
 * corrected. Run this after `npm run index:corpus`, and in CI before a deploy.
 */
import { config } from "dotenv";
config({ path: ".env", quiet: true });

import BAKED from "@/lib/rag/vectors.json";
import { CORPUS } from "@/lib/rag/corpus";
import { EMBED_MODEL, passageText, textHash } from "@/lib/rag/embeddings";
import { adminSecret, hasDatabase, rpc } from "@/lib/server/supabase";

function report(label: string, stored: Map<string, { model: string; hash: string }>): number {
  let stale = 0;
  let missing = 0;
  for (const c of CORPUS) {
    const row = stored.get(c.id);
    if (!row) missing++;
    else if (row.model !== EMBED_MODEL || row.hash !== textHash(passageText(c))) stale++;
  }
  const orphans = [...stored.keys()].filter((id) => !CORPUS.some((c) => c.id === id)).length;
  console.log(`${label.padEnd(12)}: ${stored.size} stored · ${missing} missing · ${stale} stale · ${orphans} orphaned`);
  return missing + stale + orphans;
}

async function main() {
  console.log(`corpus      : ${CORPUS.length} chunks · ${EMBED_MODEL}`);
  const baked = BAKED as { model: string; vectors: Record<string, { hash: string }> };
  let problems = report(
    "vectors.json",
    new Map(Object.entries(baked.vectors).map(([id, v]) => [id, { model: baked.model, hash: v.hash }]))
  );

  if (hasDatabase()) {
    const rows = await rpc<{ chunk_id: string; model: string; text_hash: string }[]>("admin_vector_status", {
      p_secret: adminSecret(),
    });
    problems += report("pgvector", new Map(rows.map((r) => [r.chunk_id, { model: r.model, hash: r.text_hash }])));
  }

  if (problems) {
    console.log("\nout of date — run npm run index:corpus");
    process.exit(1);
  }
  console.log("\nin sync");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
