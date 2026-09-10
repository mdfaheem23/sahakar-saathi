/**
 * Tiny in-process TTL + LRU cache.
 *
 * Rural query traffic is extremely repetitive — a few hundred questions cover
 * most of the volume at a PACS counter — so caching answers and synthesized
 * audio removes both the latency and the per-call API cost for the long tail
 * of repeats. Deliberately dependency-free and in-memory: the production
 * design swaps this for Redis, but the key scheme is identical.
 */

interface Entry<V> {
  value: V;
  expiresAt: number;
}

export class TTLCache<V> {
  private map = new Map<string, Entry<V>>();

  constructor(
    private maxEntries: number,
    private ttlMs: number
  ) {}

  get(key: string): V | undefined {
    const hit = this.map.get(key);
    if (!hit) return undefined;

    if (Date.now() > hit.expiresAt) {
      this.map.delete(key);
      return undefined;
    }

    // Re-insert to move this key to the most-recently-used end of the Map,
    // which preserves insertion order and makes eviction a simple shift.
    this.map.delete(key);
    this.map.set(key, hit);
    return hit.value;
  }

  set(key: string, value: V) {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, { value, expiresAt: Date.now() + this.ttlMs });

    while (this.map.size > this.maxEntries) {
      const oldest = this.map.keys().next().value;
      if (oldest === undefined) break;
      this.map.delete(oldest);
    }
  }

  get size() {
    return this.map.size;
  }
}

/**
 * Cache key for a natural-language question.
 *
 * Normalised so trivial variation ("Can I claim?" vs "can i claim") shares an
 * entry, but not so aggressively that two genuinely different questions
 * collide — only case, punctuation and whitespace are folded; every word is
 * preserved.
 */
export function questionKey(question: string, lang: string): string {
  const normalized = question
    .toLowerCase()
    // Punctuation is dropped wherever it appears, not just at the end: the
    // same question typed with and without a comma must share an entry. The
    // Devanagari danda is included since Hindi input uses it as a full stop.
    .replace(/[?!.,;:''"“”‘’।]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return `${lang}::${normalized}`;
}

/** Cache key for synthesized speech. Same text + language = same audio. */
export function speechKey(text: string, languageCode: string): string {
  return `${languageCode}::${text.trim()}`;
}
