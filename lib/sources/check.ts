import { createHash } from "node:crypto";
import { WATCHED_SOURCES, type WatchedSource } from "./registry";
import type { SourceAlert } from "./alerts";

/** A source's identity at a point in time — what "unchanged" is compared against. */
export interface Fingerprint {
  etag?: string;
  lastModified?: string;
  contentLength?: string;
  bodySha256?: string;
  checkedAt: string;
}

export type CheckStatus = "unchanged" | "changed" | "unknown" | "blocked" | "error";

/** Whether the scheme's application portal is still taking submissions. */
export type PortalStatus = "accepting" | "dead" | "unknown";

/** Whether money is still moving under the scheme. */
export type ActivityStatus = "paying" | "dormant" | "unknown";

export interface CheckResult {
  id: string;
  title: string;
  url: string;
  status: CheckStatus;
  detail: string;
  affects: string[];
  fingerprint?: Fingerprint;
  /** Result of probing the application portal, when the source names one. */
  portal?: { status: PortalStatus; url: string; detail: string };
  /** Result of probing the published payment record, when the source names one. */
  activity?: { status: ActivityStatus; url: string; lastPaidOn?: string; detail: string };
  /**
   * The host itself is gone — not slow, not erroring, absent.
   *
   * Kept separate from `status: "error"` because the two need opposite
   * treatment and conflating them is how a real finding gets buried in noise.
   */
  unreachable?: boolean;
}

/**
 * Failures that mean the source no longer exists, as against being unwell.
 *
 * The distinction is the whole point. A government host times out or throws a
 * 500 most weeks; flagging that would put a permanent warning on the corpus
 * and train everyone to ignore it. But a domain that does not resolve has not
 * had a bad morning — someone decommissioned it, and a URL that cannot be
 * reached by anybody is not a citation any more.
 *
 * This was found the hard way. `rythubandhu.telangana.gov.in` returns NXDOMAIN
 * — Telangana retired the domain when Rythu Bandhu became Rythu Bharosa — and
 * the corpus was still citing it while this function quietly filed it under
 * "errored" and raised nothing. A scheme renamed by a state government, its
 * old domain deleted, and the assistant still answering from it, is the exact
 * failure the whole trust layer exists to catch. It had to be caught by a
 * person reading a log, which is not a system.
 */
const HOST_IS_GONE = new Set([
  // DNS has no record at all. EAI_AGAIN is deliberately absent: that is a
  // temporary resolver failure and usually says more about our network than
  // about theirs.
  "ENOTFOUND",
  // The host resolves but nothing is listening on the port.
  "ECONNREFUSED",
]);

function hostIsGone(err: unknown): boolean {
  const code = (err as { cause?: { code?: string } } | undefined)?.cause?.code;
  return typeof code === "string" && HOST_IS_GONE.has(code);
}

/**
 * Reduces an HTML page to the text a reader would see, so the hash tracks the
 * document rather than the response.
 *
 * Hashing the raw body flagged NABARD as "changed" on two runs seconds apart:
 * it is an ASP.NET page whose __VIEWSTATE, __EVENTVALIDATION and analytics
 * nonces differ on every request. A change detector that cries wolf daily is
 * worse than none — it trains whoever is on the rota to ignore it.
 */
export function normalizeHtml(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    // ASP.NET postback state and any hidden token field.
    .replace(/<input\b[^>]*type=["']?hidden["']?[^>]*>/gi, " ")
    .replace(/\bnonce=["'][^"']*["']/gi, " ")
    // Remaining markup, then whitespace, so reflow alone is not a change.
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;|&#\d+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function fingerprintsMatch(a: Fingerprint | undefined, b: Fingerprint): boolean {
  if (!a) return false;
  // ETag is the strongest signal; fall back through the weaker ones so a
  // source that drops a header does not read as a change.
  if (a.etag && b.etag) return a.etag === b.etag;
  if (a.bodySha256 && b.bodySha256) return a.bodySha256 === b.bodySha256;
  if (a.lastModified && b.lastModified) return a.lastModified === b.lastModified;
  if (a.contentLength && b.contentLength) return a.contentLength === b.contentLength;
  return false;
}

async function fingerprint(source: WatchedSource): Promise<Fingerprint> {
  const now = new Date().toISOString();

  if (source.strategy === "headers") {
    // HEAD only: the PMFBY guidelines are 1.7MB, and downloading them daily to
    // learn nothing changed would be the whole cost of this job.
    const res = await fetch(source.url, { method: "HEAD", redirect: "follow" });
    if (!res.ok) throw new Error(`HEAD ${res.status}`);
    return {
      etag: res.headers.get("etag") ?? undefined,
      lastModified: res.headers.get("last-modified") ?? undefined,
      contentLength: res.headers.get("content-length") ?? undefined,
      checkedAt: now,
    };
  }

  const res = await fetch(source.url, { redirect: "follow" });
  if (!res.ok) throw new Error(`GET ${res.status}`);
  const normalized = normalizeHtml(await res.text());
  return {
    bodySha256: createHash("sha256").update(normalized).digest("hex"),
    contentLength: String(normalized.length),
    checkedAt: now,
  };
}

/**
 * Asks whether the scheme is still taking applications.
 *
 * The brochure page is the weakest evidence a scheme is alive. Nobody takes a
 * scheme page down — it costs a department nothing to leave it up, and the
 * page carries no date, so it reads as current forever. The intake form is
 * different: it is wired to a database and a financial year, and when the
 * scheme closes it starts refusing. A live page over a dead portal is the
 * precise shape of the failure this system is accused of, and it is the one
 * signal that catches it.
 *
 * Only clear evidence counts. A timeout is a network problem far more often
 * than it is a withdrawn scheme, and downgrading half the corpus every time a
 * government host is briefly slow would train everyone to ignore the flag.
 */
async function probePortal(url: string): Promise<{ status: PortalStatus; url: string; detail: string }> {
  try {
    const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(15_000) });

    if (res.status === 404 || res.status === 410) {
      return { status: "dead", url, detail: `Application page returns ${res.status}.` };
    }
    if (!res.ok) {
      return { status: "unknown", url, detail: `Application page returned ${res.status}.` };
    }

    // Departments close a scheme by leaving the page up and putting a line of
    // text on it far more often than by removing the route.
    const body = normalizeHtml(await res.text()).toLowerCase();
    const closed = [
      "registration is closed",
      "registration closed",
      "applications are closed",
      "application closed",
      "scheme has been closed",
      "scheme is closed",
      "no longer accepting",
      "last date is over",
      "enrolment is closed",
      "enrollment is closed",
      "discontinued",
      "subsumed",
    ].find((phrase) => body.includes(phrase));

    if (closed) {
      return { status: "dead", url, detail: `Application page says "${closed}".` };
    }
    return { status: "accepting", url, detail: "Application page is reachable and not marked closed." };
  } catch (err) {
    if (hostIsGone(err)) {
      return { status: "dead", url, detail: "The application host no longer exists." };
    }
    return {
      status: "unknown",
      url,
      detail: `Could not reach the application page: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}


const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

/**
 * Every date this page states, as ISO days.
 *
 * Government pages write dates a dozen ways in the same paragraph — "20th June
 * 2026", "20-06-2026", "20/06/2026". Parsing only one form means reading a
 * page that says money moved last week and concluding the scheme is dead,
 * which is the most damaging mistake this probe could make.
 */
function datesIn(text: string): string[] {
  const out: string[] = [];

  // "20th June 2026" / "20 June 2026"
  const long = /\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})\b/g;
  for (const m of text.matchAll(long)) {
    const month = MONTHS.findIndex((name) => name.startsWith(m[2].toLowerCase().slice(0, 3)));
    if (month >= 0) {
      out.push(`${m[3]}-${String(month + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}`);
    }
  }

  // "20-06-2026" / "20/06/2026" — day first, which is the Indian convention
  // these pages use.
  const numeric = /\b(\d{1,2})[-/](\d{1,2})[-/](\d{4})\b/g;
  for (const m of text.matchAll(numeric)) {
    const day = Number(m[1]);
    const month = Number(m[2]);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      out.push(`${m[3]}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
    }
  }

  return out;
}

/**
 * Asks the hardest question available: is money still moving?
 *
 * This is the strongest signal in the system and the one a department cannot
 * fake by inattention. A scheme page stays online for years after the scheme
 * ends — nobody is paid to take it down, and it carries no date, so it reads
 * as current forever. A payment run is different. It costs money, it needs a
 * sanctioned budget line, and it does not happen out of habit. When the
 * published record shows nothing paid for longer than the scheme's own
 * disbursement cycle, the scheme has stopped, whatever the brochure says.
 *
 * PM-KISAN publishes both the installment date and period-wise beneficiary
 * counts in the static HTML of its home page, which is what makes this
 * checkable without a headless browser. Where a department renders its
 * dashboard in JavaScript the probe honestly reports `unknown` rather than
 * guessing — a fabricated all-clear would be worse than no probe at all.
 */
async function probeActivity(
  url: string,
  dormantAfterDays: number
): Promise<{ status: ActivityStatus; url: string; lastPaidOn?: string; detail: string }> {
  try {
    const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(20_000) });
    if (!res.ok) {
      return { status: "unknown", url, detail: `Payment record page returned ${res.status}.` };
    }

    const text = normalizeHtml(await res.text());

    // Only dates in a sentence about money. A scheme page is full of dates —
    // guideline revisions, eligibility cut-offs, copyright years — and taking
    // the newest date anywhere on the page would report a scheme as paying
    // because its footer says 2026.
    const paymentContext = /[^.]{0,200}(?:instal?ment|released|disburs|benefited|payment|transferred)[^.]{0,200}/gi;
    const dates = [...text.matchAll(paymentContext)].flatMap((m) => datesIn(m[0]));

    if (dates.length === 0) {
      return {
        status: "unknown",
        url,
        detail: "No payment date found in the page text; the figures are probably rendered by script.",
      };
    }

    const lastPaidOn = dates.sort().at(-1)!;
    const ageDays = Math.floor((Date.now() - new Date(lastPaidOn).getTime()) / 86_400_000);

    if (ageDays > dormantAfterDays) {
      return {
        status: "dormant",
        url,
        lastPaidOn,
        detail: `Last recorded payment was ${lastPaidOn} — ${ageDays} days ago, past this scheme's ${dormantAfterDays}-day cycle.`,
      };
    }
    return {
      status: "paying",
      url,
      lastPaidOn,
      detail: `Last recorded payment ${lastPaidOn} (${ageDays} days ago).`,
    };
  } catch (err) {
    return {
      status: "unknown",
      url,
      detail: `Could not reach the payment record: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Checks every watched source against the stored fingerprints.
 *
 * Returns results rather than writing anything: the caller decides whether to
 * persist the new fingerprints, and a change is reported for review, never
 * applied.
 */
export async function checkSources(
  previous: Record<string, Fingerprint>
): Promise<CheckResult[]> {
  return Promise.all(
    WATCHED_SOURCES.map(async (source): Promise<CheckResult> => {
      const base = {
        id: source.id,
        title: source.title,
        url: source.url,
        affects: source.affects,
      };

      if (source.strategy === "blocked") {
        return {
          ...base,
          status: "blocked",
          detail: source.note ?? "Refuses automated requests; check by hand.",
        };
      }

      // Both probes run regardless of what the document did: a scheme can stop
      // paying, or close its intake, without a single byte of its guidelines
      // PDF changing. That is the exact failure the document check cannot see.
      const [portal, activity] = await Promise.all([
        source.applyUrl ? probePortal(source.applyUrl) : undefined,
        source.activityUrl
          ? probeActivity(source.activityUrl, source.dormantAfterDays ?? 365)
          : undefined,
      ]);

      try {
        const current = await fingerprint(source);
        const prior = previous[source.id];

        if (!prior) {
          return { ...base, status: "unknown", detail: "First check — baseline recorded.", fingerprint: current, portal, activity };
        }
        if (fingerprintsMatch(prior, current)) {
          return { ...base, status: "unchanged", detail: `Unchanged since ${prior.checkedAt.slice(0, 10)}.`, fingerprint: current, portal, activity };
        }
        return {
          ...base,
          status: "changed",
          detail:
            `Document changed. Previously ${prior.etag ?? prior.bodySha256?.slice(0, 12) ?? prior.lastModified}, ` +
            `now ${current.etag ?? current.bodySha256?.slice(0, 12) ?? current.lastModified}. ` +
            `Review the diff before re-indexing.`,
          fingerprint: current,
          portal,
          activity,
        };
      } catch (err) {
        const gone = hostIsGone(err);
        return {
          ...base,
          status: "error",
          detail: gone
            ? `The host no longer exists (${(err as { cause?: { code?: string } }).cause?.code}). ` +
              `This URL cannot be cited as a source until someone finds where the document moved.`
            : err instanceof Error
              ? err.message
              : String(err),
          unreachable: gone,
          portal,
          activity,
        };
      }
    })
  );
}

/**
 * Turns a check run into the standing doubts the answer path reads.
 *
 * This is the join between the two halves of the system. Everything above
 * notices things; `alertsFrom` is what makes noticing have a consequence, by
 * naming the sources whose passages must now be served with a warning. No
 * approval sits between the two — the flag goes up on the strength of the
 * observation alone, and comes down only when a person re-verifies the
 * passages and re-runs the check with --save.
 *
 * A source that merely errored raises nothing. Government hosts time out
 * regularly, and a flag that appears every time one is slow is a flag that
 * gets ignored by the third week. A source whose host has been deleted is not
 * the same thing and does raise one — see HOST_IS_GONE.
 */
export function alertsFrom(results: CheckResult[], detectedOn = new Date()): SourceAlert[] {
  const day = detectedOn.toISOString().slice(0, 10);
  const alerts: SourceAlert[] = [];

  for (const r of results) {
    if (r.status === "changed") {
      alerts.push({
        sourceId: r.id,
        kind: "source-changed",
        detectedOn: day,
        detail: r.detail,
      });
    }
    if (r.portal?.status === "dead") {
      alerts.push({
        sourceId: r.id,
        kind: "portal-dead",
        detectedOn: day,
        detail: r.portal.detail,
      });
    }
    if (r.unreachable) {
      alerts.push({
        sourceId: r.id,
        kind: "source-unreachable",
        detectedOn: day,
        detail: r.detail,
      });
    }
    if (r.activity?.status === "dormant") {
      alerts.push({
        sourceId: r.id,
        kind: "scheme-dormant",
        // The date the money stopped, not the date we noticed — that is the
        // date the member needs in order to judge it.
        detectedOn: r.activity.lastPaidOn ?? day,
        detail: r.activity.detail,
      });
    }
  }

  return alerts;
}
