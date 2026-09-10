"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import ChatBubble from "@/components/ChatBubble";
import MicButton from "@/components/MicButton";
import SpeechErrorBanner from "@/components/SpeechError";
import DistrictSelector from "@/components/DistrictSelector";
import { useLang } from "@/lib/LangContext";
import { useDistrict } from "@/lib/DistrictContext";
import { getDistrict } from "@/lib/districtData";
import { useChatEngine } from "@/lib/useChatEngine";
import { useSpeech } from "@/lib/useSpeech";
import { LANGUAGES, t } from "@/lib/i18n";
import { Send, TrendingUp, Wallet, Clock3 } from "lucide-react";

const SUGGESTIONS_KEYS = [
  "pmfby-claim-eligibility",
  "schemes-overview",
  "law-member-rights",
  "grievance-how-to-file",
] as const;

const SUGGESTIONS: Record<string, Record<string, string>> = {
  en: {
    "pmfby-claim-eligibility": "My crop was damaged, am I eligible for a PMFBY claim?",
    "schemes-overview": "What Ministry schemes are available for PACS members?",
    "law-member-rights": "What are my rights as a PACS member?",
    "grievance-how-to-file": "I want to file a complaint",
  },
  hi: {
    "pmfby-claim-eligibility": "मेरी फसल को नुकसान हुआ, क्या मैं पीएमएफबीवाई दावे के लिए पात्र हूं?",
    "schemes-overview": "पीएसीएस सदस्यों के लिए कौन सी मंत्रालय योजनाएं उपलब्ध हैं?",
    "law-member-rights": "एक पीएसीएस सदस्य के रूप में मेरे अधिकार क्या हैं?",
    "grievance-how-to-file": "मुझे शिकायत दर्ज करनी है",
  },
  ta: {
    "pmfby-claim-eligibility": "எனது பயிர் சேதமடைந்தது, நான் பிஎம்எஃப்பிவை உரிமைகோரலுக்கு தகுதியானவனா?",
    "schemes-overview": "பாக்ஸ் உறுப்பினர்களுக்கு என்ன அமைச்சக திட்டங்கள் உள்ளன?",
    "law-member-rights": "பாக்ஸ் உறுப்பினராக எனது உரிமைகள் என்ன?",
    "grievance-how-to-file": "நான் ஒரு புகார் பதிவு செய்ய விரும்புகிறேன்",
  },
  te: {
    "pmfby-claim-eligibility": "నా పంట దెబ్బతింది, PMFBY క్లెయిమ్‌కు నేను అర్హుడినా?",
    "schemes-overview": "PACS సభ్యులకు ఏ మంత్రిత్వ శాఖ పథకాలు అందుబాటులో ఉన్నాయి?",
    "law-member-rights": "PACS సభ్యుడిగా నా హక్కులు ఏమిటి?",
    "grievance-how-to-file": "నేను ఫిర్యాదు నమోదు చేయాలనుకుంటున్నాను",
  },
  kn: {
    "pmfby-claim-eligibility": "ನನ್ನ ಬೆಳೆ ಹಾನಿಯಾಗಿದೆ, PMFBY ಕ್ಲೇಮ್‌ಗೆ ನಾನು ಅರ್ಹನೇ?",
    "schemes-overview": "PACS ಸದಸ್ಯರಿಗೆ ಯಾವ ಸಚಿವಾಲಯದ ಯೋಜನೆಗಳು ಲಭ್ಯವಿವೆ?",
    "law-member-rights": "PACS ಸದಸ್ಯನಾಗಿ ನನ್ನ ಹಕ್ಕುಗಳು ಯಾವುವು?",
    "grievance-how-to-file": "ನಾನು ದೂರು ದಾಖಲಿಸಲು ಬಯಸುತ್ತೇನೆ",
  },
  ml: {
    "pmfby-claim-eligibility": "എന്റെ വിള നശിച്ചു, PMFBY ക്ലെയിമിന് ഞാൻ അർഹനാണോ?",
    "schemes-overview": "PACS അംഗങ്ങൾക്ക് ഏതൊക്കെ മന്ത്രാലയ പദ്ധതികൾ ലഭ്യമാണ്?",
    "law-member-rights": "PACS അംഗമെന്ന നിലയിൽ എന്റെ അവകാശങ്ങൾ എന്തൊക്കെയാണ്?",
    "grievance-how-to-file": "എനിക്ക് ഒരു പരാതി നൽകണം",
  },
};

function DistrictStatsCard() {
  const { lang } = useLang();
  const { districtId } = useDistrict();
  const d = getDistrict(districtId);
  if (!d) return null;
  return (
    <div className="ml-1 mt-1 max-w-[85%] rounded-xl border border-line bg-forest-050 p-3 text-xs">
      <p className="mb-2 font-semibold text-forest-800">
        {t("transparencyTitle", lang)} · {d.district}
      </p>
      <div className="flex gap-4">
        <span className="flex items-center gap-1 text-ink-soft">
          <TrendingUp size={12} /> {d.approvalRatePct}% {t("approvalRate", lang)}
        </span>
        <span className="flex items-center gap-1 text-ink-soft">
          <Wallet size={12} /> ₹{d.medianPayoutInr.toLocaleString("en-IN")}
        </span>
        <span className="flex items-center gap-1 text-ink-soft">
          <Clock3 size={12} /> {d.medianSettlementDays}d
        </span>
      </div>
    </div>
  );
}

function ChatInner() {
  const { lang, setLang } = useLang();
  // Fall back to English rather than indexing by language directly: a missing
  // set used to return undefined and take the whole page down with a
  // TypeError, so selecting Telugu, Kannada or Malayalam crashed the chat.
  const suggestions = SUGGESTIONS[lang] ?? SUGGESTIONS.en;
  const { districtId, setDistrictId } = useDistrict();
  const { messages, ask } = useChatEngine(lang, "web");
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const speechTag = LANGUAGES.find((l) => l.code === lang)?.speechTag ?? "en-IN";
  const {
    listening,
    processing,
    supported,
    error: speechError,
    speaking,
    clearError,
    stopSpeaking,
    startListening,
    stopListening,
    speak,
  } = useSpeech(speechTag);
  const searchParams = useSearchParams();
  const lastAssistantId = [...messages].reverse().find((m) => m.role === "assistant")?.id;
  const prefillHandled = useRef(false);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q && !prefillHandled.current) {
      prefillHandled.current = true;
      ask(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function handleSend(text?: string) {
    const value = text ?? input;
    if (!value.trim()) return;
    ask(value);
    setInput("");
  }

  function handleMic() {
    if (listening) {
      stopListening();
      return;
    }
    startListening(async (transcript, detected) => {
      setInput("");

      // Voice in, voice out. Someone who spoke the question is not
      // necessarily able to read the answer — making them find and tap a
      // play button defeats the point of a voice-first assistant, and to a
      // member who cannot read, a silent reply is indistinguishable from a
      // broken app. Typed questions stay silent: whoever typed is reading.
      const answer = await ask(transcript, detected);
      if (!answer) return;

      // answer.lang, not the interface language: it is the language the text
      // is actually written in, which is what selects the right voice. An
      // escalation notice is spoken too — "I could not answer this, I am
      // passing it to a PACS officer" is exactly what they need to hear.
      // The caveat travels with the answer into the speech engine. A member
      // using the mic is very often a member who cannot read the screen.
      void speak(answer.spokenText ?? answer.text, answer.lang);
    });
  }

  return (
    <>
      <Header lang={lang} onLangChange={setLang} />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-4">
        <div className="mb-3 flex items-center justify-end gap-2">
          <span className="text-xs font-medium text-ink-faint">{t("yourDistrict", lang)}</span>
          <DistrictSelector districtId={districtId} onChange={setDistrictId} />
        </div>

        <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto pb-3" style={{ maxHeight: "calc(100vh - 270px)" }}>
          {messages.map((m) => (
            <div key={m.id}>
              <ChatBubble
                msg={m}
                onSpeak={(text) => speak(text, m.lang)}
                speaking={speaking && m.id === lastAssistantId}
                onStopSpeaking={stopSpeaking}
              />
              {m.role === "assistant" && m.agent === "pmfby" && !m.escalated && <DistrictStatsCard />}
            </div>
          ))}
          {listening && (
            <p className="text-center text-xs font-medium text-clay-600">{t("listening", lang)}</p>
          )}
          {processing && (
            <p className="text-center text-xs font-medium text-forest-600">{t("processing", lang)}</p>
          )}
        </div>

        {messages.length <= 1 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {SUGGESTIONS_KEYS.map((k) => (
              <button
                key={k}
                onClick={() => handleSend(suggestions[k])}
                className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-ink-soft hover:border-forest-600 hover:text-forest-800"
              >
                {suggestions[k]}
              </button>
            ))}
          </div>
        )}

        <SpeechErrorBanner
          error={speechError}
          lang={lang}
          onDismiss={clearError}
          className="mb-2"
        />

        <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface p-2 shadow-sm">
          <MicButton listening={listening} supported={supported && !processing} onToggle={handleMic} />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={t("typeMessage", lang)}
            className="flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-ink-faint"
          />
          <button
            onClick={() => handleSend()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-forest-700 text-white transition-colors hover:bg-forest-800"
          >
            <Send size={16} />
          </button>
        </div>
      </main>
    </>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatInner />
    </Suspense>
  );
}
