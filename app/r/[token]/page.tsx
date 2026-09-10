import Link from "next/link";
import { ShieldCheck, ShieldAlert, ShieldX, FileWarning, ExternalLink, BadgeIndianRupee, Flag } from "lucide-react";
import { verifyReceipt } from "@/lib/receipt";
import { CORPUS } from "@/lib/rag/corpus";
import { assessPassage, formatDate, type TrustTier } from "@/lib/sources/freshness";
import type { LangCode, LocalizedText } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * What the QR code on a printed answer resolves to.
 *
 * This page is the difference between a printout that can be waved about for
 * weeks and one that cannot. It is rendered fresh on every scan — never
 * cached, never prerendered — and it recomputes the status of the passage
 * against today's corpus and today's source alerts. A member shown a
 * three-week-old sheet of paper claiming a scheme is open scans the code and
 * reads the current answer on their own phone, in their own language.
 *
 * It deliberately does not reproduce the printed answer text. It shows what
 * the rule says *today*, so the two can be compared. If the paper says
 * something this page does not, that discrepancy is the finding.
 */

const COPY: Record<string, LocalizedText> = {
  title: {
    en: "Checking this receipt",
    hi: "इस रसीद की जांच",
    ta: "இந்த ரசீதைச் சரிபார்க்கிறோம்",
    te: "ఈ రసీదును తనిఖీ చేస్తున్నాము",
    kn: "ಈ ರಸೀದಿಯನ್ನು ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ",
    ml: "ഈ രസീത് പരിശോധിക്കുന്നു",
  },
  issued: {
    en: "Shown at a PACS kiosk on {date}",
    hi: "पीएसीएस कियोस्क पर {date} को दिखाया गया",
    ta: "பாக்ஸ் கியோஸ்கில் {date} அன்று காட்டப்பட்டது",
    te: "PACS కియోస్క్‌లో {date} న చూపబడింది",
    kn: "PACS ಕಿಯೋಸ್ಕ್‌ನಲ್ಲಿ {date} ರಂದು ತೋರಿಸಲಾಗಿದೆ",
    ml: "PACS കിയോസ്കിൽ {date}-ന് കാണിച്ചത്",
  },
  saysToday: {
    en: "What this rule says today",
    hi: "यह नियम आज क्या कहता है",
    ta: "இந்த விதி இன்று என்ன சொல்கிறது",
    te: "ఈ నిబంధన ఈ రోజు ఏమి చెబుతోంది",
    kn: "ಈ ನಿಯಮ ಇಂದು ಏನು ಹೇಳುತ್ತದೆ",
    ml: "ഈ നിയമം ഇന്ന് എന്ത് പറയുന്നു",
  },
  compare: {
    en: "Compare this with the answer printed on your paper. If they do not match, do not act on the paper — report it.",
    hi: "इसकी तुलना अपने कागज़ पर छपे उत्तर से करें। यदि दोनों मेल नहीं खाते, तो कागज़ पर भरोसा न करें — इसकी शिकायत करें।",
    ta: "இதை உங்கள் காகிதத்தில் அச்சிடப்பட்ட பதிலுடன் ஒப்பிடுங்கள். இரண்டும் பொருந்தவில்லை எனில், காகிதத்தை நம்ப வேண்டாம் — புகாரளியுங்கள்.",
    te: "దీన్ని మీ కాగితంపై ముద్రించిన సమాధానంతో పోల్చండి. రెండూ సరిపోలకపోతే, కాగితాన్ని నమ్మవద్దు — ఫిర్యాదు చేయండి.",
    kn: "ಇದನ್ನು ನಿಮ್ಮ ಕಾಗದದ ಮೇಲೆ ಮುದ್ರಿಸಿದ ಉತ್ತರದೊಂದಿಗೆ ಹೋಲಿಸಿ. ಎರಡೂ ಹೊಂದದಿದ್ದರೆ, ಕಾಗದವನ್ನು ನಂಬಬೇಡಿ — ದೂರು ನೀಡಿ.",
    ml: "ഇത് നിങ്ങളുടെ കടലാസിൽ അച്ചടിച്ച ഉത്തരവുമായി താരതമ്യം ചെയ്യുക. രണ്ടും യോജിക്കുന്നില്ലെങ്കിൽ, കടലാസ് വിശ്വസിക്കരുത് — പരാതിപ്പെടുക.",
  },
  notOurs: {
    en: "This is not a PACS kiosk receipt",
    hi: "यह पीएसीएस कियोस्क की रसीद नहीं है",
    ta: "இது பாக்ஸ் கியோஸ்க் ரசீது அல்ல",
    te: "ఇది PACS కియోస్క్ రసీదు కాదు",
    kn: "ಇದು PACS ಕಿಯೋಸ್ಕ್ ರಸೀದಿ ಅಲ್ಲ",
    ml: "ഇത് ഒരു PACS കിയോസ്ക് രസീതല്ല",
  },
  notOursBody: {
    en: "This code was not issued by a PACS kiosk, or it has been altered. Do not rely on the paper it is printed on, and do not pay anyone on the strength of it.",
    hi: "यह कोड किसी पीएसीएस कियोस्क से जारी नहीं हुआ, या इसे बदला गया है। जिस कागज़ पर यह छपा है उस पर भरोसा न करें, और इसके आधार पर किसी को पैसे न दें।",
    ta: "இந்தக் குறியீடு பாக்ஸ் கியோஸ்கிலிருந்து வழங்கப்படவில்லை, அல்லது மாற்றப்பட்டுள்ளது. இது அச்சிடப்பட்ட காகிதத்தை நம்ப வேண்டாம், இதை நம்பி யாருக்கும் பணம் கொடுக்க வேண்டாம்.",
    te: "ఈ కోడ్ PACS కియోస్క్ నుండి జారీ కాలేదు, లేదా మార్చబడింది. ఇది ముద్రించిన కాగితాన్ని నమ్మవద్దు, దీని ఆధారంగా ఎవరికీ డబ్బు ఇవ్వవద్దు.",
    kn: "ಈ ಕೋಡ್ PACS ಕಿಯೋಸ್ಕ್‌ನಿಂದ ನೀಡಲಾಗಿಲ್ಲ, ಅಥವಾ ಬದಲಾಯಿಸಲಾಗಿದೆ. ಇದು ಮುದ್ರಿತವಾದ ಕಾಗದವನ್ನು ನಂಬಬೇಡಿ, ಇದನ್ನು ನಂಬಿ ಯಾರಿಗೂ ಹಣ ಕೊಡಬೇಡಿ.",
    ml: "ഈ കോഡ് ഒരു PACS കിയോസ്ക് നൽകിയതല്ല, അല്ലെങ്കിൽ മാറ്റം വരുത്തിയിട്ടുണ്ട്. ഇത് അച്ചടിച്ച കടലാസ് വിശ്വസിക്കരുത്, ഇത് വിശ്വസിച്ച് ആർക്കും പണം നൽകരുത്.",
  },
  gone: {
    en: "This answer is no longer in our records",
    hi: "यह उत्तर अब हमारे रिकॉर्ड में नहीं है",
    ta: "இந்தப் பதில் இனி எங்கள் பதிவில் இல்லை",
    te: "ఈ సమాధానం ఇక మా రికార్డులో లేదు",
    kn: "ಈ ಉತ್ತರ ಇನ್ನು ನಮ್ಮ ದಾಖಲೆಯಲ್ಲಿ ಇಲ್ಲ",
    ml: "ഈ ഉത്തരം ഇനി ഞങ്ങളുടെ രേഖയിലില്ല",
  },
  goneBody: {
    en: "The rule this receipt points to has been withdrawn from our records since it was printed. Treat the paper as out of date and ask your PACS secretary what applies now.",
    hi: "जिस नियम की ओर यह रसीद इशारा करती है, वह छपने के बाद हमारे रिकॉर्ड से हटा दिया गया है। कागज़ को पुराना मानें और अपने पीएसीएस सचिव से पूछें कि अब क्या लागू है।",
    ta: "இந்த ரசீது சுட்டும் விதி, அச்சிடப்பட்ட பிறகு எங்கள் பதிவிலிருந்து நீக்கப்பட்டுள்ளது. காகிதத்தை காலாவதியானதாகக் கருதி, இப்போது என்ன பொருந்தும் என்பதை உங்கள் பாக்ஸ் செயலாளரிடம் கேளுங்கள்.",
    te: "ఈ రసీదు సూచించే నిబంధన, ముద్రించిన తర్వాత మా రికార్డు నుండి తొలగించబడింది. కాగితాన్ని పాతదిగా భావించి, ఇప్పుడు ఏది వర్తిస్తుందో మీ PACS కార్యదర్శిని అడగండి.",
    kn: "ಈ ರಸೀದಿ ಸೂಚಿಸುವ ನಿಯಮವನ್ನು ಮುದ್ರಿಸಿದ ನಂತರ ನಮ್ಮ ದಾಖಲೆಯಿಂದ ಹಿಂಪಡೆಯಲಾಗಿದೆ. ಕಾಗದವನ್ನು ಹಳೆಯದೆಂದು ಪರಿಗಣಿಸಿ, ಈಗ ಏನು ಅನ್ವಯಿಸುತ್ತದೆ ಎಂದು ನಿಮ್ಮ PACS ಕಾರ್ಯದರ್ಶಿಯನ್ನು ಕೇಳಿ.",
    ml: "ഈ രസീത് സൂചിപ്പിക്കുന്ന നിയമം, അച്ചടിച്ചതിനു ശേഷം ഞങ്ങളുടെ രേഖയിൽ നിന്ന് പിൻവലിച്ചു. കടലാസ് കാലഹരണപ്പെട്ടതായി കണക്കാക്കി, ഇപ്പോൾ എന്താണ് ബാധകമെന്ന് നിങ്ങളുടെ PACS സെക്രട്ടറിയോട് ചോദിക്കുക.",
  },
  report: {
    en: "Someone asked me for money",
    hi: "किसी ने मुझसे पैसे मांगे",
    ta: "யாரோ என்னிடம் பணம் கேட்டார்",
    te: "ఎవరో నా దగ్గర డబ్బు అడిగారు",
    kn: "ಯಾರೋ ನನ್ನಿಂದ ಹಣ ಕೇಳಿದರು",
    ml: "ആരോ എന്നോട് പണം ചോദിച്ചു",
  },
};

function c(key: string, lang: LangCode): string {
  return COPY[key][lang] ?? COPY[key].en;
}

const TIER_STYLE: Record<TrustTier, { icon: typeof ShieldCheck; band: string; text: string }> = {
  verified: { icon: ShieldCheck, band: "bg-forest-700", text: "text-white" },
  unconfirmed: { icon: ShieldAlert, band: "bg-amber-500", text: "text-white" },
  expired: { icon: ShieldX, band: "bg-rose-600", text: "text-white" },
};

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">{children}</main>;
}

/** A refusal that is itself a warning, not a 404. */
function Rejected({ title, body }: { title: string; body: string }) {
  return (
    <Shell>
      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-md">
        <div className="flex items-center gap-3 bg-rose-600 px-5 py-4 text-white">
          <FileWarning size={28} />
          <p className="text-xl font-extrabold leading-tight">{title}</p>
        </div>
        <div className="p-5">
          <p className="text-sm leading-relaxed text-ink">{body}</p>
          <Link
            href="/grievance"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
          >
            <Flag size={14} /> {c("report", "en")}
          </Link>
        </div>
      </div>
    </Shell>
  );
}

export default async function ReceiptPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const check = verifyReceipt(decodeURIComponent(token));

  if (!check.ok) {
    // Both a forged code and a corrupted one are reported the same way. The
    // member cannot act on the difference, and the safe reading is identical.
    return <Rejected title={c("notOurs", "en")} body={c("notOursBody", "en")} />;
  }

  const { p: passageId, t: issuedAt, l: lang } = check.payload;
  const chunk = CORPUS.find((x) => x.id === passageId);

  if (!chunk) {
    return <Rejected title={c("gone", lang)} body={c("goneBody", lang)} />;
  }

  // Assessed now, with today's alerts — not as of the moment the paper was
  // printed. That is the entire purpose of resolving the code online.
  const provenance = assessPassage(
    {
      passageId: chunk.id,
      source: chunk.source,
      url: chunk.url,
      verifiedOn: chunk.verifiedOn,
      validTill: chunk.validTill,
    },
    lang
  );

  const style = TIER_STYLE[provenance.tier];
  const Icon = style.icon;
  const currentText = chunk.canned?.[lang] ?? chunk.canned?.en ?? chunk.text;

  return (
    <Shell>
      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-md">
        <div className={`flex items-start gap-3 px-5 py-4 ${style.band} ${style.text}`}>
          <Icon size={28} className="mt-0.5 shrink-0" />
          <div>
            <p className="text-lg font-extrabold leading-tight">{provenance.label}</p>
            <p className="mt-1 text-xs opacity-90">{provenance.notice}</p>
          </div>
        </div>

        <div className="p-5">
          <p className="text-[11px] font-medium text-ink-faint">
            {c("issued", lang).replace("{date}", formatDate(new Date(issuedAt * 1000).toISOString(), lang))}
          </p>

          <h2 className="mt-4 text-sm font-bold text-ink">{c("saysToday", lang)}</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-ink">{currentText}</p>
          <p className="mt-3 rounded-lg bg-clay-100 px-3 py-2 text-[11px] leading-relaxed font-medium text-clay-600">
            {c("compare", lang)}
          </p>

          <p className="mt-4 border-t border-line pt-3 text-[11px] leading-relaxed text-ink-faint">
            {provenance.source}
            {provenance.url && (
              <>
                {" "}
                <a
                  href={provenance.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 font-medium text-forest-700 underline underline-offset-2"
                >
                  <ExternalLink size={10} />
                </a>
              </>
            )}
          </p>

          <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-forest-050 px-3 py-2 text-[11px] leading-relaxed font-semibold text-forest-800">
            <BadgeIndianRupee size={13} className="mt-px shrink-0" />
            {provenance.freeService}
          </p>

          <Link
            href="/grievance"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
          >
            <Flag size={14} /> {c("report", lang)}
          </Link>
        </div>
      </div>
    </Shell>
  );
}
