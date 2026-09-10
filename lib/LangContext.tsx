"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { LangCode } from "./types";

const LANG_KEY = "pacs.lang.v1";

const LangCtx = createContext<{
  lang: LangCode;
  setLang: (l: LangCode) => void;
}>({ lang: "en", setLang: () => {} });

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<LangCode>("en");

  useEffect(() => {
    const saved = window.localStorage.getItem(LANG_KEY) as LangCode | null;
    if (saved) queueMicrotask(() => setLangState(saved));
  }, []);

  const setLang = (l: LangCode) => {
    setLangState(l);
    window.localStorage.setItem(LANG_KEY, l);
  };

  return <LangCtx.Provider value={{ lang, setLang }}>{children}</LangCtx.Provider>;
}

export function useLang() {
  return useContext(LangCtx);
}
