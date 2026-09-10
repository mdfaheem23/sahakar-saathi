"use client";

import { useState } from "react";
import Header from "@/components/Header";
import ProvenanceNote from "@/components/ProvenanceNote";
import { useLang } from "@/lib/LangContext";
import { useSpeech } from "@/lib/useSpeech";
import { LANGUAGES } from "@/lib/i18n";
import { LangCode, LocalizedText } from "@/lib/types";
import { assessPassage } from "@/lib/sources/freshness";
import {
  FarmerProfile,
  computeEntitlements,
  TENANT_GAP_NOTE,
} from "@/lib/entitlements";
import { Volume2, RotateCcw, AlertTriangle, Check, Sparkles } from "lucide-react";

const COPY: Record<string, LocalizedText> = {
  title: {
    en: "What am I missing out on?",
    hi: "मैं क्या चूक रहा हूं?",
    ta: "நான் எதை இழக்கிறேன்?",
    te: "నేను ఏమి కోల్పోతున్నాను?",
    kn: "ನಾನು ಏನು ಕಳೆದುಕೊಳ್ಳುತ್ತಿದ್ದೇನೆ?",
    ml: "ഞാൻ എന്താണ് നഷ്ടപ്പെടുത്തുന്നത്?",
  },
  subtitle: {
    en: "Answer five things you already know about yourself. We'll tell you what you're legally entitled to and are not currently claiming.",
    hi: "अपने बारे में पांच बातें बताएं जो आप पहले से जानते हैं। हम बताएंगे कि आप कानूनी रूप से किसके हकदार हैं और अभी क्या नहीं ले रहे हैं।",
    ta: "உங்களைப் பற்றி நீங்கள் ஏற்கனவே அறிந்த ஐந்து விஷயங்களுக்குப் பதிலளியுங்கள். சட்டப்படி நீங்கள் எதற்குத் தகுதியானவர், தற்போது எதைப் பெறவில்லை என்பதைச் சொல்கிறோம்.",
    te: "మీ గురించి మీకు ఇప్పటికే తెలిసిన ఐదు విషయాలకు సమాధానం ఇవ్వండి. చట్టప్రకారం మీకు ఏమి అర్హత ఉంది, ప్రస్తుతం ఏమి తీసుకోవడం లేదు అని చెబుతాము.",
    kn: "ನಿಮ್ಮ ಬಗ್ಗೆ ನಿಮಗೆ ಈಗಾಗಲೇ ತಿಳಿದಿರುವ ಐದು ವಿಷಯಗಳಿಗೆ ಉತ್ತರಿಸಿ. ಕಾನೂನಿನ ಪ್ರಕಾರ ನಿಮಗೆ ಏನು ಅರ್ಹತೆ ಇದೆ ಮತ್ತು ಈಗ ಏನು ಪಡೆಯುತ್ತಿಲ್ಲ ಎಂದು ಹೇಳುತ್ತೇವೆ.",
    ml: "നിങ്ങളെക്കുറിച്ച് നിങ്ങൾക്ക് ഇതിനകം അറിയാവുന്ന അഞ്ച് കാര്യങ്ങൾക്ക് ഉത്തരം നൽകൂ. നിയമപ്രകാരം നിങ്ങൾക്ക് എന്തിനൊക്കെ അർഹതയുണ്ടെന്നും ഇപ്പോൾ എന്ത് വാങ്ങുന്നില്ലെന്നും പറയാം.",
  },
  q_land: { en: "How much land do you farm?", hi: "आप कितनी जमीन पर खेती करते हैं?", ta: "நீங்கள் எவ்வளவு நிலத்தில் விவசாயம் செய்கிறீர்கள்?" , te: "మీరు ఎంత భూమిలో వ్యవసాయం చేస్తారు?", kn: "ನೀವು ಎಷ್ಟು ಭೂಮಿಯಲ್ಲಿ ಕೃಷಿ ಮಾಡುತ್ತೀರಿ?", ml: "നിങ്ങൾ എത്ര ഭൂമിയിൽ കൃഷി ചെയ്യുന്നു?",},
  land_marginal: { en: "Less than 1 hectare", hi: "1 हेक्टेयर से कम", ta: "1 ஹெக்டேருக்கும் குறைவு" , te: "1 హెక్టారు కంటే తక్కువ", kn: "1 ಹೆಕ್ಟೇರ್‌ಗಿಂತ ಕಡಿಮೆ", ml: "1 ഹെക്ടറിൽ കുറവ്",},
  land_small: { en: "1 to 2 hectares", hi: "1 से 2 हेक्टेयर", ta: "1 முதல் 2 ஹெக்டேர்" , te: "1 నుండి 2 హెక్టార్లు", kn: "1 ರಿಂದ 2 ಹೆಕ್ಟೇರ್", ml: "1 മുതൽ 2 ഹെക്ടർ വരെ",},
  land_semi: { en: "More than 2 hectares", hi: "2 हेक्टेयर से अधिक", ta: "2 ஹெக்டேருக்கு மேல்" , te: "2 హెక్టార్ల కంటే ఎక్కువ", kn: "2 ಹೆಕ್ಟೇರ್‌ಗಿಂತ ಹೆಚ್ಚು", ml: "2 ഹെക്ടറിൽ കൂടുതൽ",},
  q_tenant: { en: "Is the land in your own name?", hi: "क्या जमीन आपके अपने नाम पर है?", ta: "நிலம் உங்கள் சொந்தப் பெயரில் உள்ளதா?" , te: "భూమి మీ సొంత పేరు మీద ఉందా?", kn: "ಭೂಮಿ ನಿಮ್ಮ ಸ್ವಂತ ಹೆಸರಿನಲ್ಲಿ ಇದೆಯೇ?", ml: "ഭൂമി നിങ്ങളുടെ സ്വന്തം പേരിലാണോ?",},
  tenant_no: { en: "No — I farm as a tenant/sharecropper", hi: "नहीं — मैं किरायेदार/बटाईदार हूं", ta: "இல்லை — நான் குத்தகைதாரர்/பங்குப் பயிரிடுபவர்" , te: "కాదు — నేను కౌలుదారు/పంట పంపకందారుగా సాగు చేస్తాను", kn: "ಇಲ್ಲ — ನಾನು ಗುತ್ತಿಗೆದಾರ/ಪಾಲುಗಾರನಾಗಿ ಕೃಷಿ ಮಾಡುತ್ತೇನೆ", ml: "അല്ല — ഞാൻ പാട്ടക്കാരൻ/പങ്കുകൃഷിക്കാരനായി കൃഷി ചെയ്യുന്നു",},
  tenant_yes: { en: "Yes — it's in my name", hi: "हां — यह मेरे नाम पर है", ta: "ஆம் — அது என் பெயரில் உள்ளது" , te: "అవును — అది నా పేరు మీద ఉంది", kn: "ಹೌದು — ಅದು ನನ್ನ ಹೆಸರಿನಲ್ಲಿದೆ", ml: "അതെ — അത് എന്റെ പേരിലാണ്",},
  q_kcc: { en: "Do you have a Kisan Credit Card?", hi: "क्या आपके पास किसान क्रेडिट कार्ड है?", ta: "உங்களிடம் விவசாயி கடன் அட்டை உள்ளதா?" , te: "మీకు కిసాన్ క్రెడిట్ కార్డు ఉందా?", kn: "ನಿಮ್ಮ ಬಳಿ ಕಿಸಾನ್ ಕ್ರೆಡಿಟ್ ಕಾರ್ಡ್ ಇದೆಯೇ?", ml: "നിങ്ങൾക്ക് കിസാൻ ക്രെഡിറ്റ് കാർഡ് ഉണ്ടോ?",},
  q_insured: { en: "Did you enroll in crop insurance this season?", hi: "क्या आपने इस मौसम फसल बीमा कराया?", ta: "இந்தப் பருவத்தில் பயிர் காப்பீடு செய்தீர்களா?" , te: "ఈ సీజన్‌లో మీరు పంట బీమా నమోదు చేసుకున్నారా?", kn: "ಈ ಋತುವಿನಲ್ಲಿ ನೀವು ಬೆಳೆ ವಿಮೆ ನೋಂದಾಯಿಸಿದ್ದೀರಾ?", ml: "ഈ സീസണിൽ നിങ്ങൾ വിള ഇൻഷുറൻസ് എടുത്തിരുന്നോ?",},
  q_woman: { en: "Are you a woman farmer?", hi: "क्या आप महिला किसान हैं?", ta: "நீங்கள் ஒரு பெண் விவசாயியா?" , te: "మీరు మహిళా రైతునా?", kn: "ನೀವು ಮಹಿಳಾ ರೈತರೇ?", ml: "നിങ്ങൾ ഒരു വനിതാ കർഷകയാണോ?",},
  yes: { en: "Yes", hi: "हां", ta: "ஆம்" , te: "అవును", kn: "ಹೌದು", ml: "അതെ",},
  no: { en: "No", hi: "नहीं", ta: "இல்லை" , te: "కాదు", kn: "ಇಲ್ಲ", ml: "അല്ല",},
  resultLead: {
    en: "You are entitled to but not currently claiming",
    hi: "आप हकदार हैं लेकिन अभी नहीं ले रहे हैं",
    ta: "நீங்கள் தகுதியானவர் ஆனால் தற்போது பெறவில்லை",
    te: "మీకు అర్హత ఉంది కానీ ప్రస్తుతం తీసుకోవడం లేదు",
    kn: "ನಿಮಗೆ ಅರ್ಹತೆ ಇದೆ ಆದರೆ ಈಗ ಪಡೆಯುತ್ತಿಲ್ಲ",
    ml: "നിങ്ങൾക്ക് അർഹതയുണ്ട് പക്ഷേ ഇപ്പോൾ വാങ്ങുന്നില്ല",
  },
  perYear: { en: "per year", hi: "प्रति वर्ष", ta: "ஆண்டுக்கு" , te: "సంవత్సరానికి", kn: "ವರ್ಷಕ್ಕೆ", ml: "പ്രതിവർഷം",},
  missingHeading: { en: "Not claimed yet — act on these", hi: "अभी तक नहीं लिया — इन पर कार्रवाई करें", ta: "இன்னும் பெறவில்லை — இவற்றில் நடவடிக்கை எடுங்கள்" , te: "ఇంకా తీసుకోలేదు — వీటిపై చర్య తీసుకోండి", kn: "ಇನ್ನೂ ಪಡೆದಿಲ್ಲ — ಇವುಗಳ ಮೇಲೆ ಕ್ರಮ ತೆಗೆದುಕೊಳ್ಳಿ", ml: "ഇതുവരെ വാങ്ങിയിട്ടില്ല — ഇവയിൽ നടപടിയെടുക്കൂ",},
  claimedHeading: { en: "Already claiming — good", hi: "पहले से ले रहे हैं — अच्छा है", ta: "ஏற்கனவே பெறுகிறீர்கள் — நல்லது" , te: "ఇప్పటికే తీసుకుంటున్నారు — మంచిది", kn: "ಈಗಾಗಲೇ ಪಡೆಯುತ್ತಿದ್ದೀರಿ — ಒಳ್ಳೆಯದು", ml: "ഇതിനകം വാങ്ങുന്നു — നല്ലത്",},
  oneTime: { en: "one-time", hi: "एकमुश्त", ta: "ஒருமுறை" , te: "ఒక్కసారి", kn: "ಒಂದು ಬಾರಿ", ml: "ഒറ്റത്തവണ",},
  startOver: { en: "Start over", hi: "फिर से शुरू करें", ta: "மீண்டும் தொடங்கு" , te: "మళ్లీ మొదలుపెట్టు", kn: "ಮತ್ತೆ ಆರಂಭಿಸಿ", ml: "വീണ്ടും തുടങ്ങുക",},
  readAloud: { en: "Read result aloud", hi: "परिणाम सुनाएं", ta: "முடிவைப் படித்துக்காட்டு" , te: "ఫలితాన్ని వినిపించు", kn: "ಫಲಿತಾಂಶವನ್ನು ಕೇಳಿಸಿ", ml: "ഫലം വായിച്ചു കേൾപ്പിക്കൂ",},
  policyGap: { en: "A policy gap you should know about", hi: "एक नीतिगत अंतर जो आपको जानना चाहिए", ta: "நீங்கள் அறிய வேண்டிய கொள்கை இடைவெளி" , te: "మీరు తెలుసుకోవలసిన ఒక విధాన లోపం", kn: "ನೀವು ತಿಳಿಯಬೇಕಾದ ಒಂದು ನೀತಿ ಲೋಪ", ml: "നിങ്ങൾ അറിഞ്ഞിരിക്കേണ്ട ഒരു നയ വിടവ്",},
};

function c(key: string, lang: LangCode) {
  // Chrome is hand-translated and lags new languages; answers do not.
  return COPY[key][lang] ?? COPY[key].en;
}

type Step = 0 | 1 | 2 | 3 | 4 | 5;

/**
 * "You are entitled to X rupees you are not claiming", per language.
 *
 * {amount} is substituted rather than interpolated per branch, so the figure
 * is formatted in exactly one place and cannot drift between languages.
 */
const LEAD_IN: LocalizedText = {
  en: "You are entitled to {amount} rupees you are not currently claiming.",
  hi: "आप हर साल {amount} रुपये के हकदार हैं जो आप अभी नहीं ले रहे हैं।",
  ta: "நீங்கள் தற்போது பெறாத ஆண்டுக்கு {amount} ரூபாய்க்கு நீங்கள் தகுதியானவர்.",
  te: "మీరు ప్రస్తుతం తీసుకోని {amount} రూపాయలకు మీరు అర్హులు.",
  kn: "ನೀವು ಈಗ ಪಡೆಯದ {amount} ರೂಪಾಯಿಗಳಿಗೆ ನೀವು ಅರ್ಹರಾಗಿದ್ದೀರಿ.",
  ml: "നിങ്ങൾ ഇപ്പോൾ വാങ്ങാത്ത {amount} രൂപയ്ക്ക് നിങ്ങൾ അർഹനാണ്.",
};

export default function EntitlementsPage() {
  const { lang, setLang } = useLang();
  const speechTag = LANGUAGES.find((l) => l.code === lang)?.speechTag ?? "en-IN";
  const { speak } = useSpeech(speechTag);

  const [step, setStep] = useState<Step>(0);
  const [profile, setProfile] = useState<Partial<FarmerProfile>>({});

  function answer(patch: Partial<FarmerProfile>) {
    setProfile((prev) => ({ ...prev, ...patch }));
    setStep((s) => (s + 1) as Step);
  }

  function reset() {
    setProfile({});
    setStep(0);
  }

  const complete = step === 5;
  const result = complete ? computeEntitlements(profile as FarmerProfile) : null;

  function readAloud() {
    if (!result) return;
    // Spoken aloud, so it has to exist in the member's language: the previous
    // en/hi/ta ternary read this sentence out in English to Telugu, Kannada
    // and Malayalam speakers, through a voice set to their language.
    const amount = result.missingValueInr.toLocaleString("en-IN");
    const lead = (LEAD_IN[lang] ?? LEAD_IN.en).replace("{amount}", amount);
    const names = result.missing.map((m) => m.name[lang] ?? m.name.en).join(", ");
    speak(`${lead} ${names}.`);
  }

  return (
    <>
      <Header lang={lang} onLangChange={setLang} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-ink">{c("title", lang)}</h1>
          <p className="mt-1.5 text-sm text-ink-soft">{c("subtitle", lang)}</p>
        </div>

        {!complete && (
          <>
            <div className="mb-4 flex gap-1.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-forest-700" : "bg-border"}`}
                />
              ))}
            </div>

            {step === 0 && (
              <Question text={c("q_land", lang)}>
                <Choice label={c("land_marginal", lang)} onClick={() => answer({ landSize: "marginal" })} />
                <Choice label={c("land_small", lang)} onClick={() => answer({ landSize: "small" })} />
                <Choice label={c("land_semi", lang)} onClick={() => answer({ landSize: "semi_medium" })} />
              </Question>
            )}
            {step === 1 && (
              <Question text={c("q_tenant", lang)}>
                <Choice label={c("tenant_yes", lang)} onClick={() => answer({ isTenant: false })} />
                <Choice label={c("tenant_no", lang)} onClick={() => answer({ isTenant: true })} />
              </Question>
            )}
            {step === 2 && (
              <Question text={c("q_kcc", lang)}>
                <Choice label={c("yes", lang)} onClick={() => answer({ hasKcc: true })} />
                <Choice label={c("no", lang)} onClick={() => answer({ hasKcc: false })} />
              </Question>
            )}
            {step === 3 && (
              <Question text={c("q_insured", lang)}>
                <Choice label={c("yes", lang)} onClick={() => answer({ insuredThisSeason: true })} />
                <Choice label={c("no", lang)} onClick={() => answer({ insuredThisSeason: false })} />
              </Question>
            )}
            {step === 4 && (
              <Question text={c("q_woman", lang)}>
                <Choice label={c("yes", lang)} onClick={() => answer({ isWoman: true })} />
                <Choice label={c("no", lang)} onClick={() => answer({ isWoman: false })} />
              </Question>
            )}
          </>
        )}

        {complete && result && (
          <>
            <div className="rounded-2xl bg-forest-700 p-6 text-center text-white shadow-lg">
              <Sparkles size={20} className="mx-auto opacity-80" />
              <p className="mt-2 text-xs font-semibold uppercase tracking-wide opacity-80">
                {c("resultLead", lang)}
              </p>
              <p className="mt-1 text-4xl font-extrabold">
                ₹{result.missingValueInr.toLocaleString("en-IN")}
              </p>
              <p className="text-xs opacity-80">
                {c("perYear", lang)} · {result.missing.length} schemes
              </p>
              <button
                onClick={readAloud}
                className="mx-auto mt-4 flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold hover:bg-white/25"
              >
                <Volume2 size={14} /> {c("readAloud", lang)}
              </button>
            </div>

            {profile.isTenant && (
              <div className="mt-4 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
                      {c("policyGap", lang)}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-amber-900">
                      {TENANT_GAP_NOTE[lang] ?? TENANT_GAP_NOTE.en}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <h3 className="mb-3 mt-6 text-sm font-bold text-ink">{c("missingHeading", lang)}</h3>
            <div className="space-y-3">
              {result.missing.map((e) => (
                <div key={e.id} className="rounded-xl border-l-4 border-l-rose-500 border border-line bg-surface p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-bold text-ink">{e.name[lang] ?? e.name.en}</p>
                    <p className="shrink-0 text-sm font-extrabold text-rose-600">
                      ₹{e.valueInr.toLocaleString("en-IN")}
                      {e.cadence === "one_time" && (
                        <span className="ml-1 text-[10px] font-medium text-ink-faint">
                          {c("oneTime", lang)}
                        </span>
                      )}
                    </p>
                  </div>
                  <p className="mt-1 text-sm text-ink-soft">{e.why[lang] ?? e.why.en}</p>
                  {/* Dated, because this card tells a member they are owed a
                      specific sum. An undated figure is the one an agent can
                      still be charging a fee to "help" them claim. */}
                  <ProvenanceNote
                    provenance={assessPassage(
                      { passageId: `ent:${e.id}`, source: e.source, verifiedOn: e.verifiedOn },
                      lang
                    )}
                  />
                </div>
              ))}
            </div>

            {result.claimed.length > 0 && (
              <>
                <h3 className="mb-3 mt-6 text-sm font-bold text-ink">{c("claimedHeading", lang)}</h3>
                <div className="space-y-2">
                  {result.claimed.map((e) => (
                    <div
                      key={e.id}
                      className="flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm"
                    >
                      <Check size={15} className="shrink-0 text-emerald-600" />
                      <span className="text-ink-soft">{e.name[lang] ?? e.name.en}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            <button
              onClick={reset}
              className="mt-6 flex items-center gap-1.5 text-sm font-semibold text-forest-600 hover:text-forest-800"
            >
              <RotateCcw size={14} /> {c("startOver", lang)}
            </button>
          </>
        )}
      </main>
    </>
  );
}

function Question({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
      <p className="mb-4 text-lg font-bold text-ink">{text}</p>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

function Choice({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-xl border-2 border-line bg-paper px-4 py-3.5 text-left text-sm font-medium text-ink transition-all hover:-translate-y-0.5 hover:border-forest-600 hover:shadow-sm active:scale-[0.99]"
    >
      {label}
    </button>
  );
}
