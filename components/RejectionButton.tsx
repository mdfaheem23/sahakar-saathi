"use client";

import { useState } from "react";
import { ThumbsDown, Check } from "lucide-react";
import { reportRejection, rejectionCount } from "@/lib/storage";
import type { LangCode, LocalizedText } from "@/lib/types";

/**
 * "They refused this at the office."
 *
 * The only sensor this service has that points at reality rather than at a
 * document. Everything else in the trust layer reads what a department wrote;
 * this reads what a department did. A rule can be quietly stopped without a
 * byte of its PDF changing, no circular is issued, and the only people who
 * ever find out are standing at the window — so the report has to be one tap,
 * available at the moment of the refusal, from someone who is already angry
 * and about to leave.
 *
 * Reports are counted by distinct day, and three of them downgrade the answer
 * on this machine. That trade is deliberate and stated in `storage.ts`: a bad
 * actor can make a kiosk over-warn about a valid scheme, which costs a farmer
 * a conversation with the PACS secretary. The alternative costs them a fee
 * paid for a scheme nobody is honouring any more.
 */
const COPY: Record<string, LocalizedText> = {
  report: {
    en: "They refused this at the office",
    hi: "दफ़्तर में इससे इनकार कर दिया",
    ta: "அலுவலகத்தில் இதை மறுத்துவிட்டார்கள்",
    te: "ఆఫీసులో దీన్ని నిరాకరించారు",
    kn: "ಕಚೇರಿಯಲ್ಲಿ ಇದನ್ನು ನಿರಾಕರಿಸಿದರು",
    ml: "ഓഫീസിൽ ഇത് നിരസിച്ചു",
  },
  thanks: {
    en: "Recorded. If others report the same, we will warn everyone who asks.",
    hi: "दर्ज हो गया। यदि अन्य लोग भी यही बताते हैं, तो हम पूछने वाले सभी को चेतावनी देंगे।",
    ta: "பதிவு செய்யப்பட்டது. மற்றவர்களும் இதையே தெரிவித்தால், கேட்கும் அனைவரையும் எச்சரிப்போம்.",
    te: "నమోదైంది. ఇతరులు కూడా ఇదే చెబితే, అడిగే వారందరినీ హెచ్చరిస్తాము.",
    kn: "ದಾಖಲಾಗಿದೆ. ಇತರರೂ ಇದನ್ನೇ ವರದಿ ಮಾಡಿದರೆ, ಕೇಳುವ ಎಲ್ಲರಿಗೂ ಎಚ್ಚರಿಕೆ ನೀಡುತ್ತೇವೆ.",
    ml: "രേഖപ്പെടുത്തി. മറ്റുള്ളവരും ഇതേ കാര്യം അറിയിച്ചാൽ, ചോദിക്കുന്ന എല്ലാവർക്കും മുന്നറിയിപ്പ് നൽകും.",
  },
};

function c(key: string, lang: LangCode): string {
  return COPY[key][lang] ?? COPY[key].en;
}

export default function RejectionButton({
  passageId,
  lang,
  channel = "web",
}: {
  passageId: string;
  lang: LangCode;
  channel?: "app" | "web" | "kiosk" | "ivr";
}) {
  const [done, setDone] = useState(false);

  function report() {
    reportRejection({
      id: `fr${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
      passageId,
      channel,
      timestamp: Date.now(),
    });
    setDone(true);
    // Read back so the count is written before anything reads it, and so a
    // storage failure surfaces here rather than as a silently ignored report.
    void rejectionCount(passageId);
  }

  if (done) {
    return (
      <p className="mt-2 flex items-start gap-1.5 text-[11px] font-medium leading-relaxed text-forest-800">
        <Check size={12} className="mt-px shrink-0" />
        {c("thanks", lang)}
      </p>
    );
  }

  return (
    <button
      onClick={report}
      className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-ink-faint hover:text-clay-600"
    >
      <ThumbsDown size={11} /> {c("report", lang)}
    </button>
  );
}
