import { Chunk } from "./corpus";

/**
 * BM25 (Okapi) sparse retriever — the lexical half of the hybrid.
 *
 * Kept in-process rather than delegated to a search service: the corpus is
 * small enough that an inverted index costs microseconds to build, and it
 * means retrieval still works with no network and no API key, which is the
 * same offline constraint the kiosk operates under.
 */

const K1 = 1.5; // term-frequency saturation
const B = 0.75; // length normalisation

/**
 * Indic scripts write a syllable as a base letter plus combining vowel signs
 * and viramas, and those marks are Unicode category M, not L. Matching only
 * [\p{L}\p{N}] therefore broke every word at its first vowel sign: "ಬೆಳೆ"
 * (crop) produced no usable token at all, "बीमा" (insurance) was dropped, and
 * Telugu and Malayalam words came apart into meaningless fragments. The
 * lexical side was effectively Latin-only, so a question typed in an Indian
 * language contributed almost nothing to retrieval.
 *
 * \p{M} keeps the marks attached to their base letter, which is what makes a
 * whole word survive tokenisation.
 */
const TOKEN_RE = /[\p{L}\p{N}\p{M}]+/gu;

// ZWNJ/ZWJ control how a cluster is rendered, not what it means, and the same
// word is written both with and without them. Dropping them before tokenising
// makes those spellings collide on one term instead of missing each other.
const JOINERS = /[\u200c\u200d]/g;

const STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "of", "to", "in",
  "for", "on", "at", "by", "with", "and", "or", "if", "it", "this", "that",
  "i", "my", "me", "you", "your", "we", "can", "do", "does", "did", "have",
  "has", "will", "would", "should", "what", "how", "when", "where", "who",
]);

export function tokenize(text: string): string[] {
  // NFC first: the same Indic syllable can arrive pre-composed or decomposed
  // depending on the keyboard or ASR engine that produced it, and the two
  // forms are different strings to a Map lookup.
  const normalized = text.normalize("NFC").replace(JOINERS, "").toLowerCase();
  const matches = normalized.match(TOKEN_RE) ?? [];
  return matches.filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

interface Posting {
  docIndex: number;
  tf: number;
}

export class BM25Index {
  private postings = new Map<string, Posting[]>();
  private docLengths: number[] = [];
  private avgDocLength = 0;
  private docCount = 0;

  constructor(chunks: Chunk[]) {
    this.docCount = chunks.length;

    chunks.forEach((chunk, docIndex) => {
      // Aliases are indexed alongside the body so a Hindi or Tamil query term
      // can still hit an English passage — a poor man's cross-lingual bridge
      // for the lexical side, where the dense side does the heavy lifting.
      const tokens = [...tokenize(chunk.text), ...tokenize(chunk.aliases.join(" "))];
      this.docLengths[docIndex] = tokens.length;

      const counts = new Map<string, number>();
      for (const tok of tokens) counts.set(tok, (counts.get(tok) ?? 0) + 1);

      for (const [term, tf] of counts) {
        let list = this.postings.get(term);
        if (!list) {
          list = [];
          this.postings.set(term, list);
        }
        list.push({ docIndex, tf });
      }
    });

    const total = this.docLengths.reduce((a, b) => a + b, 0);
    this.avgDocLength = this.docCount === 0 ? 0 : total / this.docCount;
  }

  /** Returns scores per document index, descending, non-zero only. */
  search(query: string): { docIndex: number; score: number }[] {
    const terms = tokenize(query);
    const scores = new Map<number, number>();

    for (const term of terms) {
      const list = this.postings.get(term);
      if (!list) continue;

      // Robertson/Sparck-Jones IDF with the +0.5 smoothing that keeps very
      // common terms from going negative on a small corpus.
      const df = list.length;
      const idf = Math.log(1 + (this.docCount - df + 0.5) / (df + 0.5));

      for (const { docIndex, tf } of list) {
        const norm =
          this.avgDocLength === 0
            ? 1
            : 1 - B + B * (this.docLengths[docIndex] / this.avgDocLength);
        const contribution = (idf * (tf * (K1 + 1))) / (tf + K1 * norm);
        scores.set(docIndex, (scores.get(docIndex) ?? 0) + contribution);
      }
    }

    return [...scores.entries()]
      .map(([docIndex, score]) => ({ docIndex, score }))
      .sort((a, b) => b.score - a.score);
  }
}
