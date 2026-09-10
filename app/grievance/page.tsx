"use client";

import { useState } from "react";
import Header from "@/components/Header";
import { useLang } from "@/lib/LangContext";
import { t } from "@/lib/i18n";
import { findGrievance, genTicketId, saveGrievance } from "@/lib/storage";
import { Grievance, GrievanceStatus } from "@/lib/types";
import { CheckCircle2, Clock, AlertCircle } from "lucide-react";

const CATEGORIES = ["Loan", "PMFBY Claim", "By-law Dispute", "PACS Service", "Other"];

const STATUS_META: Record<GrievanceStatus, { icon: typeof Clock; color: string }> = {
  open: { icon: AlertCircle, color: "text-amber-600 bg-amber-50 border-amber-200" },
  in_progress: { icon: Clock, color: "text-blue-600 bg-blue-50 border-blue-200" },
  resolved: { icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
};

const STATUS_LABEL_KEY: Record<GrievanceStatus, "status_open" | "status_in_progress" | "status_resolved"> = {
  open: "status_open",
  in_progress: "status_in_progress",
  resolved: "status_resolved",
};

// Demo tickets get a randomised status so the tracker has something to show
// beyond "just filed" — deterministic per ticket ID.
function demoStatus(ticketId: string): GrievanceStatus {
  let hash = 0;
  for (const c of ticketId) hash = (hash * 31 + c.charCodeAt(0)) % 997;
  if (hash % 3 === 0) return "resolved";
  if (hash % 3 === 1) return "in_progress";
  return "open";
}

export default function GrievancePage() {
  const { lang, setLang } = useLang();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    pacsName: "",
    category: CATEGORIES[0],
    description: "",
  });
  const [createdTicket, setCreatedTicket] = useState<Grievance | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Grievance[] | null>(null);
  const [now, setNow] = useState(0);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.description.trim()) return;

    const now = Date.now();
    const ticket: Grievance = {
      ticketId: genTicketId(),
      name: form.name.trim(),
      phone: form.phone.trim(),
      pacsName: form.pacsName.trim() || "—",
      category: form.category,
      description: form.description.trim(),
      status: "open",
      lang,
      channel: "web",
      createdAt: now,
      updatedAt: now,
    };
    saveGrievance(ticket);
    setCreatedTicket(ticket);
    setForm({ name: "", phone: "", pacsName: "", category: CATEGORIES[0], description: "" });
  }

  function handleSearch() {
    const found = findGrievance(query).map((g) => ({
      ...g,
      status: g.status === "open" ? demoStatus(g.ticketId) : g.status,
    }));
    setNow(Date.now());
    setResults(found);
  }

  return (
    <>
      <Header lang={lang} onLangChange={setLang} />
      <main className="mx-auto grid w-full max-w-4xl flex-1 gap-6 px-4 py-8 md:grid-cols-2">
        <section className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-ink">{t("fileGrievance", lang)}</h2>

          {createdTicket ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
              <p className="font-semibold text-emerald-800">{t("ticketCreated", lang)}</p>
              <p className="mt-1 text-lg font-mono font-bold text-emerald-900">
                {createdTicket.ticketId}
              </p>
              <p className="mt-2 text-emerald-700">
                Save this ID to check status anytime, or search by your phone number.
              </p>
              <button
                onClick={() => setCreatedTicket(null)}
                className="mt-3 text-xs font-semibold text-emerald-800 underline"
              >
                File another
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <Field label={t("fullName", lang)}>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-forest-600"
                />
              </Field>
              <Field label={t("phoneNumber", lang)}>
                <input
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-forest-600"
                />
              </Field>
              <Field label={t("pacsName", lang)}>
                <input
                  value={form.pacsName}
                  onChange={(e) => setForm({ ...form, pacsName: e.target.value })}
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-forest-600"
                />
              </Field>
              <Field label={t("category", lang)}>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-forest-600"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t("description", lang)}>
                <textarea
                  required
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-forest-600"
                />
              </Field>
              <button
                type="submit"
                className="w-full rounded-lg bg-forest-700 py-2.5 text-sm font-semibold text-white hover:bg-forest-800"
              >
                {t("submit", lang)}
              </button>
            </form>
          )}
        </section>

        <section className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-ink">{t("checkStatus", lang)}</h2>
          <div className="mb-4 flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder={t("enterTicketId", lang)}
              className="flex-1 rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-forest-600"
            />
            <button
              onClick={handleSearch}
              className="rounded-lg bg-forest-800 px-4 py-2 text-sm font-semibold text-white"
            >
              →
            </button>
          </div>

          {results && results.length === 0 && (
            <p className="text-sm text-ink-faint">No matching ticket found.</p>
          )}

          {results === null && (
            <p className="text-sm text-ink-faint">{t("noTicketsYet", lang)}</p>
          )}

          <div className="space-y-3">
            {results?.map((g) => {
              const meta = STATUS_META[g.status];
              const daysOpen = Math.floor((now - g.createdAt) / 86400000);
              return (
                <div key={g.ticketId} className="rounded-xl border border-line p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold">{g.ticketId}</span>
                    <span
                      className={`flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.color}`}
                    >
                      <meta.icon size={12} />
                      {t(STATUS_LABEL_KEY[g.status], lang)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-ink-soft">{g.description}</p>
                  <p className="mt-2 text-xs text-ink-faint">
                    {g.category} · {g.pacsName} · {daysOpen === 0 ? "today" : `${daysOpen}d ago`}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-ink-soft">{label}</span>
      {children}
    </label>
  );
}
