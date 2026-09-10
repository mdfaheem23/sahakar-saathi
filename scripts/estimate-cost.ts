import { CORPUS } from "@/lib/rag/corpus";

const inputs = CORPUS.map((c) =>
  c.aliases.length ? `${c.text}\n\nRelated terms: ${c.aliases.join(", ")}` : c.text
);
const chars = inputs.reduce((n, s) => n + s.length, 0);
// Indic scripts tokenize far worse than English — roughly 1 token per 2 chars
// here rather than the ~4 you would assume for English-only text.
const tokens = Math.ceil(chars / 2.5);
const USD_PER_M = 0.1;
const perRun = (tokens / 1_000_000) * USD_PER_M;

console.log(`chunks              : ${CORPUS.length}`);
console.log(`characters embedded : ${chars.toLocaleString()}`);
console.log(`approx tokens       : ${tokens.toLocaleString()}`);
console.log(`cost per full re-embed : $${perRun.toFixed(5)}`);
console.log(`cost if run daily/year : $${(perRun * 365).toFixed(3)}`);
console.log(`Pinecone writes/year   : ${(CORPUS.length * 365).toLocaleString()} of 2,000,000 free (${((CORPUS.length*365/2_000_000)*100).toFixed(2)}%)`);
