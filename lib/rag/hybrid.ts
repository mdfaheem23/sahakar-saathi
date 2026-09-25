import { Chunk, CORPUS } from "./corpus";
import { BM25Index } from "./bm25";
import { cosineSimilarity, embedQuery, getCorpusVectors, hasEmbeddings } from "./embeddings";
import { hasVectorStore, queryVectors } from "./vectorStore";
import { stateFromQuery } from "./stateSchemes";

/**
 * Hybrid retrieval: BM25 (lexical) + multilingual-e5 embeddings (semantic), combined
 * with Reciprocal Rank Fusion.
 *
 * Why both: lexical alone misses paraphrase ("they took a cut" vs "service
 * charge"), and dense alone is unreliable on the exact identifiers that matter
 * most here — "PMFBY", "Sec. 27", "KCC". RRF fuses the two rankings without
 * needing the two score scales to be comparable, which is what makes it robust
 * when one retriever is unavailable.
 */

const RRF_K = 60; // standard damping constant
const CANDIDATES = 12;

export interface RetrievedChunk {
  chunk: Chunk;
  score: number;
  lexicalRank: number | null;
  semanticRank: number | null;
  /** Raw cosine similarity, when semantic retrieval ran. */
  similarity: number | null;
}

/** Which store answered the dense half of this query. */
export type SemanticBackend = "pgvector" | "in-process" | "none";

// Chunk id -> corpus position, so a pgvector match resolves back to the full
// chunk (canned translations, aliases) rather than only its stored metadata.
const INDEX_BY_ID = new Map(CORPUS.map((c, i) => [c.id, i]));

// Built once at module load — pure computation over a static corpus.
const bm25 = new BM25Index(CORPUS);

function rrf(rank: number): number {
  return 1 / (RRF_K + rank);
}

/**
 * How much a passage from another state is demoted.
 *
 * Demotion rather than exclusion: a Thanjavur member asking specifically about
 * Karnataka should still get an answer, but a general question about crop loan
 * interest must not surface Karnataka's 0% to someone in Tamil Nadu, where the
 * terms are different. Central passages carry no state and are never demoted.
 */
const OTHER_STATE_PENALTY = 0.55;

export async function retrieve(
  query: string,
  topK = 4,
  memberState?: string
): Promise<{
  results: RetrievedChunk[];
  usedSemantic: boolean;
  semanticBackend: SemanticBackend;
}> {
  const lexical = bm25.search(query).slice(0, CANDIDATES);
  const lexicalRankByDoc = new Map<number, number>();
  lexical.forEach((r, i) => lexicalRankByDoc.set(r.docIndex, i + 1));

  let semanticRankByDoc = new Map<number, number>();
  const similarityByDoc = new Map<number, number>();
  let usedSemantic = false;
  let semanticBackend: SemanticBackend = "none";

  if (hasEmbeddings()) {
    try {
      const queryVec = await embedQuery(query);

      // pgvector when it is configured, the in-process vectors otherwise. The
      // fallback is not a nicety: the kiosk runs without connectivity, and a
      // hard dependency on a hosted index would take dense retrieval away
      // exactly where the members with no other channel are being served.
      if (hasVectorStore()) {
        try {
          const matches = await queryVectors(queryVec, CANDIDATES);
          let rank = 0;
          let dropped = 0;
          for (const m of matches) {
            const docIndex = INDEX_BY_ID.get(m.chunkId);
            // A vector left over from a previous corpus revision: skip it
            // rather than answer from text this build no longer contains.
            if (docIndex === undefined) {
              dropped += 1;
              continue;
            }
            rank += 1;
            semanticRankByDoc.set(docIndex, rank);
            similarityByDoc.set(docIndex, m.score);
          }

          if (dropped) {
            // Drift between the index and this build. Worth saying out loud:
            // silently thinner dense results look exactly like a corpus that
            // simply has nothing relevant, and the fix is `npm run index:corpus`.
            console.warn(
              `[rag] ${dropped}/${matches.length} pgvector matches are not in this build's corpus - re-run index:corpus`
            );
          }

          // Only claim pgvector answered if it actually contributed a ranking.
          // An index that is empty, or entirely stale relative to this build,
          // returns matches that all resolve to nothing - and treating that as
          // a successful semantic pass left retrieval lexical-only while
          // reporting itself as hybrid, which is the harder failure to see.
          if (rank > 0) {
            usedSemantic = true;
            semanticBackend = "pgvector";
          } else {
            console.warn("[rag] pgvector returned no usable match, using in-process vectors");
            semanticRankByDoc = new Map();
            similarityByDoc.clear();
          }
        } catch (err) {
          console.error("[rag] pgvector query failed, using in-process vectors:", err);
        }
      }

      if (!usedSemantic) {
        const corpusVecs = await getCorpusVectors();
        const scored = corpusVecs
          .map((vec, docIndex) => ({ docIndex, score: cosineSimilarity(queryVec, vec) }))
          .sort((a, b) => b.score - a.score)
          .slice(0, CANDIDATES);

        semanticRankByDoc = new Map(scored.map((r, i) => [r.docIndex, i + 1]));
        for (const r of scored) similarityByDoc.set(r.docIndex, r.score);
        usedSemantic = true;
        semanticBackend = "in-process";
      }
    } catch (err) {
      // Embeddings are an enhancement, not a dependency: a failure here
      // degrades to lexical-only rather than failing the whole request.
      console.error("[rag] semantic retrieval unavailable:", err);
    }
  }

  const fused = new Map<number, number>();
  for (const [docIndex, rank] of lexicalRankByDoc) {
    fused.set(docIndex, (fused.get(docIndex) ?? 0) + rrf(rank));
  }
  for (const [docIndex, rank] of semanticRankByDoc) {
    fused.set(docIndex, (fused.get(docIndex) ?? 0) + rrf(rank));
  }

  // Prefer the state the question is about: the one it names if it names one,
  // otherwise the member's own.
  const focusState = stateFromQuery(query) ?? memberState;
  if (focusState) {
    for (const [docIndex, score] of fused) {
      const chunkState = CORPUS[docIndex].state;
      if (chunkState && chunkState !== focusState) {
        fused.set(docIndex, score * OTHER_STATE_PENALTY);
      }
    }
  }

  const results = [...fused.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topK)
    .map(([docIndex, score]) => ({
      chunk: CORPUS[docIndex],
      score,
      lexicalRank: lexicalRankByDoc.get(docIndex) ?? null,
      semanticRank: semanticRankByDoc.get(docIndex) ?? null,
      similarity: similarityByDoc.get(docIndex) ?? null,
    }));

  return { results, usedSemantic, semanticBackend };
}

/**
 * Minimum cosine for a passage to count as genuinely on-topic.
 *
 * Measured, not guessed — `npm run tune:threshold` scores a fixed set of
 * answerable and unanswerable questions against the live corpus with
 * multilingual-e5-small:
 *
 *   lowest on-topic   0.837  (Tamil: "crop loan interest in Tamil Nadu")
 *   highest off-topic 0.798  ("how do I cook biryani")
 *   midpoint          0.817
 *
 * e5 scores everything high — unrelated text still lands near 0.75 — so this
 * number means nothing outside the model it was measured on. It was 0.724
 * under the previous embedding model. Re-run the tuner whenever the corpus or
 * EMBED_MODEL changes.
 *
 * This gate matters because rank alone cannot express "nothing here is
 * relevant" — dense retrieval always returns a rank 1, however poor the match.
 */
const MIN_SIMILARITY = Number(process.env.MIN_SIMILARITY ?? 0.817);

export function hasUsableContext(results: RetrievedChunk[]): boolean {
  if (results.length === 0) return false;

  const scored = results.filter((r) => r.similarity !== null);

  // Semantic retrieval unavailable (no key, or the call failed): fall back to
  // requiring the lexical side to have ranked something highly.
  if (scored.length === 0) {
    const best = results[0];
    return best.lexicalRank !== null && best.lexicalRank <= 2;
  }

  return scored.some((r) => (r.similarity as number) >= MIN_SIMILARITY);
}
