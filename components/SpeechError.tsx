"use client";

import { AlertCircle, X } from "lucide-react";
import { t } from "@/lib/i18n";
import { LangCode } from "@/lib/types";
import type { SpeechError as SpeechErrorCode } from "@/lib/useSpeech";

const KEY_BY_CODE = {
  denied: "errDenied",
  too_short: "errTooShort",
  failed: "errFailed",
} as const;

/** Makes a failed voice attempt visible — silence reads as a broken app. */
export default function SpeechError({
  error,
  lang,
  onDismiss,
  className = "",
}: {
  error: SpeechErrorCode;
  lang: LangCode;
  onDismiss: () => void;
  className?: string;
}) {
  if (!error) return null;

  return (
    <div
      role="status"
      className={`flex items-start gap-2 rounded-xl border border-clay-500/40 bg-clay-100 px-3.5 py-2.5 text-[12px] leading-relaxed text-clay-600 ${className}`}
    >
      <AlertCircle size={15} className="mt-0.5 shrink-0" />
      <span className="flex-1">{t(KEY_BY_CODE[error], lang)}</span>
      <button onClick={onDismiss} aria-label="Dismiss" className="shrink-0 opacity-60 hover:opacity-100">
        <X size={14} />
      </button>
    </div>
  );
}
