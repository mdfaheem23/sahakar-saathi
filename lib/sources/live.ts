import "server-only";
import { checkSources, alertsFrom, type Fingerprint } from "./check";
import { setRuntimeAlerts, runtimeAlertsCheckedAt } from "./alerts";
import fingerprints from "./fingerprints.json";

/**
 * Keeps a running instance's view of the government sources current.
 *
 * This closes the gap between noticing and acting. The daily cron notices, but
 * a serverless function cannot write to the repository it was built from, so
 * its finding used to reach a webhook and stop there — leaving every kiosk,
 * phone and telephone line serving the changed document as verified until a
 * person reached a laptop and set an environment variable. On a Sunday, that
 * is the whole weekend.
 *
 * So each instance verifies for itself, on a timer, and downgrades its own
 * answers. No database, no provisioning decision, no vendor. The cost is a
 * handful of HEAD requests every six hours per warm instance, which is
 * nothing next to a single answer served with false confidence.
 *
 * Two things it deliberately does not do. It never blocks an answer — a
 * farmer at a counter does not wait on seventeen government hosts, so the
 * refresh is fired and forgotten and the first request after a cold start is
 * served from the committed baseline. And it never clears a committed alert:
 * layers are unioned, so this can only ever raise a doubt, never bury one.
 */
const REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;

/**
 * Guards against a stampede.
 *
 * Fluid Compute reuses an instance across concurrent requests, so without this
 * a burst of morning traffic on a cold instance would fire seventeen source
 * checks per request rather than seventeen in total — turning a safety
 * mechanism into a denial-of-service against the departments it is meant to
 * be watching.
 */
let inFlight: Promise<void> | null = null;

async function refresh(): Promise<void> {
  const previous = fingerprints as Record<string, Fingerprint>;
  const results = await checkSources(previous);
  setRuntimeAlerts(alertsFrom(results));

  const raised = alertsFrom(results);
  // Logged either way. A silent all-clear is indistinguishable from a check
  // that never ran, and "it was working, we assumed" is how this kind of
  // safety mechanism dies without anyone noticing.
  console.log(
    `[live] re-verified ${results.length} government source(s); ${raised.length} doubted.`
  );
  if (raised.length) {
    console.warn(
      `[live] now serving with a warning: ` +
        raised.map((a) => `${a.sourceId}/${a.kind}`).join(", ")
    );
  }
}

/**
 * Refreshes if the interval has elapsed. Safe to call on every request.
 *
 * Callers should not await this. It returns a promise only so a cron or a
 * test can wait for it deliberately.
 */
export function ensureFreshAlerts(): Promise<void> {
  if (process.env.DISABLE_LIVE_SOURCE_CHECK === "1") return Promise.resolve();
  if (Date.now() - runtimeAlertsCheckedAt() < REFRESH_INTERVAL_MS) return Promise.resolve();
  if (inFlight) return inFlight;

  // Stamped before the work starts, not after. A run that fails must still
  // hold off the next attempt, or a department that is down takes the whole
  // interval's worth of retries on every single request.
  setRuntimeAlerts([], Date.now());

  inFlight = refresh()
    .catch((err) => {
      console.error("[live] source refresh failed:", err);
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}
