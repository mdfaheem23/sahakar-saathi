/**
 * One place where a rate-limited Mistral call is retried.
 *
 * The free tier this runs on rate-limits aggressively — a member asking two
 * questions in quick succession, or a kiosk answering while the daily source
 * check embeds in the background, is enough to draw a 429. Every caller here
 * already degrades gracefully rather than erroring, which sounds fine and is
 * in fact the worst possible failure: generation falls back to reciting the
 * top retrieved passage, so instead of an answer to the question asked, the
 * member is read a paragraph about something adjacent, in a confident voice,
 * with a verified badge on it. It looks like an answer. Nothing on the screen
 * says the model never ran.
 *
 * A 429 is not a failure, it is a "wait". So it is waited out here, twice,
 * before any of that degradation is allowed to happen.
 */

/** Attempts after the first. Two covers a burst; more would stall the member. */
const MAX_RETRIES = 2;

/** Base backoff. The free tier's window is about a second wide. */
const BASE_DELAY_MS = 1200;

const RETRYABLE = new Set([429, 500, 502, 503, 504]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * How long to wait before trying again.
 *
 * `Retry-After` is honoured when the server sends one — it knows the window
 * better than a constant does — but capped, because a farmer standing at a
 * counter cannot be made to wait thirty seconds for a sentence.
 */
function retryDelay(res: Response, attempt: number): number {
  const header = res.headers.get("retry-after");
  if (header) {
    const seconds = Number.parseFloat(header);
    if (Number.isFinite(seconds) && seconds > 0) {
      return Math.min(seconds * 1000, 5000);
    }
  }
  return BASE_DELAY_MS * (attempt + 1);
}

/**
 * `fetch`, with retries on the statuses that mean "not now" rather than "no".
 *
 * Returns the last response whatever it is, so callers keep their existing
 * error handling; a 429 that survives every retry still reaches them as a 429.
 */
export async function mistralFetch(
  url: string,
  init: RequestInit,
  label: string
): Promise<Response> {
  let res = await fetch(url, init);

  for (let attempt = 0; attempt < MAX_RETRIES && RETRYABLE.has(res.status); attempt++) {
    const wait = retryDelay(res, attempt);
    console.warn(`[${label}] Mistral ${res.status}, retrying in ${wait}ms`);
    // The body is never read on this path, but leaving it undrained keeps the
    // connection pinned open for the length of the backoff.
    await res.body?.cancel().catch(() => {});
    await sleep(wait);
    res = await fetch(url, init);
  }

  return res;
}
