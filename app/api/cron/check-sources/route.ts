import { NextRequest } from "next/server";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { checkSources, alertsFrom, type Fingerprint } from "@/lib/sources/check";
import { activeAlerts } from "@/lib/sources/alerts";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Daily check of the government source documents behind the corpus.
 *
 * It reports; it never re-indexes. A changed PDF means a human reads the diff
 * and updates the passages, because the alternative is a draft or a mangled
 * parse reaching a farmer with a citation that makes it look verified. The
 * expensive, risky half of the pipeline stays deliberately manual — what is
 * automated is noticing, which is the part people actually fail at.
 *
 * What it does do without waiting for anyone is raise the flag. The moment a
 * document changes or an application portal starts refusing, every passage
 * that source backs is served with a warning on all four channels. Nobody
 * approves that and nobody can forget to do it; the only manual act left is
 * clearing it, which is the right way round.
 */

/**
 * Tells whoever is on the rota, and hands the operator the exact value to set.
 *
 * A serverless function cannot write to the repository it was built from, so
 * this route cannot persist what it finds — a fact worth stating plainly
 * rather than papering over, because the failure mode of pretending otherwise
 * is a check that appears to work and silently forgets every morning. The two
 * ways the finding survives are both here: a webhook to a human, and the
 * `SOURCE_ALERTS` value that puts the flag up across the fleet without a
 * redeploy.
 */
async function notify(webhook: string, text: string) {
  try {
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch (err) {
    console.error("[cron] source alert webhook failed:", err);
  }
}

export async function GET(req: NextRequest) {
  // Vercel Cron signs its invocations; anything else must present the secret.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const store = join(process.cwd(), "lib/sources/fingerprints.json");
  const previous: Record<string, Fingerprint> = existsSync(store)
    ? JSON.parse(readFileSync(store, "utf8"))
    : {};

  const results = await checkSources(previous);
  const changed = results.filter((r) => r.status === "changed");
  const deadPortals = results.filter((r) => r.portal?.status === "dead");
  const blocked = results.filter((r) => r.status === "blocked");
  const errored = results.filter((r) => r.status === "error");

  const found = alertsFrom(results);
  const standing = activeAlerts();
  // Only what is not already flagged. A daily webhook repeating a doubt
  // somebody already raised is how an alert channel gets muted.
  const fresh = found.filter(
    (a) => !standing.some((s) => s.sourceId === a.sourceId && s.kind === a.kind)
  );

  const webhook = process.env.SOURCE_ALERT_WEBHOOK;
  if (webhook && fresh.length) {
    const lines = fresh.map((a) => {
      const source = results.find((r) => r.id === a.sourceId);
      return `• ${source?.title ?? a.sourceId} — ${a.kind}: ${a.detail}\n  affects: ${source?.affects.join(", ") ?? "?"}\n  ${source?.url ?? ""}`;
    });
    await notify(
      webhook,
      `PACS Sahayak — ${fresh.length} government source(s) need review.\n\n${lines.join("\n\n")}\n\n` +
        `Answers built on these passages are already being served with a warning on every channel. ` +
        `To clear it: read the diff, update the passage and its verifiedOn date, then run ` +
        `\`npm run check:sources -- --save\` and \`npm run index:corpus\`.`
    );
  }

  return Response.json({
    checkedAt: new Date().toISOString(),
    summary: {
      total: results.length,
      changed: changed.length,
      deadPortals: deadPortals.length,
      manualCheckRequired: blocked.length,
      errored: errored.length,
      newAlerts: fresh.length,
    },
    // Named explicitly so an alert can say what to do rather than only that
    // something happened.
    actionRequired: [...changed, ...deadPortals].map((r) => ({
      title: r.title,
      url: r.url,
      reason: r.status === "changed" ? "document changed" : "application portal dead",
      detail: r.status === "changed" ? r.detail : r.portal?.detail,
      affectedPassages: r.affects,
      next: "Review the diff, update the passage and its verifiedOn date, then run `npm run index:corpus`.",
    })),
    /**
     * Paste this into the deployment's environment to raise the flag across
     * every kiosk, phone and telephone line immediately, without a redeploy
     * and without waiting for anyone to reach a laptop.
     */
    sourceAlertsEnv: found.length ? JSON.stringify(found) : null,
    results: results.map(({ id, title, status, detail, portal }) => ({
      id,
      title,
      status,
      detail,
      portal: portal?.status ?? null,
    })),
  });
}
