import { LangCode } from "../types";
import { TTLCache, speechKey } from "../cache";
// Same endpoint and model as generation, so a tier or model change cannot
// leave the two paths pointing at different models.
import { chatFetch, LANG_NAME } from "./generate";

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

  const key = process.env.MISTRAL_API_KEY;
  if (!key) return null;

  const cacheKey = speechKey(body, target);
  const cached = translationCache.get(cacheKey);
  if (cached) return cached;

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
      console.error(`[translate] Mistral ${res.status}: ${await res.text()}`);
      return null;
    }

    const json = (await res.json()) as {
      choices: { message: { content: string } }[];
    };
    const out = (json.choices?.[0]?.message?.content ?? "").trim();
    if (!out) return null;

    translationCache.set(cacheKey, out);
    return out;
  } catch (err) {
    console.error("[translate] failed:", err);
    return null;
  }
}
