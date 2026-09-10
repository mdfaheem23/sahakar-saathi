"use client";

import { useEffect, useRef, useState } from "react";
import Header from "@/components/Header";
import KioskChassis, { SCREEN_RECT, ScreenGlare } from "@/components/KioskChassis";
import PacsOfficeScene from "@/components/PacsOfficeScene";
import SpeechErrorBanner from "@/components/SpeechError";
import ProvenanceNote from "@/components/ProvenanceNote";
import KioskReceipt from "@/components/KioskReceipt";
import RejectionButton from "@/components/RejectionButton";
import { useLang } from "@/lib/LangContext";
import { useChatEngine } from "@/lib/useChatEngine";
import { useSpeech } from "@/lib/useSpeech";
import { LANGUAGES, SUPPORTED_LANGS, t } from "@/lib/i18n";
import { AGENT_LABELS } from "@/lib/router";
import { ChatMessage, LangCode, LocalizedText } from "@/lib/types";
import type { SpeechError as SpeechErrorCode } from "@/lib/useSpeech";
import { gsap, useIsomorphicLayoutEffect, prefersReducedMotion } from "@/lib/motion";
import {
  Mic,
  Square,
  Volume2,
  Wifi,
  WifiOff,
  ChevronLeft,
  Hand,
} from "lucide-react";

/** Things members actually say — deliberately unclassified, mixed domains. */
const EXAMPLES: LocalizedText[] = [
  {
    en: "The flood ruined my paddy, will I get anything?",
    hi: "बाढ़ से मेरा धान बर्बाद हो गया, क्या मुझे कुछ मिलेगा?",
    ta: "வெள்ளத்தில் என் நெல் அழிந்தது, எனக்கு ஏதாவது கிடைக்குமா?",
    te: "వరదలో నా వరి పంట నాశనమైంది, నాకు ఏమైనా వస్తుందా?",
    kn: "ಪ್ರವಾಹದಲ್ಲಿ ನನ್ನ ಭತ್ತ ಹಾಳಾಯಿತು, ನನಗೆ ಏನಾದರೂ ಸಿಗುತ್ತದೆಯೇ?",
    ml: "വെള്ളപ്പൊക്കത്തിൽ എന്റെ നെല്ല് നശിച്ചു, എനിക്ക് എന്തെങ്കിലും കിട്ടുമോ?",
  },
  {
    en: "The agent is asking me for two thousand rupees",
    hi: "एजेंट मुझसे दो हज़ार रुपये मांग रहा है",
    ta: "முகவர் என்னிடம் இரண்டாயிரம் ரூபாய் கேட்கிறார்",
    te: "ఏజెంట్ నన్ను రెండు వేల రూపాయలు అడుగుతున్నాడు",
    kn: "ಏಜೆಂಟ್ ನನ್ನಿಂದ ಎರಡು ಸಾವಿರ ರೂಪಾಯಿ ಕೇಳುತ್ತಿದ್ದಾನೆ",
    ml: "ഏജന്റ് എന്നോട് രണ്ടായിരം രൂപ ചോദിക്കുന്നു",
  },
  {
    en: "They rejected my loan and would not tell me why",
    hi: "उन्होंने मेरा ऋण अस्वीकार कर दिया और कारण नहीं बताया",
    ta: "என் கடனை நிராகரித்தார்கள், காரணம் சொல்லவில்லை",
    te: "నా రుణాన్ని తిరస్కరించారు, కారణం చెప్పలేదు",
    kn: "ನನ್ನ ಸಾಲವನ್ನು ತಿರಸ್ಕರಿಸಿದರು, ಕಾರಣ ಹೇಳಲಿಲ್ಲ",
    ml: "എന്റെ വായ്പ നിരസിച്ചു, കാരണം പറഞ്ഞില്ല",
  },
  {
    en: "I farm on rented land, can I still get insurance?",
    hi: "मैं किराये की ज़मीन पर खेती करता हूँ, क्या मुझे बीमा मिलेगा?",
    ta: "நான் குத்தகை நிலத்தில் விவசாயம் செய்கிறேன், காப்பீடு கிடைக்குமா?",
    te: "నేను కౌలు భూమిలో వ్యవసాయం చేస్తున్నాను, నాకు బీమా వస్తుందా?",
    kn: "ನಾನು ಗುತ್ತಿಗೆ ಭೂಮಿಯಲ್ಲಿ ಕೃಷಿ ಮಾಡುತ್ತೇನೆ, ನನಗೆ ವಿಮೆ ಸಿಗುತ್ತದೆಯೇ?",
    ml: "ഞാൻ പാട്ടഭൂമിയിൽ കൃഷി ചെയ്യുന്നു, എനിക്ക് ഇൻഷുറൻസ് കിട്ടുമോ?",
  },
];

const ASK_ANYTHING: LocalizedText = {
  en: "Just say what happened",
  hi: "बस बताइए क्या हुआ",
  ta: "என்ன நடந்தது என்று சொல்லுங்கள்",
  te: "ఏమి జరిగిందో చెప్పండి",
  kn: "ಏನಾಯಿತು ಎಂದು ಹೇಳಿ",
  ml: "എന്താണ് സംഭവിച്ചതെന്ന് പറയൂ",
};

const NO_MENU_HINT: LocalizedText = {
  en: "In your own words — no need to pick a category",
  hi: "अपने शब्दों में — कोई श्रेणी चुनने की ज़रूरत नहीं",
  ta: "உங்கள் சொந்த வார்த்தைகளில் — வகை தேர்ந்தெடுக்க தேவையில்லை",
  te: "మీ సొంత మాటల్లో — విభాగం ఎంచుకోవాల్సిన అవసరం లేదు",
  kn: "ನಿಮ್ಮ ಸ್ವಂತ ಮಾತುಗಳಲ್ಲಿ — ವಿಭಾಗ ಆಯ್ಕೆ ಮಾಡುವ ಅಗತ್ಯವಿಲ್ಲ",
  ml: "നിങ്ങളുടെ സ്വന്തം വാക്കുകളിൽ — വിഭാഗം തിരഞ്ഞെടുക്കേണ്ട ആവശ്യമില്ല",
};

const ROUTING_LABEL: LocalizedText = {
  en: "Understanding your question and searching the documents…",
  hi: "आपका प्रश्न समझकर दस्तावेज़ खोजे जा रहे हैं…",
  ta: "உங்கள் கேள்வியைப் புரிந்து ஆவணங்களைத் தேடுகிறோம்…",
  te: "మీ ప్రశ్నను అర్థం చేసుకుని పత్రాలను వెతుకుతున్నాము…",
  kn: "ನಿಮ್ಮ ಪ್ರಶ್ನೆ ಅರ್ಥಮಾಡಿಕೊಂಡು ದಾಖಲೆಗಳನ್ನು ಹುಡುಕುತ್ತಿದ್ದೇವೆ…",
  ml: "നിങ്ങളുടെ ചോദ്യം മനസ്സിലാക്കി രേഖകൾ തിരയുന്നു…",
};

const ROUTED_TO: LocalizedText = {
  en: "Routed to",
  hi: "भेजा गया",
  ta: "அனுப்பப்பட்டது",
  te: "పంపబడింది",
  kn: "ಕಳುಹಿಸಲಾಗಿದೆ",
  ml: "അയച്ചു",
};

const ASK_ANOTHER: LocalizedText = {
  en: "Ask another",
  hi: "और पूछें",
  ta: "மேலும் கேள்",
  te: "మరొకటి అడగండి",
  kn: "ಇನ್ನೊಂದು ಕೇಳಿ",
  ml: "മറ്റൊന്ന് ചോദിക്കൂ",
};

const TOUCH_TO_BEGIN: LocalizedText = {
  en: "Touch to begin",
  hi: "शुरू करने के लिए छुएं",
  ta: "தொடங்க தொடவும்",
  te: "ప్రారంభించడానికి తాకండి",
  kn: "ಪ್ರಾರಂಭಿಸಲು ಸ್ಪರ್ಶಿಸಿ",
  ml: "തുടങ്ങാൻ സ്പർശിക്കുക",
};

export default function KioskPage() {
  const { lang, setLang } = useLang();
  const { messages, ask, reset, pending } = useChatEngine(lang, "kiosk");
  const [woken, setWoken] = useState(false);
  const [online] = useState(true);
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

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  const hasAnswer = messages.length > 1 && lastAssistant;

  const stage = useRef<HTMLDivElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);

  // The dolly: the chassis pushes past the camera and blurs out while the
  // screen it was showing scales up into a full panel. Built once, then played
  // forward on wake and reversed on step-back so the two directions stay
  // exactly symmetrical.
  useIsomorphicLayoutEffect(() => {
    const el = stage.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      if (prefersReducedMotion()) {
        tl.current = gsap.timeline({ paused: true })
          .set("[data-machine]", { autoAlpha: 0 })
          .set("[data-panel]", { autoAlpha: 1 });
        return;
      }

      gsap.set("[data-panel]", { autoAlpha: 0, scale: 0.86, y: 30 });
      gsap.set("[data-intro]", { autoAlpha: 1, y: 0 });

      tl.current = gsap
        .timeline({ paused: true, defaults: { ease: "power3.inOut" } })
        .to("[data-intro]", { autoAlpha: 0, y: -22, duration: 0.4 }, 0)
        .to(
          "[data-machine]",
          { scale: 2.35, y: -110, autoAlpha: 0, filter: "blur(14px)", duration: 1.05 },
          0
        )
        .to("[data-machine-caption]", { autoAlpha: 0, duration: 0.3 }, 0)
        .to(
          "[data-panel]",
          { autoAlpha: 1, scale: 1, y: 0, duration: 0.9, ease: "power3.out" },
          0.34
        )
        .from(
          "[data-panel-chrome]",
          { autoAlpha: 0, y: 14, duration: 0.5, stagger: 0.07 },
          0.72
        );
    }, stage);

    return () => ctx.revert();
  }, []);

  function wake() {
    setWoken(true);
    tl.current?.play();
  }

  async function handleAsk(text: string, detected?: LangCode) {
    const answer = await ask(text, detected);
    if (answer) speakAnswer(answer);
  }

  /**
   * Speaks a reply in the language it is actually written in, not the UI
   * setting.
   *
   * Escalations are spoken too. They used to be skipped, which left the
   * kiosk silent on exactly the questions it could not answer — and a member
   * standing at a counter who cannot read has no way to tell that apart from
   * a broken machine. "I could not answer this, I am passing it to a PACS
   * officer" is the most important thing for them to hear.
   */
  function speakAnswer(answer: ChatMessage) {
    // Spoken form, not the screen form: the kiosk stands in a PACS lobby and
    // its user is frequently there precisely because they cannot read.
    void speak(answer.spokenText ?? answer.text, answer.lang);
  }

  function handleMic() {
    if (listening) {
      stopListening();
      return;
    }
    startListening(async (transcript, detected) => {
      const answer = await ask(transcript, detected);
      if (answer) speakAnswer(answer);
    });
  }

  function stepBack() {
    setWoken(false);
    reset();
    tl.current?.reverse();
  }

  return (
    <>
      <Header lang={lang} onLangChange={setLang} />

      <main className="relative flex-1 overflow-hidden bg-paper-deep">
        {/* The room the machine stands in */}
        <PacsOfficeScene className="absolute inset-0 h-full w-full" />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-paper/60 via-paper/15 to-transparent"
          aria-hidden="true"
        />

        <div ref={stage} className="relative mx-auto max-w-6xl px-5 pb-16 pt-10">
          <div data-intro className="mb-6 text-center">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-clay-600">
                Hardware deliverable · Section 3.5
              </p>
              <h1 className="font-display mt-2 text-3xl font-bold text-ink sm:text-4xl">
                The PACS counter kiosk
              </h1>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-ink-soft">
                A Raspberry Pi-class terminal at the society office for members with no
                smartphone and no data connection. Push-to-talk mic, 5-inch touchscreen,
                speaker, and a cached knowledge base that survives network drops.
              </p>
          </div>

          <div className="relative flex items-start justify-center">
            {/* ---------------- Idle: the physical machine ---------------- */}
            <div data-machine className={woken ? "pointer-events-none" : ""}>
              <button
                onClick={wake}
                className="group relative block w-[380px] cursor-pointer sm:w-[440px]"
                aria-label="Wake the kiosk"
              >
                <KioskChassis listening={false} online={online} className="w-full" />

                {/* Attract-mode screen */}
                <div
                  className="absolute overflow-hidden rounded-[6px] bg-[#10151a]"
                  style={SCREEN_RECT}
                >
                  <div className="screen-field absolute inset-0" />
                  <div className="relative flex h-full flex-col items-center justify-center gap-[6%] px-[8%] text-center">
                    <p className="font-display text-[7.5%] font-bold leading-tight text-white [font-size:clamp(11px,7.5cqw,20px)]">
                      PACS Sahayak
                    </p>
                    <div className="flex flex-col gap-[3%]">
                      {/* Every supported language, not a hand-picked three:
                          the attract screen is how a member learns the kiosk
                          speaks their language at all, and listing en/hi/ta
                          told a Telugu speaker it does not. */}
                      {SUPPORTED_LANGS.map((l) => (
                        <p
                          key={l}
                          className="text-white/75 [font-size:clamp(7px,4.6cqw,12px)]"
                        >
                          {TOUCH_TO_BEGIN[l] ?? TOUCH_TO_BEGIN.en}
                        </p>
                      ))}
                    </div>
                    <span className="mt-[2%] inline-flex items-center gap-1.5 rounded-full bg-white/15 px-[5%] py-[2%] text-white ring-1 ring-white/25 [font-size:clamp(7px,4.2cqw,11px)]">
                      <Hand size={11} className="animate-pulse" />
                      Tap
                    </span>
                  </div>
                  <ScreenGlare />
                </div>

                {/* Hover affordance */}
                <span className="pointer-events-none absolute inset-0 rounded-[24px] ring-0 ring-forest-500/0 transition-all duration-300 group-hover:ring-4 group-hover:ring-forest-500/25" />
              </button>

              <p
                data-machine-caption
                className="mt-5 text-center text-xs font-medium text-ink-faint"
              >
                Tap the screen to step up to the machine
              </p>
            </div>

            {/* ---------------- Active: pushed in at the screen ---------------- */}
            <div
              data-panel
              className={`absolute inset-x-0 top-0 ${woken ? "" : "pointer-events-none"}`}
            >
              <div className="mx-auto w-full max-w-3xl">
                {/* Bezel framing the live screen — same materials as the chassis */}
                <div className="rounded-[26px] bg-gradient-to-b from-[#3d444d] via-[#272d34] to-[#1a1f24] p-3 shadow-[0_30px_70px_-20px_rgba(10,20,16,0.65)] ring-1 ring-black/40">
                  <div className="rounded-[18px] bg-[#0c0e11] p-2.5">
                    <div className="relative overflow-hidden rounded-[12px] bg-paper">
                      <KioskScreen
                        lang={lang}
                        listening={listening}
                        processing={processing}
                        supported={supported}
                        online={online}
                        onAsk={handleAsk}
                        pending={pending}
                        speechError={speechError}
                        onClearError={clearError}
                        speaking={speaking}
                        onStopSpeaking={stopSpeaking}
                        onMic={handleMic}
                        onSpeak={speak}
                        answer={hasAnswer ? lastAssistant : null}
                      />
                      <ScreenGlare />
                    </div>
                  </div>

                  {/* Physical controls below the glass */}
                  <div data-panel-chrome className="flex items-center justify-between px-4 pb-1 pt-3">
                    <button
                      onClick={handleMic}
                      disabled={!supported || processing}
                      className={`flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg ring-2 ring-black/40 transition-transform active:scale-95 ${
                        listening
                          ? "mic-listening bg-gradient-to-b from-[#f0913f] to-[#b4500f]"
                          : "bg-gradient-to-b from-[#2fbe89] to-[#0f5540]"
                      } ${!supported || processing ? "cursor-not-allowed opacity-45" : ""}`}
                      aria-label="Push to talk"
                    >
                      <Mic size={22} />
                    </button>

                    <p className="text-[11px] font-medium tracking-wide text-[#8a929c]">
                      {listening
                        ? t("listening", lang)
                        : processing
                          ? t("processing", lang)
                          : t("speakNow", lang)}
                    </p>

                    <div className="flex h-9 w-24 items-center justify-center gap-[3px] rounded-md bg-[#171b20] px-2 ring-1 ring-black/50">
                      {Array.from({ length: 18 }).map((_, i) => (
                        <span key={i} className="h-1 w-1 rounded-full bg-[#0b0d10]" />
                      ))}
                    </div>
                  </div>
                </div>

                <div data-panel-chrome className="mt-5 flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={stepBack}
                    className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink-soft shadow-sm transition-colors hover:border-line-strong hover:text-ink"
                  >
                    <ChevronLeft size={15} /> Step back from the kiosk
                  </button>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-2 text-xs font-medium text-ink-faint ring-1 ring-line">
                    {online ? (
                      <Wifi size={13} className="text-forest-600" />
                    ) : (
                      <WifiOff size={13} className="text-alert-500" />
                    )}
                    {online ? "Cloud sync active" : "Offline — cached knowledge base"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

/* ---------------------------------------------------------------------------
   The kiosk display.

   No category menu. Asking a farmer to classify their own problem into
   "cooperative law" vs "PMFBY" vs "grievance" is asking them to already know
   the answer — the classification is our job, and the router does it from the
   raw utterance. So the idle state is a single microphone and a rotating set
   of things other members have asked, purely as a prompt.

   The routed domain is revealed afterwards, as evidence that it happened.
   --------------------------------------------------------------------------- */
function KioskScreen({
  lang,
  listening,
  processing,
  supported,
  online,
  onAsk,
  onMic,
  onSpeak,
  answer,
  pending,
  speechError,
  onClearError,
  speaking,
  onStopSpeaking,
}: {
  lang: LangCode;
  listening: boolean;
  processing: boolean;
  supported: boolean;
  online: boolean;
  onAsk: (text: string) => void;
  onMic: () => void;
  onSpeak: (text: string, lang?: LangCode) => void;
  answer: ChatMessage | null | undefined;
  pending: boolean;
  speechError: SpeechErrorCode;
  onClearError: () => void;
  speaking: boolean;
  onStopSpeaking: () => void;
}) {
  const msg = answer;
  const [hint, setHint] = useState(0);

  // Cycle example utterances so the idle screen shows the range of things it
  // handles without turning them into a menu of buttons.
  useEffect(() => {
    if (msg || pending) return;
    const id = setInterval(() => setHint((h) => (h + 1) % EXAMPLES.length), 3600);
    return () => clearInterval(id);
  }, [msg, pending]);

  return (
    <div className="relative flex min-h-[430px] flex-col bg-paper">
      <div className="flex items-center justify-between border-b border-line bg-forest-800 px-4 py-2 text-white">
        <span className="font-display text-sm font-bold">PACS Sahayak</span>
        <span className="flex items-center gap-1.5 text-[10px] font-medium text-forest-100/80">
          {online ? <Wifi size={11} /> : <WifiOff size={11} />}
          {online ? "Online" : "Offline · cached"}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <SpeechErrorBanner
          error={speechError}
          lang={lang}
          onDismiss={onClearError}
          className="mb-3"
        />
        {pending ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3">
            <span className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-2 w-2 animate-bounce rounded-full bg-forest-500"
                  style={{ animationDelay: `${i * 0.14}s` }}
                />
              ))}
            </span>
            <p className="text-xs font-medium text-ink-faint">
              {ROUTING_LABEL[lang] ?? ROUTING_LABEL.en}
            </p>
          </div>
        ) : !msg ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <button
              onClick={onMic}
              disabled={!supported}
              className={`flex h-24 w-24 items-center justify-center rounded-full text-white shadow-lg transition-transform active:scale-95 ${
                listening
                  ? "mic-listening bg-gradient-to-b from-[#f0913f] to-[#b4500f]"
                  : "bg-gradient-to-b from-[#2fbe89] to-[#0f5540]"
              } ${!supported ? "cursor-not-allowed opacity-45" : ""}`}
              aria-label="Speak your question"
            >
              <Mic size={36} />
            </button>

            <p className="mt-5 text-base font-semibold text-ink">
              {ASK_ANYTHING[lang] ?? ASK_ANYTHING.en}
            </p>
            <p className="mt-1.5 text-xs text-ink-faint">{NO_MENU_HINT[lang] ?? NO_MENU_HINT.en}</p>

            {/* Example utterances — tappable so the demo survives a bad mic,
                but framed as things people say, not as categories. */}
            <button
              onClick={() => onAsk(EXAMPLES[hint][lang] ?? EXAMPLES[hint].en)}
              className="mt-6 max-w-[92%] rounded-full border border-dashed border-line-strong px-4 py-2.5 text-[13px] italic text-ink-soft transition-colors hover:border-forest-600 hover:text-forest-800"
            >
              &ldquo;{EXAMPLES[hint][lang] ?? EXAMPLES[hint].en}&rdquo;
            </button>
          </div>
        ) : (
          <div className="animate-rise flex flex-1 flex-col">
            {/* Routing evidence: the member never chose this. */}
            {msg.agent && (
              <div className="mb-2.5 flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
                  {ROUTED_TO[lang] ?? ROUTED_TO.en}
                </span>
                <span className="rounded-full bg-forest-050 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-forest-800">
                  {AGENT_LABELS[msg.agent][lang] ?? AGENT_LABELS[msg.agent].en}
                </span>
                {msg.generated && (
                  <span className="rounded-full bg-clay-100 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-clay-600">
                    RAG
                  </span>
                )}
              </div>
            )}

            <p className="max-h-[210px] overflow-y-auto text-[13.5px] leading-relaxed text-ink">
              {msg.text}
            </p>

            {msg.provenance && <ProvenanceNote provenance={msg.provenance} compact />}
            {!msg.provenance && msg.source && (
              <p className="mt-2 border-t border-line pt-2 text-[10px] text-ink-faint">
                {t("source", lang)}: {msg.source}
              </p>
            )}

            <div className="mt-auto flex items-center gap-2 pt-3">
              <button
                onClick={() =>
                  speaking ? onStopSpeaking() : onSpeak(msg.spokenText ?? msg.text, msg.lang)
                }
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[11px] font-semibold text-white ${
                  speaking ? "bg-clay-600" : "bg-forest-700"
                }`}
              >
                {speaking ? <Square size={12} /> : <Volume2 size={13} />}
                {speaking ? t("stopReply", lang) : t("listenReply", lang)}
              </button>
              <button
                onClick={onMic}
                disabled={!supported || processing}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[11px] font-semibold ${
                  listening
                    ? "mic-listening bg-clay-500 text-white"
                    : "border border-line text-ink-soft"
                }`}
              >
                <Mic size={13} /> {ASK_ANOTHER[lang] ?? ASK_ANOTHER.en}
              </button>
              {/* The member leaves with something they can re-check, rather
                  than with a memory of a screen. */}
              <KioskReceipt msg={msg} lang={lang} />
            </div>
            {msg.passageId && (
              <RejectionButton passageId={msg.passageId} lang={lang} channel="kiosk" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
