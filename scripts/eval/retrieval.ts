/**
 * Retrieval accuracy against the labelled cases.
 *
 * Top-1 is the number that matters: the generator is handed the passages in
 * rank order and the trust verdict describes the cited one, so a wrong first
 * hit is a wrong citation even when the right passage is sitting at rank 3.
 *
 *   npx tsx --tsconfig tsconfig.json scripts/eval/retrieval.ts
 */
import { retrieve } from "@/lib/rag/hybrid";
import { CASES } from "./cases";

function ok(id: string, c: { expect: string; alt?: string[] }) {
  return id === c.expect || (c.alt ?? []).includes(id);
}

async function main() {
  let top1 = 0, top3 = 0;
  const misses: string[] = [];
  const magnets = new Map<string, number>();

  for (const c of CASES) {
    const { results } = await retrieve(c.q, 4);
    const ids = results.map((r) => r.chunk.id);
    const hit1 = ids[0] !== undefined && ok(ids[0], c);
    const hit3 = ids.slice(0, 3).some((id) => ok(id, c));
    if (hit1) top1++;
    if (hit3) top3++;
    if (!hit1) {
      const got = ids[0] ?? "none";
      magnets.set(got, (magnets.get(got) ?? 0) + 1);
      const rank = ids.findIndex((id) => ok(id, c));
      misses.push(
        `  [${c.lang}] ${c.q}\n       want ${c.expect}  got ${got}` +
          `  (correct at rank ${rank < 0 ? ">4" : rank + 1})`
      );
    }
  }

  const n = CASES.length;
  console.log(`\ntop-1 ${top1}/${n} = ${((top1 / n) * 100).toFixed(1)}%`);
  console.log(`top-3 ${top3}/${n} = ${((top3 / n) * 100).toFixed(1)}%`);
  if (misses.length) {
    console.log(`\n--- ${misses.length} wrong first hit ---`);
    misses.forEach((m) => console.log(m));
    console.log("\n--- passages that wrongly won ---");
    [...magnets.entries()].sort((a, b) => b[1] - a[1])
      .forEach(([id, n2]) => console.log(`  ${n2}x  ${id}`));
  }
}
main();
