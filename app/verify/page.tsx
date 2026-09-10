"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import MicButton from "@/components/MicButton";
import SpeechErrorBanner from "@/components/SpeechError";
import ProvenanceNote from "@/components/ProvenanceNote";
import { useLang } from "@/lib/LangContext";
import { useSpeech } from "@/lib/useSpeech";
import { LANGUAGES, t } from "@/lib/i18n";
import { LangCode, LocalizedText } from "@/lib/types";
import { MYTHS, MythEntry, Verdict, verifyClaim } from "@/lib/myths";
import { assessPassage } from "@/lib/sources/freshness";
import { ShieldAlert, ShieldCheck, ShieldQuestion, Volume2, Square, Flag, Search } from "lucide-react";

const COPY: Record<string, LocalizedText> = {
  title: { en: "Is this true?", hi: "क्या यह सच है?", ta: "இது உண்மையா?" , te: "ఇది నిజమా?", kn: "ಇದು ನಿಜವೇ?", ml: "ഇത് ശരിയാണോ?",},
  subtitle: {
    en: "Someone told you something about a scheme, a fee, or your rights? Repeat it here and we'll check it against the official rules — before you pay anyone.",
    hi: "किसी ने आपको किसी योजना, शुल्क या आपके अधिकारों के बारे में कुछ बताया? इसे यहां दोहराएं और हम आधिकारिक नियमों से जांचेंगे — इससे पहले कि आप किसी को भुगतान करें।",
    ta: "ஒரு திட்டம், கட்டணம் அல்லது உங்கள் உரிமைகள் பற்றி யாராவது ஏதாவது சொன்னார்களா? இங்கே திரும்பச் சொல்லுங்கள், அதிகாரப்பூர்வ விதிகளுடன் சரிபார்ப்போம் — நீங்கள் யாருக்கும் பணம் கொடுப்பதற்கு முன்.",
    te: "ఒక పథకం, రుసుము లేదా మీ హక్కుల గురించి ఎవరైనా మీకు ఏదైనా చెప్పారా? దాన్ని ఇక్కడ మళ్లీ చెప్పండి, అధికారిక నిబంధనలతో సరిచూస్తాము — మీరు ఎవరికైనా డబ్బు చెల్లించే ముందు.",
    kn: "ಒಂದು ಯೋಜನೆ, ಶುಲ್ಕ ಅಥವಾ ನಿಮ್ಮ ಹಕ್ಕುಗಳ ಬಗ್ಗೆ ಯಾರಾದರೂ ನಿಮಗೆ ಏನಾದರೂ ಹೇಳಿದ್ದಾರೆಯೇ? ಅದನ್ನು ಇಲ್ಲಿ ಮತ್ತೆ ಹೇಳಿ, ಅಧಿಕೃತ ನಿಯಮಗಳೊಂದಿಗೆ ಪರಿಶೀಲಿಸುತ್ತೇವೆ — ನೀವು ಯಾರಿಗಾದರೂ ಹಣ ಪಾವತಿಸುವ ಮೊದಲು.",
    ml: "ഒരു പദ്ധതി, ഫീസ് അല്ലെങ്കിൽ നിങ്ങളുടെ അവകാശങ്ങളെക്കുറിച്ച് ആരെങ്കിലും എന്തെങ്കിലും പറഞ്ഞോ? അത് ഇവിടെ ആവർത്തിക്കൂ, ഔദ്യോഗിക നിയമങ്ങളുമായി പരിശോധിക്കാം — നിങ്ങൾ ആർക്കെങ്കിലും പണം നൽകുന്നതിന് മുൻപ്.",
  },
  placeholder: {
    en: "e.g. \"The agent said I must pay ₹2,000 to file my claim\"",
    hi: "उदा. \"एजेंट ने कहा कि दावा दर्ज करने के लिए मुझे ₹2,000 देने होंगे\"",
    ta: "எ.கா. \"உரிமைகோரல் பதிவு செய்ய ₹2,000 செலுத்த வேண்டும் என்று முகவர் சொன்னார்\"",
    te: "ఉదా. \"క్లెయిమ్ దాఖలు చేయడానికి ₹2,000 చెల్లించాలని ఏజెంట్ చెప్పాడు\"",
    kn: "ಉದಾ. \"ಕ್ಲೇಮ್ ದಾಖಲಿಸಲು ₹2,000 ಪಾವತಿಸಬೇಕು ಎಂದು ಏಜೆಂಟ್ ಹೇಳಿದರು\"",
    ml: "ഉദാ. \"ക്ലെയിം നൽകാൻ ₹2,000 അടയ്ക്കണമെന്ന് ഏജന്റ് പറഞ്ഞു\"",
  },
  check: { en: "Check it", hi: "जांचें", ta: "சரிபார்" , te: "సరిచూడండి", kn: "ಪರಿಶೀಲಿಸಿ", ml: "പരിശോധിക്കൂ",},
  commonClaims: { en: "Common things farmers are told", hi: "किसानों से कही जाने वाली आम बातें", ta: "விவசாயிகளிடம் சொல்லப்படும் பொதுவான விஷயங்கள்" , te: "రైతులకు సాధారణంగా చెప్పే విషయాలు", kn: "ರೈತರಿಗೆ ಸಾಮಾನ್ಯವಾಗಿ ಹೇಳುವ ವಿಷಯಗಳು", ml: "കർഷകരോട് സാധാരണ പറയുന്ന കാര്യങ്ങൾ",},
  verdict_false: { en: "FALSE", hi: "गलत", ta: "தவறு" , te: "తప్పు", kn: "ತಪ್ಪು", ml: "തെറ്റ്",},
  verdict_true: { en: "TRUE", hi: "सही", ta: "சரி" , te: "నిజం", kn: "ಸರಿ", ml: "ശരി",},
  verdict_misleading: { en: "MISLEADING", hi: "भ्रामक", ta: "தவறாக வழிநடத்தும்" , te: "తప్పుదారి పట్టించేది", kn: "ದಾರಿತಪ್ಪಿಸುವುದು", ml: "തെറ്റിദ്ധരിപ്പിക്കുന്നത്",},
  noMatch: {
    en: "I don't have a verified ruling on that one. Rather than guess on something involving your money, I'm routing you to a human PACS officer — please file it as a grievance so it's on record.",
    hi: "मेरे पास इस पर कोई सत्यापित निर्णय नहीं है। आपके पैसे से जुड़ी बात पर अनुमान लगाने के बजाय, मैं आपको एक मानव पीएसीएस अधिकारी के पास भेज रहा हूं — कृपया इसे शिकायत के रूप में दर्ज करें ताकि यह रिकॉर्ड में रहे।",
    ta: "அதற்கு எனக்கு சரிபார்க்கப்பட்ட தீர்ப்பு இல்லை. உங்கள் பணம் சம்பந்தப்பட்ட விஷயத்தில் யூகிப்பதற்குப் பதிலாக, உங்களை மனித பாக்ஸ் அதிகாரியிடம் அனுப்புகிறேன் — பதிவில் இருக்க இதைப் புகாராகப் பதிவு செய்யுங்கள்.",
    te: "దానిపై నా దగ్గర ధృవీకరించిన తీర్పు లేదు. మీ డబ్బుకు సంబంధించిన విషయంలో ఊహించడం కంటే, మిమ్మల్ని PACS అధికారికి పంపుతున్నాను — రికార్డులో ఉండేలా దీన్ని ఫిర్యాదుగా నమోదు చేయండి.",
    kn: "ಅದರ ಬಗ್ಗೆ ನನ್ನ ಬಳಿ ಪರಿಶೀಲಿಸಿದ ತೀರ್ಪು ಇಲ್ಲ. ನಿಮ್ಮ ಹಣಕ್ಕೆ ಸಂಬಂಧಿಸಿದ ವಿಷಯದಲ್ಲಿ ಊಹಿಸುವ ಬದಲು, ನಿಮ್ಮನ್ನು PACS ಅಧಿಕಾರಿಗೆ ಕಳುಹಿಸುತ್ತಿದ್ದೇನೆ — ದಾಖಲೆಯಲ್ಲಿ ಇರುವಂತೆ ಇದನ್ನು ದೂರಾಗಿ ದಾಖಲಿಸಿ.",
    ml: "അതിനെക്കുറിച്ച് എന്റെ പക്കൽ സ്ഥിരീകരിച്ച വിധിയില്ല. നിങ്ങളുടെ പണവുമായി ബന്ധപ്പെട്ട കാര്യത്തിൽ ഊഹിക്കുന്നതിനു പകരം, നിങ്ങളെ ഒരു PACS ഉദ്യോഗസ്ഥന് കൈമാറുന്നു — രേഖയിൽ വരാൻ ഇത് പരാതിയായി നൽകുക.",
  },
  reportThis: { en: "Report this to the Registrar", hi: "इसकी रिपोर्ट रजिस्ट्रार को करें", ta: "இதை பதிவாளரிடம் புகாரளியுங்கள்" , te: "దీన్ని రిజిస్ట్రార్‌కు నివేదించండి", kn: "ಇದನ್ನು ರಿಜಿಸ್ಟ್ರಾರ್‌ಗೆ ವರದಿ ಮಾಡಿ", ml: "ഇത് രജിസ്ട്രാർക്ക് റിപ്പോർട്ട് ചെയ്യുക",},
  readAloud: { en: "Read ruling aloud", hi: "निर्णय सुनाएं", ta: "தீர்ப்பைப் படித்துக்காட்டு" , te: "తీర్పును వినిపించు", kn: "ತೀರ್ಪನ್ನು ಕೇಳಿಸಿ", ml: "വിധി വായിച്ചു കേൾപ്പിക്കൂ",},
};

function c(key: string, lang: LangCode) {
  // Chrome is hand-translated and lags new languages; answers do not.
  return COPY[key][lang] ?? COPY[key].en;
}

/**
 * The ruling as a speaking channel says it.
 *
 * A farmer who taps "read this aloud" on a fact-check is very often a farmer
 * who cannot read the screen, standing next to the person whose claim is being
 * checked. The caveat and the free-service line have to be inside what they
 * hear, not printed above it.
 */
function spokenRuling(myth: MythEntry, lang: LangCode): string {
  const p = assessPassage(
    { passageId: `myth:${myth.id}`, source: myth.source, verifiedOn: myth.verifiedOn },
    lang
  );
  return [myth.ruling[lang] ?? myth.ruling.en, p.spokenNotice, p.spokenFreeService]
    .filter(Boolean)
    .join(" ");
}

const VERDICT_STYLE: Record<Verdict, { bg: string; icon: typeof ShieldAlert; key: string }> = {
  false: { bg: "bg-rose-600", icon: ShieldAlert, key: "verdict_false" },
  true: { bg: "bg-emerald-600", icon: ShieldCheck, key: "verdict_true" },
  misleading: { bg: "bg-amber-500", icon: ShieldQuestion, key: "verdict_misleading" },
};

export default function VerifyPage() {
  const { lang, setLang } = useLang();
  const router = useRouter();
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

  const [input, setInput] = useState("");
  const [result, setResult] = useState<MythEntry | null | "none">(null);

  // `known` is passed when the user taps one of the listed example claims —
  // that rules deterministically rather than round-tripping through keyword
  // matching, which only needs to handle free-typed or spoken input.
  function check(text?: string, known?: MythEntry) {
    const value = (text ?? input).trim();
    if (!value) return;
    const found = known ?? verifyClaim(value, lang);
    setResult(found ?? "none");
    if (found) speak(spokenRuling(found, lang), lang);
  }

  function handleMic() {
    if (listening) {
      stopListening();
      return;
    }
    startListening((transcript) => {
      setInput(transcript);
      check(transcript);
    });
  }

  return (
    <>
      <Header lang={lang} onLangChange={setLang} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-ink">{c("title", lang)}</h1>
          <p className="mt-1.5 text-sm text-ink-soft">{c("subtitle", lang)}</p>
        </div>

        <div className="mb-3 flex items-center gap-2 rounded-2xl border border-line bg-surface p-2 shadow-sm">
          <MicButton listening={listening} supported={supported && !processing} onToggle={handleMic} />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && check()}
            placeholder={c("placeholder", lang)}
            className="flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-ink-faint"
          />
          <button
            onClick={() => check()}
            className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-forest-700 px-4 text-sm font-semibold text-white hover:bg-forest-800"
          >
            <Search size={15} /> {c("check", lang)}
          </button>
        </div>

        <SpeechErrorBanner
          error={speechError}
          lang={lang}
          onDismiss={clearError}
          className="mb-3"
        />

        {(listening || processing) && (
          <p className="mb-3 text-center text-xs font-medium text-clay-600">
            {listening ? t("listening", lang) : t("processing", lang)}
          </p>
        )}

        {result && result !== "none" && (
          <VerdictCard
            myth={result}
            lang={lang}
            onSpeak={() => (speaking ? stopSpeaking() : speak(spokenRuling(result, lang), lang))}
            speaking={speaking}
            onReport={() => router.push("/grievance")}
          />
        )}

        {result === "none" && (
          <div className="rounded-2xl border-2 border-dashed border-line bg-surface p-5">
            <p className="text-sm leading-relaxed text-ink-soft">{c("noMatch", lang)}</p>
            <button
              onClick={() => router.push("/grievance")}
              className="mt-3 rounded-lg bg-forest-700 px-4 py-2 text-sm font-semibold text-white hover:bg-forest-800"
            >
              {t("fileGrievance", lang)}
            </button>
          </div>
        )}

        <h3 className="mb-3 mt-8 text-sm font-bold text-ink">{c("commonClaims", lang)}</h3>
        <div className="space-y-2">
          {MYTHS.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                setInput(m.claim[lang] ?? m.claim.en);
                check(m.claim[lang] ?? m.claim.en, m);
              }}
              className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-left text-sm text-ink-soft transition-colors hover:border-forest-600 hover:text-ink"
            >
              &ldquo;{m.claim[lang] ?? m.claim.en}&rdquo;
            </button>
          ))}
        </div>
      </main>
    </>
  );
}

function VerdictCard({
  myth,
  lang,
  onSpeak,
  onReport,
  speaking,
}: {
  myth: MythEntry;
  lang: LangCode;
  onSpeak: () => void;
  onReport: () => void;
  speaking: boolean;
}) {
  const style = VERDICT_STYLE[myth.verdict];
  const Icon = style.icon;

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-md">
      <div className={`flex items-center gap-3 ${style.bg} px-5 py-4 text-white`}>
        <Icon size={28} />
        <div>
          <p className="text-2xl font-extrabold leading-none">{c(style.key, lang)}</p>
          <p className="mt-1 text-xs opacity-85">&ldquo;{myth.claim[lang] ?? myth.claim.en}&rdquo;</p>
        </div>
      </div>
      <div className="p-5">
        <p className="text-sm leading-relaxed text-ink">{myth.ruling[lang] ?? myth.ruling.en}</p>
        {/* Dated, like every other answer. A fact-check that shows no date is
            asking to be trusted on the same terms as the claim it is
            refuting. */}
        <ProvenanceNote
          provenance={assessPassage(
            { passageId: `myth:${myth.id}`, source: myth.source, verifiedOn: myth.verifiedOn },
            lang
          )}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={onSpeak}
            className="flex items-center gap-1.5 rounded-full bg-forest-050 px-3 py-1.5 text-xs font-semibold text-forest-800"
          >
            {speaking ? <Square size={12} /> : <Volume2 size={13} />}
            {speaking ? t("stopReply", lang) : c("readAloud", lang)}
          </button>
          {myth.reportable && (
            <button
              onClick={onReport}
              className="flex items-center gap-1.5 rounded-full bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
            >
              <Flag size={13} /> {c("reportThis", lang)}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
