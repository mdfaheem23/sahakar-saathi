"use client";

import { useState } from "react";
import QRCode from "qrcode";
import { Printer, QrCode, X, BadgeIndianRupee } from "lucide-react";
import type { ChatMessage, LangCode, LocalizedText } from "@/lib/types";

/**
 * The paper the member takes away, and the code that keeps it honest.
 *
 * A printed government answer is the instrument of the fraud this service
 * exists to stop: it is what gets shown to a farmer weeks later as proof that
 * a lapsed scheme is still open, in a room where nobody can check. The QR code
 * is what removes that power from the paper. It carries a pointer, not a
 * claim, and resolving it re-checks the rule against that day's corpus — so a
 * sheet asserting a scheme is open shows LAPSED on the phone of the person
 * being shown it.
 *
 * The receipt is issued by the server, not minted here, so an offline kiosk
 * cannot print one. That is deliberate. A machine that could not verify the
 * answer it just gave has no business printing paper that says it did.
 */
const COPY: Record<string, LocalizedText> = {
  take: {
    en: "Take this with you",
    hi: "इसे साथ ले जाएं",
    ta: "இதை உடன் எடுத்துச் செல்லுங்கள்",
    te: "దీన్ని మీతో తీసుకెళ్లండి",
    kn: "ಇದನ್ನು ಜೊತೆಗೆ ತೆಗೆದುಕೊಂಡು ಹೋಗಿ",
    ml: "ഇത് കൂടെ കൊണ്ടുപോകൂ",
  },
  scanHint: {
    en: "Scan this code any time to check whether this answer is still true. It is checked again every time it is scanned.",
    hi: "यह जांचने के लिए कि यह उत्तर अब भी सही है या नहीं, इस कोड को कभी भी स्कैन करें। हर बार स्कैन करने पर इसकी दोबारा जांच होती है।",
    ta: "இந்தப் பதில் இப்போதும் சரியா என்பதைப் பார்க்க இந்தக் குறியீட்டை எப்போது வேண்டுமானாலும் ஸ்கேன் செய்யுங்கள். ஒவ்வொரு முறை ஸ்கேன் செய்யும்போதும் மீண்டும் சரிபார்க்கப்படும்.",
    te: "ఈ సమాధానం ఇప్పటికీ నిజమేనా అని చూడటానికి ఈ కోడ్‌ను ఎప్పుడైనా స్కాన్ చేయండి. ప్రతిసారి స్కాన్ చేసినప్పుడు మళ్లీ సరిచూడబడుతుంది.",
    kn: "ಈ ಉತ್ತರ ಈಗಲೂ ಸರಿಯೇ ಎಂದು ನೋಡಲು ಈ ಕೋಡ್ ಅನ್ನು ಯಾವಾಗ ಬೇಕಾದರೂ ಸ್ಕ್ಯಾನ್ ಮಾಡಿ. ಪ್ರತಿ ಬಾರಿ ಸ್ಕ್ಯಾನ್ ಮಾಡಿದಾಗಲೂ ಮತ್ತೆ ಪರಿಶೀಲಿಸಲಾಗುತ್ತದೆ.",
    ml: "ഈ ഉത്തരം ഇപ്പോഴും ശരിയാണോ എന്ന് നോക്കാൻ ഈ കോഡ് എപ്പോൾ വേണമെങ്കിലും സ്കാൻ ചെയ്യുക. ഓരോ തവണ സ്കാൻ ചെയ്യുമ്പോഴും വീണ്ടും പരിശോധിക്കപ്പെടും.",
  },
  print: { en: "Print", hi: "प्रिंट करें", ta: "அச்சிடு", te: "ప్రింట్ చేయండి", kn: "ಮುದ್ರಿಸಿ", ml: "പ്രിന്റ് ചെയ്യുക" },
  close: { en: "Close", hi: "बंद करें", ta: "மூடு", te: "మూసివేయండి", kn: "ಮುಚ್ಚಿ", ml: "അടയ്ക്കുക" },
  unavailable: {
    en: "This kiosk is offline, so it cannot issue a receipt that can be checked. Come back when it is connected.",
    hi: "यह कियोस्क ऑफ़लाइन है, इसलिए यह ऐसी रसीद नहीं दे सकता जिसकी जांच हो सके। जुड़ने पर दोबारा आएं।",
    ta: "இந்த கியோஸ்க் இணைப்பில் இல்லை, எனவே சரிபார்க்கக்கூடிய ரசீதை வழங்க முடியாது. இணைக்கப்பட்ட பிறகு மீண்டும் வாருங்கள்.",
    te: "ఈ కియోస్క్ ఆఫ్‌లైన్‌లో ఉంది, కాబట్టి తనిఖీ చేయగల రసీదును ఇవ్వలేదు. కనెక్ట్ అయ్యాక మళ్లీ రండి.",
    kn: "ಈ ಕಿಯೋಸ್ಕ್ ಆಫ್‌ಲೈನ್‌ನಲ್ಲಿದೆ, ಆದ್ದರಿಂದ ಪರಿಶೀಲಿಸಬಹುದಾದ ರಸೀದಿ ನೀಡಲಾಗದು. ಸಂಪರ್ಕಗೊಂಡ ನಂತರ ಮತ್ತೆ ಬನ್ನಿ.",
    ml: "ഈ കിയോസ്ക് ഓഫ്‌ലൈനാണ്, അതിനാൽ പരിശോധിക്കാവുന്ന ഒരു രസീത് നൽകാനാകില്ല. കണക്റ്റ് ആയ ശേഷം വീണ്ടും വരൂ.",
  },
};

function c(key: string, lang: LangCode): string {
  return COPY[key][lang] ?? COPY[key].en;
}

export default function KioskReceipt({
  msg,
  lang,
  kioskId = "kiosk",
}: {
  msg: ChatMessage;
  lang: LangCode;
  kioskId?: string;
}) {
  const [qr, setQr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const passageId = msg.passageId;

  async function issue() {
    if (!passageId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passageId, lang, kiosk: kioskId }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const { path } = (await res.json()) as { path: string };

      // Medium error correction: a receipt lives in a shirt pocket and gets
      // creased, and a code that stops scanning once it is folded is a code
      // that only worked in the demo.
      setQr(
        await QRCode.toDataURL(`${window.location.origin}${path}`, {
          errorCorrectionLevel: "M",
          margin: 2,
          width: 320,
        })
      );
    } catch {
      setError(c("unavailable", lang));
    } finally {
      setBusy(false);
    }
  }

  if (!passageId) return null;

  return (
    <>
      <button
        onClick={issue}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-2 text-[11px] font-semibold text-ink-soft disabled:opacity-50"
      >
        <QrCode size={13} /> {c("take", lang)}
      </button>

      {error && <p className="mt-2 text-[10px] leading-relaxed text-rose-600">{error}</p>}

      {qr && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-paper/98 p-5 print:static print:bg-white">
          <div id="pacs-receipt" className="flex w-full max-w-[280px] flex-col items-center text-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- a data URI
                generated in the browser; the image optimizer has nothing to do
                with it and would only add a network hop the kiosk may not have. */}
            <img src={qr} alt="" className="h-36 w-36" />
            <p className="mt-2 text-[10px] leading-relaxed text-ink-soft">{c("scanHint", lang)}</p>
            <p className="mt-2 border-t border-line pt-2 text-[10px] leading-relaxed text-ink">
              {msg.text}
            </p>
            {msg.provenance && (
              <>
                <p className="mt-2 text-[9px] leading-relaxed text-ink-faint">
                  {msg.provenance.notice}
                </p>
                <p className="mt-2 flex items-start gap-1 border-t border-line pt-2 text-[9px] font-semibold leading-relaxed text-forest-800">
                  <BadgeIndianRupee size={10} className="mt-px shrink-0" />
                  {msg.provenance.freeService}
                </p>
              </>
            )}
          </div>

          <div className="mt-4 flex gap-2 print:hidden">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-full bg-forest-700 px-3.5 py-2 text-[11px] font-semibold text-white"
            >
              <Printer size={13} /> {c("print", lang)}
            </button>
            <button
              onClick={() => setQr(null)}
              className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-2 text-[11px] font-semibold text-ink-soft"
            >
              <X size={13} /> {c("close", lang)}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
