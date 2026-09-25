import { LangCode } from "../types";
import { TTLCache, speechKey } from "../cache";
// Same endpoint and model as generation, so a tier or model change cannot
// leave the two paths pointing at different models.
import { chatFetch, hasChatProvider, LANG_NAME, stripReasoning } from "./generate";
import { bhashiniTranslate, hasBhashini } from "../speech/bhashini";

/**
 * Stored passages are authored in English and hand-translated into only some
 * languages. Without this step a Telugu, Kannada or Malayalam speaker gets the
 * English passage back whenever the LLM answer path is unavailable — and,
 * worse, it is then handed to the speech engine tagged as Telugu, so it is
 * read aloud in a Telugu voice pronouncing English words.
 *
 * Translating the retrieved passage keeps the single source of truth in
 * corpus.ts (one place a legal fact lives) while still replying in the
 * member's language. It is deliberately a translation and not a second
 * generation pass: the model is given finished, grounded text and forbidden
 * from adding to it, so it cannot introduce a fact the corpus does not have.
 */

// Keyed on text + language, exactly like the speech cache: the same passage is
// re-served constantly at a counter, and this is a paid call.
const translationCache = new TTLCache<string>(400, 24 * 60 * 60 * 1000);

const SYSTEM = `You are a translator for an Indian government cooperative-services assistant. You translate finished answers for farmers and PACS members.

RULES:
1. Translate the user's text into {LANG}. Output the translation and nothing else.
2. Translate meaning, not words. Use plain language a farmer with limited formal schooling can follow.
3. Never add, remove, soften or extend any fact. Do not explain, do not comment, do not add a greeting or a closing.
4. Copy every number, date, percentage, rupee amount, time limit and section reference EXACTLY as written. These are legal and financial values and a changed digit is a serious error.
5. Keep scheme and institution names recognisable: PMFBY, PACS, KCC, Aadhaar, CSC, Registrar. Transliterate them into the target script rather than translating them into unfamiliar words.
6. No markdown, no bullet characters, no headings. The result is read aloud by a speech engine.
7. If the text is already in {LANG}, return it unchanged.`;

/**
 * Translates a grounded passage into the member's language.
 *
 * Returns null rather than throwing: a translation failure must degrade to
 * "answer in English, honestly labelled" and never to a failed request.
 */
export async function translatePassage(
  text: string,
  target: LangCode
): Promise<string | null> {
  const body = text.trim();
  if (!body || target === "en") return body || null;

  const cacheKey = speechKey(body, target);
  const cached = translationCache.get(cacheKey);
  if (cached) return cached;

  // Bhashini's translation models first. A translation that changed a digit
  // is worse than none on legal text, so one that did is discarded and the
  // LLM, which is told to copy figures exactly, gets the passage instead.
  if (hasBhashini()) {
    const out = await bhashiniTranslate(body, "en", target);
    if (out && sameDigits(body, out)) {
      translationCache.set(cacheKey, out);
      return out;
    }
  }

  if (!hasChatProvider()) return null;

  try {
    const { res } = await chatFetch(
      {
        // Translation of legal text wants the most literal reading available.
        temperature: 0,
        max_tokens: 700,
        messages: [
          { role: "system", content: SYSTEM.replaceAll("{LANG}", LANG_NAME[target]) },
          { role: "user", content: body },
        ],
      },
      "translate"
    );

    if (!res.ok) {
      console.error(`[translate] ${res.status}: ${await res.text()}`);
      return null;
    }

    const json = (await res.json()) as {
      choices: { message: { content: string } }[];
    };
    const out = stripReasoning(json.choices?.[0]?.message?.content ?? "");
    if (!out) return null;

    translationCache.set(cacheKey, out);
    return out;
  } catch (err) {
    console.error("[translate] failed:", err);
    return null;
  }
}

/**
 * Whether every number in the English survives in the translation.
 *
 * Indic scripts have their own digits, so both sides are normalised to ASCII
 * first; only the multiset of numbers is compared, not their position.
 */
function sameDigits(source: string, translated: string): boolean {
  const toAscii = (t: string) =>
    t.replace(/[\u0966-\u096F\u09E6-\u09EF\u0A66-\u0A6F\u0AE6-\u0AEF\u0B66-\u0B6F\u0BE6-\u0BEF\u0C66-\u0C6F\u0CE6-\u0CEF\u0D66-\u0D6F]/g, (d) =>
      String((d.charCodeAt(0) - 0x0966) % 16)
    );
  const nums = (t: string) => (toAscii(t).match(/\d+(?:[.,]\d+)*/g) ?? []).map((n) => n.replace(/,/g, "")).sort();
  const a = nums(source);
  const b = nums(translated);
  return a.length === b.length && a.every((n, i) => n === b[i]);
}
