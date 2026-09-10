import { NextRequest } from "next/server";
import { retrieve, hasUsableContext } from "@/lib/rag/hybrid";
import { generateAnswer } from "@/lib/rag/generate";
import { hasMistralKey } from "@/lib/rag/embeddings";
import { translatePassage } from "@/lib/rag/translate";
import type { Chunk } from "@/lib/rag/corpus";
import { LangCode } from "@/lib/types";
import { TTLCache, questionKey } from "@/lib/cache";
import { assessPassage, escalationProvenance, type Provenance } from "@/lib/sources/freshness";
import { ensureFreshAlerts } from "@/lib/sources/live";
import { smallTalkIntent, smallTalkReply } from "@/lib/rag/smalltalk";

// Retrieval + generation is the slow, paid path. Repeat questions — which
// dominate real counter traffic — are served from here instead.
const answerCache = new TTLCache<CachedAnswer>(300, 60 * 60 * 1000);

/**
 * What is worth caching, and what must never be.
 *
 * The answer text is cached; the trust verdict on it is not. They have
 * different lifetimes — the text is only re-derived when the corpus changes,
 * while the verdict can flip in the minutes after the daily source check
 * finds a changed PDF, or the moment a scheme is flagged from the
 * environment. Freezing the verdict into the cached payload would mean a
 * withdrawn scheme kept being served as verified for the rest of the cache
 * window, to every member who asked the same question, on every channel.
 * Which is precisely the failure this whole layer exists to prevent.
 */
interface CachedAnswer {
  answer: string | null;
  answerLang: LangCode | null;
  translated?: boolean;
  escalate: boolean;
  agent: string | null;
  source: string | null;
  generated: boolean;
  degraded?: boolean;
  retrieval: unknown;
  /** The passage the answer rests on — provenance is recomputed from it. */
  passageId: string | null;
  url?: string;
  verifiedOn?: string;
  validTill?: string;
}

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Renders a stored passage in the member's language.
 *
 * Corpus passages are authored in English and hand-translated into only some
 * languages, so this used to read `canned?.[lang] ?? chunk.text` — which
 * silently served English to anyone asking in a language without a stored
 * translation, and still reported it as an answer in their language. Order is:
 * stored translation, then a machine translation of the grounded English text,
 * then English clearly labelled as English.
 *
 * `answerLang` is the language the returned text is actually written in. It is
 * never assumed to equal the language asked in.
 */
async function renderInLanguage(
  chunk: Chunk,
  lang: LangCode
): Promise<{ text: string; answerLang: LangCode; translated: boolean }> {
  const stored = chunk.canned?.[lang];
  if (stored) return { text: stored, answerLang: lang, translated: false };

  const englishBody = chunk.canned?.en ?? chunk.text;

  if (lang !== "en") {
    const translated = await translatePassage(englishBody, lang);
    if (translated) return { text: translated, answerLang: lang, translated: true };
  }

  return { text: englishBody, answerLang: "en", translated: false };
}

/**
 * The fields the trust verdict is recomputed from.
 *
 * Carried rather than the whole chunk: the chunk holds the embedded English
 * body and every alias in six scripts, none of which belongs in an HTTP
 * response served to a kiosk on a village 3G link.
 */
function passageIdentity(chunk: Chunk) {
  return {
    passageId: chunk.id,
    url: chunk.url,
    verifiedOn: chunk.verifiedOn,
    validTill: chunk.validTill,
  };
}

interface AskBody {
  question?: string;
  lang?: LangCode;
  /** Member's state, so state schemes from elsewhere are not surfaced. */
  state?: string;
  /**
   * 'voice' when the answer is going to a speaker rather than a screen.
   *
   * The kiosk and the telephone line cannot show a paragraph; they read it
   * out once, at speaking pace. Asked for on the request rather than inferred
   * from a user-agent, because the caller is the only thing that actually
   * knows where its answer ends up.
   */
  mode?: "screen" | "voice";
}

/**
 * Hybrid-RAG question answering.
 *
 * Retrieval always runs. Generation runs only when a Mistral key is present;
 * without one the route still returns the retrieved passage and its citation,
 * so the demo degrades to grounded-extractive instead of failing outright.
 */
export async function POST(req: NextRequest) {
  let body: AskBody;
  try {
    body = (await req.json()) as AskBody;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const question = body.question?.trim();
  const lang: LangCode = body.lang ?? "en";
  const memberState = body.state?.trim() || undefined;
  const mode = body.mode === "voice" ? "voice" : "screen";

  if (!question) {
    return Response.json({ error: "question is required" }, { status: 400 });
  }

  // Hello, thank you, goodbye, "what are you". Answered before retrieval,
  // because none of it is in the corpus and all of it used to come back as a
  // refusal plus a warning about people who ask for money — which is what a
  // member saw the first time they said namaste to the screen. Nothing here
  // asserts a rule or a figure, so the grounding contract is untouched: a
  // message with any substance in it does not match and goes to retrieval.
  const chat = smallTalkIntent(question);
  if (chat) {
    const { text, answerLang } = smallTalkReply(chat, lang);
    console.log(`[ask] q=${JSON.stringify(question)} lang=${lang} smalltalk=${chat}`);
    return Response.json({
      answer: text,
      answerLang,
      translated: false,
      escalate: false,
      agent: null,
      source: null,
      generated: false,
      // No passage, so no trust verdict: there is no document behind "hello"
      // and a badge claiming one was checked would be a lie about provenance.
      provenance: null,
      passageId: null,
      // The reply is already the whole spoken form. The free-service line is
      // written into the greeting and farewell copy itself rather than
      // appended, so it lands once, in a sentence that reads naturally.
      spokenAnswer: text,
      retrieval: { mode: "lexical" as const, semanticBackend: "none" as const, passages: [] },
      cached: false,
    });
  }

  // Fired, never awaited. This instance re-verifies the government sources for
  // itself every few hours so a document that changes between deployments is
  // caught without anyone doing anything — but a farmer standing at a counter
  // does not wait on seventeen government hosts to get an answer.
  void ensureFreshAlerts();

  // State is part of the key: the same question has a different correct answer
  // in Karnataka than in Tamil Nadu.
  const cacheKey = `${mode}::${memberState ?? "-"}::${questionKey(question, lang)}`;

  /**
   * Attaches the trust verdict and builds the spoken form of the answer.
   *
   * The spoken form is assembled here rather than in a client, because three
   * of the four channels this service answers on read their reply aloud and
   * one of them — the telephone line — has no screen to put a caveat on at
   * all. A member on an IVR call is the least able to check anything and the
   * most likely to be standing beside the person asking them for money. If
   * the caveat is not inside the sentence they hear, they never receive it.
   */
  const finalize = (payload: CachedAnswer, cached: boolean) => {
    if (!payload.answer || !payload.passageId) {
      // "I could not answer that" still carries the warning. It is the one
      // reply that used to go out bare, and it is the exact sentence the
      // intermediary is waiting for: the machine has just admitted it does not
      // know, and he is about to say that he does, for twenty thousand rupees.
      const provenance = escalationProvenance(lang);
      return Response.json({
        ...payload,
        provenance,
        spokenAnswer: [provenance.spokenNotice, provenance.spokenFreeService]
          .filter(Boolean)
          .join(" "),
        cached,
      });
    }

    const provenance: Provenance = assessPassage(
      {
        passageId: payload.passageId,
        source: payload.source ?? undefined,
        url: payload.url,
        verifiedOn: payload.verifiedOn,
        validTill: payload.validTill,
      },
      // Tag the caveat with the language the ANSWER came back in, not the one
      // asked in. An untranslated passage is served in English, and a Telugu
      // caveat spliced onto it would be read by the speech engine in a Telugu
      // voice halfway through an English sentence.
      payload.answerLang ?? lang
    );

    // The free-service line closes every spoken answer, fresh or not. It is
    // the one sentence that defeats the fraud this service is built against,
    // it costs about twelve words, and there is no way to detect in advance
    // which caller is the one about to hand over twenty thousand rupees.
    const spokenAnswer = [payload.answer, provenance.spokenNotice, provenance.spokenFreeService]
      .filter(Boolean)
      .join(" ");

    return Response.json({ ...payload, provenance, spokenAnswer, cached });
  };

  const cachedAnswer = answerCache.get(cacheKey);
  if (cachedAnswer) return finalize(cachedAnswer, true);

  const respond = (payload: CachedAnswer) => {
    answerCache.set(cacheKey, payload);
    return finalize(payload, false);
  };

  const { results, usedSemantic, semanticBackend } = await retrieve(question, 4, memberState);
  const grounded = hasUsableContext(results);

  // The grounding decision, made visible. A question that escalates because the
  // transcript was garbled looks exactly like one that escalates because the
  // corpus lacks the answer — this prints which it was.
  const best = results[0];
  console.log(
    `[ask] q=${JSON.stringify(question)} lang=${lang} state=${memberState ?? "-"} grounded=${grounded} ` +
      `top=${best?.chunk.id ?? "none"} sim=${best?.similarity?.toFixed(3) ?? "n/a"} ` +
      `backend=${semanticBackend}`
  );

  const retrievalMeta = {
    mode: usedSemantic ? ("hybrid" as const) : ("lexical" as const),
    semanticBackend,
    passages: results.map((r) => ({
      id: r.chunk.id,
      source: r.chunk.source,
      score: Number(r.score.toFixed(5)),
      lexicalRank: r.lexicalRank,
      semanticRank: r.semanticRank,
      similarity: r.similarity === null ? null : Number(r.similarity.toFixed(4)),
    })),
  };

  // Nothing retrieved above the confidence floor — refuse and escalate.
  if (!grounded) {
    return respond({
      answer: null,
      answerLang: null,
      escalate: true,
      agent: results[0]?.chunk.agent ?? null,
      source: null,
      generated: false,
      retrieval: retrievalMeta,
      passageId: null,
    });
  }

  const top = results[0];

  if (!hasMistralKey()) {
    const rendered = await renderInLanguage(top.chunk, lang);
    return respond({
      answer: rendered.text,
      answerLang: rendered.answerLang,
      translated: rendered.translated,
      escalate: false,
      agent: top.chunk.agent,
      source: top.chunk.source,
      generated: false,
      retrieval: retrievalMeta,
      ...passageIdentity(top.chunk),
    });
  }

  try {
    const { text, insufficient, citedIndex } = await generateAnswer(
      question,
      lang,
      results,
      { mode }
    );

    if (insufficient) {
      return respond({
        answer: null,
        answerLang: null,
        escalate: true,
        agent: top.chunk.agent,
        source: null,
        generated: true,
        retrieval: retrievalMeta,
        passageId: null,
      });
    }

    // Prefer the passage the model cited over the merely top-ranked one.
    const cited = citedIndex !== null ? results[citedIndex] : top;

    return respond({
      answer: text,
      // The system prompt pins the reply language, so a generated answer is in
      // the language the member used.
      answerLang: lang,
      translated: false,
      escalate: false,
      agent: cited.chunk.agent,
      source: cited.chunk.source,
      generated: true,
      retrieval: retrievalMeta,
      // The cited passage, not the top-ranked one. The trust verdict has to
      // describe the document the answer was actually drawn from, or an
      // answer taken from a doubted passage inherits a fresh passage's badge.
      ...passageIdentity(cited.chunk),
    });
  } catch (err) {
    console.error("[ask] generation failed:", err);
    // Retrieval succeeded, so serve the grounded passage rather than an error.
    // Not cached: this is a degraded answer produced by a failure, and it must
    // not be handed to the next member as though it were the normal one.
    const rendered = await renderInLanguage(top.chunk, lang);
    return finalize(
      {
        answer: rendered.text,
        answerLang: rendered.answerLang,
        translated: rendered.translated,
        escalate: false,
        agent: top.chunk.agent,
        source: top.chunk.source,
        generated: false,
        degraded: true,
        retrieval: retrievalMeta,
        ...passageIdentity(top.chunk),
      },
      false
    );
  }
}
