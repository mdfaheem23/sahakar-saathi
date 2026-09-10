import { WATCHED_SOURCES } from "./registry";
import alertsFile from "./alerts.json";

/**
 * Standing doubts about a government source document.
 *
 * The daily source check produces these; retrieval consumes them. A source
 * that has changed, gone unreachable, or whose application portal has stopped
 * accepting submissions raises an alert, and every corpus passage that source
 * backs is downgraded on every channel until a human re-verifies the passage
 * and clears it.
 *
 * The direction of that flow is the whole point. Nobody approves anything for
 * an answer to keep being shown; someone has to act for a doubted answer to be
 * shown confidently again. If the department changes a PDF and no official
 * anywhere notices, the flag still goes up, and it stays up while everyone
 * involved does nothing. Silence degrades the claim instead of blocking the
 * service — which is the only design that survives contact with an office that
 * is short-staffed, or shut.
 */
export interface SourceAlert {
  sourceId: string;
  kind: "source-changed" | "source-unreachable" | "portal-dead" | "scheme-dormant";
  /** ISO date the condition was first observed. */
  detectedOn: string;
  detail: string;
}

interface AlertsFile {
  generatedAt: string;
  alerts: SourceAlert[];
}

/**
 * Passage id -> the watched source documents that back it.
 *
 * Inverted from `WATCHED_SOURCES[].affects`, which already records the mapping
 * a human made when they extracted the passage. No second list to drift.
 */
const SOURCES_BY_PASSAGE: Map<string, string[]> = (() => {
  const map = new Map<string, string[]>();
  for (const source of WATCHED_SOURCES) {
    for (const passageId of source.affects) {
      const existing = map.get(passageId);
      if (existing) existing.push(source.id);
      else map.set(passageId, [source.id]);
    }
  }
  return map;
})();

export function sourceIdsForPassage(passageId: string): string[] {
  return SOURCES_BY_PASSAGE.get(passageId) ?? [];
}

/**
 * Alerts observed by this running instance since it started.
 *
 * Held in module scope and refreshed on a timer by `live.ts`. This is the
 * layer that makes detection automatic in production. Without it the daily
 * cron could notice a changed PDF at 3am and still serve it as verified all
 * day, because a serverless function cannot write to the repository it was
 * built from — so the finding would sit in an HTTP response nobody read until
 * a person got to a laptop and set an environment variable. Detection that
 * does not reach the answer is not detection.
 */
let runtimeAlerts: SourceAlert[] = [];
let runtimeCheckedAt = 0;

export function setRuntimeAlerts(alerts: SourceAlert[], at = Date.now()) {
  runtimeAlerts = alerts;
  runtimeCheckedAt = at;
}

export function runtimeAlertsCheckedAt(): number {
  return runtimeCheckedAt;
}

/**
 * Alerts currently in force.
 *
 * Three layers, because they have different latencies and a national service
 * needs all three:
 *
 * - `alerts.json` is written by `npm run check:sources` and committed. It is
 *   the durable record and it works offline, which matters because a kiosk on
 *   a village lane spends part of its life disconnected.
 * - the runtime layer is what this instance has verified for itself since it
 *   started, so a document that changes between deployments is caught without
 *   anyone doing anything.
 * - `SOURCE_ALERTS` is a JSON array in the environment, applied on top. A
 *   department can be flagged in minutes without a redeploy — which is what
 *   you need at 9pm when a scheme is withdrawn and forty thousand kiosks are
 *   still answering questions about it.
 *
 * They are unioned, never intersected. Any layer can raise a doubt; no layer
 * can silence one raised by another.
 */
export function activeAlerts(): SourceAlert[] {
  const committed = [...((alertsFile as AlertsFile).alerts ?? []), ...runtimeAlerts];

  // Guarded because this module is imported by the kiosk bundle too, where
  // a server-only variable is not defined at all.
  const raw = typeof process !== "undefined" ? process.env.SOURCE_ALERTS : undefined;
  if (!raw?.trim()) return committed;

  let override: SourceAlert[];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("expected an array");
    override = parsed as SourceAlert[];
  } catch (err) {
    // A malformed override must not silently disable the committed alerts:
    // that would turn a typo into an amber flag disappearing from every
    // channel at once, which is the exact failure this system exists to stop.
    console.error("[alerts] SOURCE_ALERTS is not valid JSON, ignoring it:", err);
    return committed;
  }

  const byKey = new Map<string, SourceAlert>();
  for (const alert of [...committed, ...override]) {
    if (alert?.sourceId && alert.kind) byKey.set(`${alert.sourceId}::${alert.kind}`, alert);
  }
  return [...byKey.values()];
}

/** Alerts standing against the sources that back this passage. */
export function alertsForPassage(passageId: string, alerts = activeAlerts()): SourceAlert[] {
  const sourceIds = sourceIdsForPassage(passageId);
  if (sourceIds.length === 0) return [];
  return alerts.filter((a) => sourceIds.includes(a.sourceId));
}
