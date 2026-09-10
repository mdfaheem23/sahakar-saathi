/**
 * Checks whether any government source document has changed.
 *
 *   npm run check:sources          report only
 *   npm run check:sources -- --save  report and update the baseline
 *
 * Fingerprints live in lib/sources/fingerprints.json, committed to the repo so
 * a change shows up as a reviewable diff rather than as hidden state.
 */
import { config } from "dotenv";
config({ path: ".env", quiet: true });

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { checkSources, alertsFrom, type Fingerprint } from "@/lib/sources/check";

const STORE = "lib/sources/fingerprints.json";
const ALERTS = "lib/sources/alerts.json";
const save = process.argv.includes("--save");

async function main() {
  const previous: Record<string, Fingerprint> = existsSync(STORE)
    ? JSON.parse(readFileSync(STORE, "utf8"))
    : {};

  const results = await checkSources(previous);

  const icon = { unchanged: "  ok  ", changed: "CHANGED", unknown: " new  ", blocked: "blocked", error: " error" };
  for (const r of results) {
    console.log(`[${icon[r.status]}] ${r.title}`);
    console.log(`           ${r.detail}`);
    if (r.portal) {
      console.log(`           portal ${r.portal.status}: ${r.portal.detail}`);
    }
    if (r.status === "changed") {
      console.log(`           affects ${r.affects.length} passage(s): ${r.affects.join(", ")}`);
      console.log(`           ${r.url}`);
    }
    console.log();
  }

  const changed = results.filter((r) => r.status === "changed");
  const blocked = results.filter((r) => r.status === "blocked");
  const errored = results.filter((r) => r.status === "error");
  const deadPortals = results.filter((r) => r.portal?.status === "dead");
  const alerts = alertsFrom(results);

  console.log(
    `${results.length} sources checked — ${changed.length} changed, ${deadPortals.length} with a dead application portal, ` +
      `${blocked.length} need a manual check, ${errored.length} errored`
  );

  // Alerts are written on every run, not only with --save. They are what the
  // answer path reads to downgrade a passage, and they must go up the moment
  // the change is observed — waiting for someone to review a diff first is
  // the approval gate this design exists to avoid.
  writeFileSync(ALERTS, JSON.stringify({ generatedAt: new Date().toISOString(), alerts }, null, 2) + "\n");
  console.log(`${alerts.length} alert(s) written to ${ALERTS}`);

  if (save) {
    // The baseline moves only when a person says so, because moving it is the
    // act of accepting the new document as the one the passages were checked
    // against. Automating it would clear the flag without anyone having read
    // a word of what changed.
    const next: Record<string, Fingerprint> = { ...previous };
    for (const r of results) if (r.fingerprint) next[r.id] = r.fingerprint;
    writeFileSync(STORE, JSON.stringify(next, null, 2) + "\n");
    console.log(`baseline written to ${STORE}`);
    console.log("Update each affected passage and its verifiedOn date, then run `npm run index:corpus`.");
  } else if (changed.length) {
    console.log("\nRun with --save once you have reviewed the diff and updated the passages.");
  }

  // Non-zero exit so CI or a cron alert can act on it.
  process.exit(alerts.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(2);
});
