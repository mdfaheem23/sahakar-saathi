import { LangCode, LocalizedText } from "./types";
import GENERATED from "./i18n.generated.json";

/**
 * Translations for languages added after the hand-written tables.
 *
 * The original six languages are written inline next to their English, where
 * a reviewer reads them side by side. Marathi, Bengali, Gujarati, Punjabi and
 * Odia were added later and are machine-translated by
 * `scripts/translate-ui.ts` into `i18n.generated.json`, keyed by the path of
 * the string in its table. Keeping them out of the tables means a native
 * speaker can review one file per language, and regenerating never touches a
 * hand-written line.
 *
 * Applied once, at module load, and only ever fills a gap: a hand-written
 * translation always wins over a generated one.
 */

type Overlay = Record<string, Partial<Record<LangCode, string>>>;
const OVERLAY = GENERATED as Overlay;

function isLocalized(v: unknown): v is LocalizedText {
  return !!v && typeof v === "object" && typeof (v as { en?: unknown }).en === "string";
}

/** Every LocalizedText in `table`, with its dotted path under `prefix`. */
export function collectLocalized(
  prefix: string,
  table: unknown,
  out: { path: string; text: LocalizedText }[] = []
): { path: string; text: LocalizedText }[] {
  if (isLocalized(table)) {
    out.push({ path: prefix, text: table });
  } else if (table && typeof table === "object") {
    for (const [k, v] of Object.entries(table)) collectLocalized(`${prefix}.${k}`, v, out);
  }
  return out;
}

/** Fills missing languages in every LocalizedText under `table`, in place. */
export function applyOverlay<T>(prefix: string, table: T): T {
  for (const { path, text } of collectLocalized(prefix, table)) {
    const extra = OVERLAY[path];
    if (!extra) continue;
    const target = text as Partial<Record<LangCode, string>>;
    for (const [lang, value] of Object.entries(extra) as [LangCode, string][]) {
      if (!target[lang] && value) target[lang] = value;
    }
  }
  return table;
}
