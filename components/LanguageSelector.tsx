"use client";

import { LANGUAGES } from "@/lib/i18n";
import { LangCode } from "@/lib/types";

export default function LanguageSelector({
  lang,
  onChange,
  compact = false,
}: {
  lang: LangCode;
  onChange: (lang: LangCode) => void;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-0.5 rounded-full border border-line bg-surface p-0.5 ${
        compact ? "" : "p-1"
      }`}
    >
      {LANGUAGES.map((l) => (
        <button
          key={l.code}
          onClick={() => onChange(l.code)}
          aria-pressed={lang === l.code}
          className={`rounded-full font-medium transition-colors ${
            compact ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-sm"
          } ${
            lang === l.code
              ? "bg-forest-800 text-white shadow-sm"
              : "text-ink-faint hover:text-forest-700"
          }`}
        >
          {l.native}
        </button>
      ))}
    </div>
  );
}
