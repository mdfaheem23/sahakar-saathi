"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import HeroScene from "@/components/HeroScene";
import Reveal from "@/components/Reveal";
import { useSmoothScroll } from "@/lib/motion";
import { useLang } from "@/lib/LangContext";
import {
  MessageCircle,
  Monitor,
  ClipboardList,
  LayoutDashboard,
  BellRing,
  Mic,
  ShieldCheck,
  Wifi,
  Check,
  X,
  Sparkles,
  ShieldAlert,
  Radar,
  ArrowRight,
} from "lucide-react";

const PRIMARY = [
  {
    href: "/entitlements",
    icon: Sparkles,
    eyebrow: "Novelty 01",
    title: "What am I missing out on?",
    desc: "Five questions any farmer can answer — land size, tenancy, credit card, insurance, gender — return the exact schemes they are legally entitled to and are not claiming, with a rupee figure attached.",
    tone: "forest",
  },
  {
    href: "/verify",
    icon: ShieldAlert,
    eyebrow: "Novelty 02",
    title: "Is this true?",
    desc: "A farmer repeats what a middleman told them. The assistant rules TRUE or FALSE against the source clause — before any money changes hands.",
    tone: "clay",
  },
];

const SECONDARY = [
  {
    href: "/alerts",
    icon: BellRing,
    title: "Risk & Deadline Alerts",
    desc: "Peril advisories and enrollment countdowns, pushed before the member asks.",
  },
  {
    href: "/admin",
    icon: LayoutDashboard,
    title: "NCCT Admin",
    desc: "Collective grievance intelligence and kiosk rollout priority.",
  },
  {
    href: "/chat",
    icon: MessageCircle,
    title: "Ask (App / Web)",
    desc: "Voice or text, grounded answers with citations.",
  },
  {
    href: "/kiosk",
    icon: Monitor,
    title: "PACS Kiosk",
    desc: "Offline-capable touchscreen for members with no smartphone.",
  },
  {
    href: "/grievance",
    icon: ClipboardList,
    title: "Grievance Tracker",
    desc: "File a structured grievance, track it by ticket or phone.",
  },
];

const FEATURES = [
  { icon: Mic, text: "Voice-first in English, Hindi & Tamil on live Sarvam ASR/TTS" },
  { icon: ShieldCheck, text: "Grounded-only — cites its source, escalates rather than guesses" },
  { icon: Wifi, text: "Kiosk/IVR path for members with no smartphone or data" },
];

const COMPARISON = [
  { row: "Multilingual AI chatbot", ncd: true, note: "Table stakes — NCD 3.0 already ships this via Bhashini." },
  { row: "Cooperative database lookups", ncd: true, note: "Both answer what/who/where about cooperatives." },
  {
    row: "Tells you what you never thought to ask for",
    ncd: false,
    note: "Requires inverting the interaction. A chatbot structurally cannot do this.",
  },
  {
    row: "Fact-checks what a middleman told you",
    ncd: false,
    note: "The rural failure is paid misinformation, not missing information.",
  },
  {
    row: "Clusters grievances into systemic evidence",
    ncd: false,
    note: "One complaint is an anecdote; twelve at one PACS is a case for the Registrar.",
  },
  {
    row: "Proactive deadline & peril push",
    ncd: false,
    note: "NCD is pull-only — the member has to think to ask.",
  },
  {
    row: "Offline kiosk / IVR reach",
    ncd: false,
    note: "NCD is web and app only — no path without a smartphone.",
  },
];

export default function Home() {
  const { lang, setLang } = useLang();
  useSmoothScroll();

  return (
    <>
      <Header lang={lang} onLangChange={setLang} />

      <main className="flex-1">
        <Hero />

        {/* One member, two channels — the scene hands over from phone to
            desktop as it scrolls, and either device opens its own interface. */}
        <HeroScene />

        {/* ---------------- The two novelties ---------------- */}
        <section className="mx-auto max-w-6xl px-5 py-16">
          <RevealLabel>The two things worth your attention</RevealLabel>

          <Reveal stagger={0.12} className="mt-6 grid gap-5 lg:grid-cols-2">
            {PRIMARY.map((c) => (
              <Link
                key={c.href}
                href={c.href}
                className="card card-interactive group relative overflow-hidden p-7"
              >
                <div
                  className={`absolute -right-16 -top-16 h-44 w-44 rounded-full blur-2xl ${
                    c.tone === "forest" ? "bg-forest-500/10" : "bg-clay-500/10"
                  }`}
                  aria-hidden="true"
                />
                <div className="relative">
                  <span
                    className={`inline-flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-sm ${
                      c.tone === "forest" ? "bg-forest-700" : "bg-clay-600"
                    }`}
                  >
                    <c.icon size={21} />
                  </span>
                  <p
                    className={`mt-5 text-[11px] font-bold uppercase tracking-[0.16em] ${
                      c.tone === "forest" ? "text-forest-600" : "text-clay-600"
                    }`}
                  >
                    {c.eyebrow}
                  </p>
                  <h2 className="font-display mt-1.5 text-2xl font-bold text-ink">{c.title}</h2>
                  <p className="mt-2.5 text-sm leading-relaxed text-ink-soft">{c.desc}</p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-forest-700">
                    Try it
                    <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            ))}
          </Reveal>

          {/* Third novelty gets a wide band — it's an admin capability, not a
              farmer-facing screen, so it reads differently by design. */}
          <Link
            href="/admin"
            className="card card-interactive group mt-5 flex flex-wrap items-center gap-6 p-7"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-alert-600 text-white shadow-sm">
              <Radar size={21} />
            </span>
            <div className="min-w-[16rem] flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-alert-600">
                Novelty 03
              </p>
              <h2 className="font-display mt-1.5 text-2xl font-bold text-ink">
                Collective grievance intelligence
              </h2>
              <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-ink-soft">
                One farmer complaining is an anecdote. Twelve farmers complaining about the
                same thing at the same PACS is evidence with a named accountable officer.
                Tickets cluster by society and category so systemic failure reaches the
                Registrar instead of sitting in a queue.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-forest-700">
              Open dashboard
              <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        </section>

        {/* ---------------- Every channel ---------------- */}
        <section className="border-y border-line bg-paper-deep/60">
          <div className="mx-auto max-w-6xl px-5 py-16">
            <RevealLabel>Every channel a member might reach us on</RevealLabel>
            <Reveal stagger={0.09} className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {SECONDARY.map((c) => (
                <Link key={c.href} href={c.href} className="card card-interactive group p-5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-forest-050 text-forest-700">
                    <c.icon size={18} />
                  </span>
                  <h3 className="mt-4 text-[15px] font-bold text-ink">{c.title}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{c.desc}</p>
                </Link>
              ))}
            </Reveal>

            <div className="mt-8 grid gap-4 rounded-2xl border border-line bg-surface p-6 sm:grid-cols-3">
              {FEATURES.map((f, i) => (
                <div key={i} className="flex items-start gap-3">
                  <f.icon size={17} className="mt-0.5 shrink-0 text-forest-600" />
                  <p className="text-[13px] leading-relaxed text-ink-soft">{f.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------- Differentiation ---------------- */}
        <section className="mx-auto max-w-6xl px-5 py-16">
          <RevealLabel>How this differs from the Ministry&apos;s own NCD 3.0</RevealLabel>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
            The National Cooperative Database 3.0 already ships an AI chatbot with Bhashini
            multilingual support, village-level GIS mapping, and a public API across 8.5 lakh
            cooperatives. Repeating that would add nothing — so this table is the honest
            accounting of what is genuinely new here.
          </p>

          <div className="card mt-6 overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line bg-paper-deep/50">
                    <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-ink-faint">
                      Capability
                    </th>
                    <th className="w-24 px-3 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-ink-faint">
                      NCD 3.0
                    </th>
                    <th className="w-24 px-3 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-forest-700">
                      This build
                    </th>
                    <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-ink-faint">
                      Why it matters
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON.map((row) => (
                    <tr
                      key={row.row}
                      className={`border-b border-line/70 align-top last:border-0 ${
                        row.ncd ? "" : "bg-forest-050/40"
                      }`}
                    >
                      <td className="px-5 py-3.5 font-semibold text-ink">{row.row}</td>
                      <td className="px-3 py-3.5 text-center">
                        {row.ncd ? (
                          <Check size={17} className="mx-auto text-forest-600" />
                        ) : (
                          <X size={17} className="mx-auto text-ink-faint/50" />
                        )}
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        <Check size={17} className="mx-auto text-forest-600" />
                      </td>
                      <td className="px-5 py-3.5 text-[13px] leading-relaxed text-ink-soft">
                        {row.note}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="mt-6 rounded-xl border border-dashed border-line-strong bg-surface/60 p-5 text-[13px] leading-relaxed text-ink-soft">
            <strong className="font-semibold text-ink">Scope:</strong> speech is live on the
            Sarvam AI API. Knowledge answers are grounded in a curated corpus standing in for
            the full LangGraph RAG pipeline over the Cooperative Societies Act, PMFBY
            guidelines, and Ministry scheme documents. District risk and claim figures are
            modeled on the fields published by pmfby.gov.in and the National Cooperative
            Database, ready to point at their live APIs. Grievance and analytics data is
            stored locally in this browser for the demo.
          </p>
        </section>
      </main>

      <footer className="border-t border-line bg-forest-900 py-7 text-center">
        <p className="font-display text-sm font-semibold text-forest-100">PACS Sahayak</p>
        <p className="mt-1 text-xs text-forest-100/50">
          Mohammed Faheem K · VIT Vellore · Smart India Hackathon 2026
        </p>
      </footer>
    </>
  );
}

function RevealLabel({ children }: { children: React.ReactNode }) {
  return (
    <Reveal>
      <h2 className="font-display text-xl font-bold text-ink sm:text-2xl">{children}</h2>
    </Reveal>
  );
}
