"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LangCode } from "@/lib/types";
import { t } from "@/lib/i18n";
import LanguageSelector from "./LanguageSelector";
import {
  MessageCircle,
  Sparkles,
  ShieldAlert,
  Monitor,
} from "lucide-react";

/* Member-facing destinations. The Kiosk earns a top-bar slot because this is
   a Hardware-category problem statement — burying the physical channel behind
   a scroll misrepresents the deliverable. The NCCT admin dashboard is an
   internal tool and is reached from the home page grid instead. */
const NAV = [
  { href: "/entitlements", key: "navEntitlements" as const, icon: Sparkles },
  { href: "/verify", key: "navVerify" as const, icon: ShieldAlert },
  { href: "/chat", key: "navChat" as const, icon: MessageCircle },
  { href: "/kiosk", key: "navKiosk" as const, icon: Monitor },
];

export default function Header({
  lang,
  onLangChange,
}: {
  lang: LangCode;
  onLangChange: (l: LangCode) => void;
}) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-3">
        <Link href="/" className="group flex shrink-0 items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-forest-800 shadow-sm ring-1 ring-forest-900/20">
            <Sheaf />
          </span>
          <span className="hidden leading-none sm:block">
            <span className="font-display block text-[15px] font-bold text-ink">
              PACS Sahayak
            </span>
            <span className="mt-1 block text-[11px] text-ink-faint">
              {t("tagline", lang)}
            </span>
          </span>
        </Link>

        <nav className="flex min-w-0 flex-1 items-center justify-center gap-1 overflow-x-auto">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${
                  active
                    ? "bg-forest-800 text-white shadow-sm"
                    : "text-ink-soft hover:bg-forest-050 hover:text-forest-800"
                }`}
              >
                <item.icon size={14} className={active ? "" : "opacity-60"} />
                {t(item.key, lang)}
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0">
          <LanguageSelector lang={lang} onChange={onLangChange} compact />
        </div>
      </div>
    </header>
  );
}

/* Wheat sheaf — cooperative/agrarian mark, drawn rather than pulled from an
   icon set so the brand doesn't share a glyph with the nav items. */
function Sheaf() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 21V11"
        stroke="#dcefe6"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M12 11c0-3 1.6-5.6 3.4-7C16.6 5.6 17 8.3 15.6 10.4 14.7 11.7 13.4 12 12 11Z"
        fill="#1b9068"
      />
      <path
        d="M12 11c0-3-1.6-5.6-3.4-7C7.4 5.6 7 8.3 8.4 10.4 9.3 11.7 10.6 12 12 11Z"
        fill="#dcefe6"
      />
      <path
        d="M7.5 21c1.2-2.2 2.7-3.4 4.5-3.4S15.3 18.8 16.5 21"
        stroke="#c99a1e"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}
