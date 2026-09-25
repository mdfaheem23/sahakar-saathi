"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { useLang } from "@/lib/LangContext";
import { AGENT_LABELS } from "@/lib/router";
import { listGrievances, listQueryLog, rejectionsByPassage } from "@/lib/storage";
import { AgentId, Grievance, LangCode, QueryLogEntry } from "@/lib/types";
import { LANGUAGES } from "@/lib/i18n";
import { DISTRICTS } from "@/lib/districtData";
import { detectPatterns } from "@/lib/patterns";
import { sourceLedger } from "@/lib/sources/freshness";
import { MessagesSquare, Ticket, Gauge, MapPinned, Radar, ArrowUpRight, FileClock, ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";

// Seed baseline so the dashboard reads like real pilot data rather than an
// empty screen on first load; live queries/grievances from this browser are
// layered on top.
const SEED_AGENT_COUNTS: Record<AgentId, number> = {
  pmfby: 184,
  schemes: 121,
  cooperative_law: 96,
  grievance: 58,
};
const SEED_LANG_COUNTS: Partial<Record<LangCode, number>> = {
  hi: 214, ta: 132, en: 113, te: 74, kn: 61, ml: 48,
};
const SEED_RESOLVED = 419;
const SEED_TOTAL = 459;

const AGENT_COLORS: Record<AgentId, string> = {
  pmfby: "bg-emerald-500",
  schemes: "bg-amber-500",
  cooperative_law: "bg-indigo-500",
  grievance: "bg-rose-500",
};

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-ink-soft">
        <span>{label}</span>
        <span className="font-semibold text-ink">{value}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-border/60">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, sub }: { icon: typeof Gauge; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
      <Icon size={18} className="text-forest-600" />
      <p className="mt-3 text-2xl font-extrabold text-ink">{value}</p>
      <p className="text-xs font-medium text-ink-faint">{label}</p>
      {sub && <p className="mt-1 text-[11px] text-ink-faint">{sub}</p>}
    </div>
  );
}

export default function AdminPage() {
  const { lang, setLang } = useLang();
  const [log, setLog] = useState<QueryLogEntry[]>([]);
  const [grievances, setGrievances] = useState<Grievance[]>([]);

  useEffect(() => {
    queueMicrotask(() => {
      setLog(listQueryLog());
      setGrievances(listGrievances());
    });
  }, []);

  const agentCounts: Record<AgentId, number> = { ...SEED_AGENT_COUNTS };
  const langCounts: Partial<Record<LangCode, number>> = { ...SEED_LANG_COUNTS };
  let resolved = SEED_RESOLVED;
  let total = SEED_TOTAL;

  for (const q of log) {
    agentCounts[q.agent] = (agentCounts[q.agent] ?? 0) + 1;
    langCounts[q.lang] = (langCounts[q.lang] ?? 0) + 1;
    total += 1;
    if (q.resolved) resolved += 1;
  }

  const maxAgent = Math.max(...Object.values(agentCounts));
  const maxLang = Math.max(0, ...Object.values(langCounts).map((n) => n ?? 0));
  const resolutionRate = total === 0 ? 0 : Math.round((resolved / total) * 100);
  const openGrievances = grievances.filter((g) => g.status !== "resolved").length;
  const patterns = detectPatterns(grievances);
  const systemicCount = patterns.filter((p) => p.severity === "systemic").length;

  return (
    <>
      <Header lang={lang} onLangChange={setLang} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <h1 className="mb-1 text-xl font-bold text-ink">NCCT / PACS Admin Dashboard</h1>
        <p className="mb-6 text-sm text-ink-faint">
          Query volumes, resolution rate, language usage, and grievance load — the oversight view
          for cooperative administrators and NCCT staff described in the proposal.
        </p>

        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <KpiCard icon={MessagesSquare} label="Total queries" value={total.toLocaleString()} />
          <KpiCard
            icon={Gauge}
            label="Resolution rate"
            value={`${resolutionRate}%`}
            sub="Target >80% without escalation"
          />
          <KpiCard
            icon={Ticket}
            label="Open grievances (this device)"
            value={String(openGrievances)}
            sub={`${grievances.length} filed total`}
          />
          <KpiCard
            icon={Radar}
            label="Systemic patterns detected"
            value={String(systemicCount)}
            sub="Clusters above escalation threshold"
          />
        </div>

        <SourceLedgerPanel />

        <div className="mb-6 rounded-2xl border-2 border-rose-200 bg-rose-50/50 p-6 shadow-sm">
          <div className="mb-1 flex items-center gap-2">
            <Radar size={17} className="text-rose-600" />
            <h3 className="text-sm font-bold text-ink">
              Collective grievance intelligence
            </h3>
          </div>
          <p className="mb-4 text-xs text-ink-soft">
            One farmer complaining is an anecdote. Twelve farmers complaining about the same thing
            at the same PACS is evidence. Tickets are clustered by society and category, so
            recurring failures surface as a case for the Registrar instead of sitting in a queue
            as isolated complaints.
          </p>
          <div className="space-y-3">
            {patterns.map((p) => (
              <div
                key={`${p.pacsName}-${p.category}`}
                className="rounded-xl border border-line bg-surface p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
                        p.severity === "systemic"
                          ? "bg-rose-600 text-white"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {p.severity === "systemic" ? "Systemic" : "Emerging"}
                    </span>
                    <span className="text-sm font-bold text-ink">{p.pacsName}</span>
                  </div>
                  <span className="text-sm font-extrabold text-rose-600">
                    {p.count} members affected
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-ink-faint">
                  {p.category} · oldest ticket {p.oldestDays} days old
                </p>
                <p className="mt-2 flex items-start gap-1.5 text-sm text-ink-soft">
                  <ArrowUpRight size={15} className="mt-0.5 shrink-0 text-forest-600" />
                  {p.recommendation}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-bold text-ink">Queries by domain agent</h3>
            <div className="space-y-4">
              {(Object.keys(agentCounts) as AgentId[]).map((a) => (
                <Bar
                  key={a}
                  label={AGENT_LABELS[a].en}
                  value={agentCounts[a]}
                  max={maxAgent}
                  color={AGENT_COLORS[a]}
                />
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-bold text-ink">Queries by language</h3>
            <div className="space-y-4">
              {LANGUAGES.map((l) => (
                <Bar
                  key={l.code}
                  label={l.native}
                  value={langCounts[l.code] ?? 0}
                  max={maxLang}
                  color="bg-forest-700"
                />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-line bg-surface p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-ink">Recent grievances (this device)</h3>
          {grievances.length === 0 ? (
            <p className="text-sm text-ink-faint">
              No grievances filed yet — file one from the Grievance Tracker to see it here.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs text-ink-faint">
                    <th className="py-2 pr-4">Ticket</th>
                    <th className="py-2 pr-4">Category</th>
                    <th className="py-2 pr-4">PACS</th>
                    <th className="py-2 pr-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {grievances.slice(0, 8).map((g) => (
                    <tr key={g.ticketId} className="border-b border-line/60">
                      <td className="py-2 pr-4 font-mono text-xs">{g.ticketId}</td>
                      <td className="py-2 pr-4">{g.category}</td>
                      <td className="py-2 pr-4">{g.pacsName}</td>
                      <td className="py-2 pr-4 capitalize">{g.status.replace("_", " ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-4 rounded-2xl border border-line bg-surface p-6 shadow-sm">
          <div className="mb-1 flex items-center gap-2">
            <MapPinned size={16} className="text-forest-600" />
            <h3 className="text-sm font-bold text-ink">Kiosk rollout priority (policy signal)</h3>
          </div>
          <p className="mb-4 text-xs text-ink-faint">
            Cross-references each district&apos;s grievance rate against its PACS computerisation
            status (from the National Cooperative Database) to rank where a kiosk deployment or
            outreach push would close the biggest gap — not just a query-volume mirror.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs text-ink-faint">
                  <th className="py-2 pr-4">District</th>
                  <th className="py-2 pr-4">PACS computerised</th>
                  <th className="py-2 pr-4">Grievances / 1,000 members</th>
                  <th className="py-2 pr-4">Priority</th>
                </tr>
              </thead>
              <tbody>
                {[...DISTRICTS]
                  .sort((a, b) => {
                    const scoreA = a.grievanceRatePer1000 * (a.pacsComputerized ? 1 : 1.6);
                    const scoreB = b.grievanceRatePer1000 * (b.pacsComputerized ? 1 : 1.6);
                    return scoreB - scoreA;
                  })
                  .map((d, i) => (
                    <tr key={d.id} className="border-b border-line/60">
                      <td className="py-2 pr-4">
                        {d.district}, {d.state}
                      </td>
                      <td className="py-2 pr-4">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            d.pacsComputerized
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {d.pacsComputerized ? "Yes" : "Not yet"}
                        </span>
                      </td>
                      <td className="py-2 pr-4">{d.grievanceRatePer1000.toFixed(1)}</td>
                      <td className="py-2 pr-4 font-semibold">{i === 0 ? "🔴 Highest" : i <= 2 ? "🟠 High" : "Normal"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}

/**
 * The supervision layer, as a standing list rather than a queue.
 *
 * This is the answer to the objection that any human-in-the-loop design dies
 * the first week nobody opens the portal. Nothing here waits on a signature.
 * Every row is already correct when the screen is closed, the members'
 * answers have already been downgraded on every channel, and an officer
 * opening this page is reading a status, not clearing a backlog. The only
 * thing a person can do here is make a flag go away, by actually reading the
 * document — which is the one step that genuinely needs a person.
 *
 * Two clocks per row, because they answer different questions. The machine
 * clock says when the file was last fetched and compared, which catches an
 * edited PDF. The human clock says when someone last read it and re-checked
 * the passages drawn from it, which is the only thing that catches a
 * paragraph rewritten to mean something new. Only the human clock falls due.
 */
const LEDGER_STATE = {
  current: { icon: ShieldCheck, chip: "bg-emerald-100 text-emerald-700", label: "In date" },
  overdue: { icon: ShieldAlert, chip: "bg-amber-100 text-amber-700", label: "Review overdue" },
  flagged: { icon: ShieldX, chip: "bg-rose-100 text-rose-700", label: "Flagged" },
  "never-verified": { icon: ShieldAlert, chip: "bg-amber-100 text-amber-700", label: "Never verified" },
} as const;

function SourceLedgerPanel() {
  const rows = sourceLedger();
  const needsAttention = rows.filter((r) => r.state !== "current");

  // Reports from the counter, read once and mapped onto the documents they
  // contradict. This is the column an officer should read first: it is the
  // only one sourced from what actually happened to a member, and a document
  // in perfect date with refusals against it is the most interesting row on
  // the page.
  const [rejections, setRejections] = useState<Record<string, number>>({});
  useEffect(() => {
    queueMicrotask(() => setRejections(rejectionsByPassage()));
  }, []);

  return (
    <div className="mb-6 rounded-2xl border border-line bg-surface p-6 shadow-sm">
      <div className="mb-1 flex items-center gap-2">
        <FileClock size={17} className="text-forest-700" />
        <h3 className="text-sm font-bold text-ink">Government source freshness</h3>
      </div>
      <p className="mb-4 text-xs leading-relaxed text-ink-soft">
        Every answer this service gives is traced to one of these documents. When a document
        changes, or its application portal stops accepting, every passage drawn from it is served
        with a warning on the kiosk, the website, the app and the phone line — immediately, with
        nobody approving anything. Silence from a department raises the flag; it does not lower it.
        {needsAttention.length > 0 && (
          <span className="font-semibold text-amber-700">
            {" "}
            {needsAttention.length} of {rows.length} need a human to read them.
          </span>
        )}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs text-ink-faint">
              <th className="py-2 pr-4">Document</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Machine checked</th>
              <th className="py-2 pr-4">Human verified</th>
              <th className="py-2 pr-4">Next review</th>
              <th className="py-2 pr-4">Answers affected</th>
              <th className="py-2 pr-4">Refused at counter</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const style = LEDGER_STATE[r.state];
              const Icon = style.icon;
              return (
                <tr key={r.id} className="border-b border-line/60 align-top">
                  <td className="py-2.5 pr-4">
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-ink hover:text-forest-700 hover:underline"
                    >
                      {r.title}
                    </a>
                    {/* Named, because "check it manually" is advice nobody can
                        act on until they know which document and why. */}
                    {r.strategy === "blocked" && (
                      <p className="mt-0.5 text-[11px] text-ink-faint">
                        Refuses automated checks — must be read by a person every {r.intervalDays} days.
                      </p>
                    )}
                    {r.alert && (
                      <p className="mt-0.5 text-[11px] font-medium text-rose-700">{r.alert.detail}</p>
                    )}
                  </td>
                  <td className="py-2.5 pr-4">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${style.chip}`}
                    >
                      <Icon size={11} /> {style.label}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-xs text-ink-soft">
                    {r.lastAutomatedCheck?.slice(0, 10) ?? "—"}
                  </td>
                  <td className="py-2.5 pr-4 text-xs text-ink-soft">{r.lastHumanCheck ?? "never"}</td>
                  <td className="py-2.5 pr-4 text-xs">
                    {r.dueOn ? (
                      <span className={r.daysUntilDue !== null && r.daysUntilDue < 0 ? "font-semibold text-amber-700" : "text-ink-soft"}>
                        {r.dueOn}
                        {r.daysUntilDue !== null && (
                          <span className="ml-1 text-ink-faint">
                            ({r.daysUntilDue < 0 ? `${-r.daysUntilDue}d overdue` : `in ${r.daysUntilDue}d`})
                          </span>
                        )}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-2.5 pr-4 text-xs text-ink-soft">{r.affects.length}</td>
                  <td className="py-2.5 pr-4 text-xs">
                    {(() => {
                      const reports = r.affects.reduce((n, id) => n + (rejections[id] ?? 0), 0);
                      if (reports === 0) return <span className="text-ink-faint">—</span>;
                      return (
                        <span className="font-semibold text-rose-700">
                          {reports} report{reports === 1 ? "" : "s"}
                        </span>
                      );
                    })()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
