"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import DistrictSelector from "@/components/DistrictSelector";
import { useLang } from "@/lib/LangContext";
import { useDistrict } from "@/lib/DistrictContext";
import { getDistrict, daysUntil } from "@/lib/districtData";
import { buildOutreachMessage } from "@/lib/outreach";
import { useSpeech } from "@/lib/useSpeech";
import { LANGUAGES, t } from "@/lib/i18n";
import { AlertTriangle, CalendarClock, TrendingUp, Wallet, Clock3, PhoneCall, Volume2 } from "lucide-react";
import { LocalizedText } from "@/lib/types";

/**
 * The question this button asks on the member's behalf.
 *
 * A LocalizedText rather than a chain of `lang === "hi" ? … : lang === "ta" ?`,
 * which silently sent everyone outside those two into the chat asking in
 * English — and an English question comes back with an English answer.
 */
const CLAIM_QUERY: LocalizedText = {
  en: "My crop was damaged, am I eligible for a PMFBY claim?",
  hi: "मेरी फसल को नुकसान हुआ, क्या मैं पीएमएफबीवाई दावे के लिए पात्र हूं?",
  ta: "எனது பயிர் சேதமடைந்தது, நான் பிஎம்எஃப்பிவை உரிமைகோரலுக்கு தகுதியானவனா?",
  te: "నా పంట దెబ్బతింది, PMFBY క్లెయిమ్‌కు నేను అర్హుడినా?",
  kn: "ನನ್ನ ಬೆಳೆ ಹಾನಿಯಾಗಿದೆ, PMFBY ಕ್ಲೇಮ್‌ಗೆ ನಾನು ಅರ್ಹನೇ?",
  ml: "എന്റെ വിള നശിച്ചു, PMFBY ക്ലെയിമിന് ഞാൻ അർഹനാണോ?",
};

export default function AlertsPage() {
  const { lang, setLang } = useLang();
  const { districtId, setDistrictId } = useDistrict();
  const router = useRouter();
  const [outreachOpen, setOutreachOpen] = useState(false);
  const speechTag = LANGUAGES.find((l) => l.code === lang)?.speechTag ?? "en-IN";
  const { speak } = useSpeech(speechTag);

  const district = getDistrict(districtId)!;
  const days = daysUntil(district.enrollmentDeadline);
  const message = buildOutreachMessage(district, lang);

  function handleStartClaim() {
    const query = CLAIM_QUERY[lang] ?? CLAIM_QUERY.en;
    router.push(`/chat?q=${encodeURIComponent(query)}`);
  }

  function handleSimulateOutreach() {
    setOutreachOpen(true);
    speak(message);
  }

  return (
    <>
      <Header lang={lang} onLangChange={setLang} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-ink">{t("alertsChannel", lang)}</h1>
            <p className="text-sm text-ink-faint">
              Proactive push — the assistant reaches out before you have to ask.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-ink-faint">{t("yourDistrict", lang)}</span>
            <DistrictSelector districtId={districtId} onChange={setDistrictId} />
          </div>
        </div>

        {district.perilAlert ? (
          <div className="mb-4 rounded-2xl border-2 border-rose-300 bg-rose-50 p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 shrink-0 text-rose-600" size={22} />
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-rose-600">
                  {t("activeAlert", lang)} · {district.perilAlert.issuedHoursAgo}h ago
                </p>
                <p className="mt-1 text-base font-bold text-rose-900">{district.perilAlert.type}</p>
                <p className="mt-1 text-sm text-rose-700">
                  {district.district}, {district.state} · {district.crop} ·{" "}
                  {district.perilAlert.windowHours}h {t("claimWindowOpen", lang)}
                </p>
              </div>
            </div>
            <button
              onClick={handleStartClaim}
              className="mt-4 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700"
            >
              {t("startClaimNow", lang)}
            </button>
          </div>
        ) : (
          <div className="mb-4 rounded-2xl border border-line bg-surface p-5 text-sm text-ink-soft">
            {t("noActiveAlert", lang)}
          </div>
        )}

        <div className="mb-4 rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-forest-050 text-forest-600">
              <CalendarClock size={20} />
            </span>
            <div>
              <p className="text-2xl font-extrabold text-ink">{Math.max(days, 0)}</p>
              <p className="text-xs font-medium text-ink-faint">
                {t("daysToDeadline", lang)} · {district.crop} ({district.season})
              </p>
            </div>
          </div>
        </div>

        <div className="mb-4 rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-ink">{t("transparencyTitle", lang)}</h3>
          <div className="grid grid-cols-3 gap-3">
            <StatTile icon={TrendingUp} label={t("approvalRate", lang)} value={`${district.approvalRatePct}%`} />
            <StatTile
              icon={Wallet}
              label={t("medianPayout", lang)}
              value={`₹${district.medianPayoutInr.toLocaleString("en-IN")}`}
            />
            <StatTile
              icon={Clock3}
              label={t("medianSettlement", lang)}
              value={`${district.medianSettlementDays}d`}
            />
          </div>
          <p className="mt-3 text-[11px] text-ink-faint">
            Modeled on PMFBY&apos;s published district-wise settlement statistics (pmfby.gov.in) —
            demo values, wired to the live stats API in production.
          </p>
        </div>

        <div className="rounded-2xl border border-dashed border-forest-600/40 bg-forest-050 p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-forest-800">
              <PhoneCall size={16} />
              {t("simulateOutreach", lang)}
            </div>
            <button
              onClick={handleSimulateOutreach}
              className="rounded-full bg-forest-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-forest-800"
            >
              Run
            </button>
          </div>
          {outreachOpen && (
            <div className="mt-4 rounded-xl border border-line bg-white p-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                {t("outreachPreview", lang)}
              </p>
              <p className="text-sm leading-relaxed text-ink">{message}</p>
              <button
                onClick={() => speak(message)}
                className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-forest-600"
              >
                <Volume2 size={14} /> {t("listenReply", lang)}
              </button>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function StatTile({ icon: Icon, label, value }: { icon: typeof TrendingUp; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-paper p-3 text-center">
      <Icon size={16} className="mx-auto text-forest-600" />
      <p className="mt-1.5 text-base font-extrabold text-ink">{value}</p>
      <p className="text-[10px] leading-tight text-ink-faint">{label}</p>
    </div>
  );
}
