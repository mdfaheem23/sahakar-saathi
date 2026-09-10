import { NextRequest } from "next/server";
import { retrieve, hasUsableContext } from "@/lib/rag/hybrid";
import { streamAnswer, extractCitation } from "@/lib/rag/generate";
import { LangCode } from "@/lib/types";
import { assessPassage, escalationProvenance } from "@/lib/sources/freshness";
import { ensureFreshAlerts } from "@/lib/sources/live";
import { smallTalkIntent, smallTalkReply } from "@/lib/rag/smalltalk";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * The spoken answer, emitted sentence by sentence as it is written.
 *
 * /api/ask cannot serve a speaker well, and the reason is arithmetic rather
 * than style: it returns one JSON body, so the kiosk cannot synthesize a word
 * of it until the last word is written. Measured on the board, that was ~6s of
 * silence after the question ended, before any sound at all.
 *
 * Here the answer leaves as it is generated. The kiosk starts synthesizing
 * sentence one while sentence two is still being written, and starts speaking
 * while sentence two is still being synthesized - so the first sound arrives
 * about a sentence after generation starts rather than a paragraph after.
 *
 * NDJSON rather than SSE because the only consumers are a Python host and the
 * firmware that replaces it, and neither wants an EventSource; one JSON object
 * per line is the cheapest thing to parse on a device.
 *
 *   {"type":"say","text":"..."}     a sentence, ready to speak, in order
 *   {"type":"done", ...}            provenance, and the caveat to speak last
 *   {"type":"escalate", ...}        nothing grounded; speak the tail only
 *   {"type":"error","message":...}
 */

/** Sentence and clause breaks, matching the host's splitter. */
const SENTENCE_ENDS = "।॥.!?";
const CLAUSE_BREAKS = ",;:،॰";
const MIN_FIRST = 50;
const MIN_NEXT = 100;

/**
 * Hard ceiling on the opening piece, in characters.
 *
 * The minimums above only say when a break is allowed to count; they cannot
 * conjure one. This model writes Hindi sentences of 150 characters with no
 * comma anywhere in them, and waiting for the full stop put 9.1 seconds of
 * audio in the first piece and 8.1 seconds of silence in front of it.
 *
 * So past this length the opening is cut at the last word boundary, break or
 * no break. It is a mid-sentence cut and it does sound like one - a breath
 * where the speaker would not have taken one - and that is a better thing to
 * hear than eight seconds of nothing while a farmer wonders if the machine
 * is broken.
 *
 * Not as small as it could be, though. The opening plays while the next piece
 * is synthesized, so an opening too short cannot cover its successor and the
 * hole simply moves from the front of the answer into the middle of it - a
 * 38-character opening (2.4s) against a 192-character follower (3.4s to
 * synthesize) is a second of silence mid-sentence. Half a second later to
 * start is worth a reply that does not stall once it has.
 */
const MAX_FIRST = 100;

/**
 * Ceiling on every later piece too, for a different reason than the opening.
 *
 * Each piece is synthesized while the previous one plays, so what has to hold
 * is that playing piece N lasts longer than synthesizing piece N+1. TTS runs
 * at roughly 0.37x real time, so a piece can safely cover a successor about
 * 2.7x its own length - and no further.
 *
 * Measured breaking that: a 34-character opening (2.4s of audio) followed by
 * a 194-character second piece (3.0s to synthesize) left 1.5 seconds of
 * silence in the middle of the answer, which sounds worse than the delay it
 * was bought with. Capping length caps synthesis time, which is what keeps
 * the seam closed.
 *
 * Set high because it is a last resort, not the usual path: a cut here lands
 * at a word boundary rather than a pause, and in Tamil - agglutinative, so
 * 120 characters is barely a clause - that chopped sentences mid-phrase and
 * left orphan fragments the speech engine read with a full stop after them.
 * Clause breaks below do the ordinary splitting; this only stops a runaway.
 */
const MAX_NEXT = 220;

/** Cuts at the last word boundary at or before `limit`. */
function cutAtWord(buf: string, limit: number): [string, string] {
  const window = buf.slice(0, limit);
  const space = window.lastIndexOf(" ");
  const at = space > limit / 2 ? space : limit;
  return [buf.slice(0, at).trim(), buf.slice(at).replace(/^\s+/, "")];
}

/** SOURCE: [2] and its variants. Stripped before anything is spoken aloud. */
const CITATION = /\n*\s*SOURCE\s*:\s*\[?\s*\d+(?:\s*,\s*\d+)*\s*\]?\s*\.?/gi;

/**
 * A citation with the word dropped - just "[1]", trailing.
 *
 * The model is not consistent about the form it was asked for: it usually
 * writes "SOURCE: [1]", and sometimes only "[1]". The bare form defeats every
 * guard keyed on the word, and was read out to a farmer as a one-word
 * sentence after an otherwise correct answer about crop insurance.
 */
const BARE_CITATION = /\s*\[\s*\d+(?:\s*,\s*\d+)*\s*\]\s*\.?\s*$/;

/** Everything that must never reach the speaker, removed from one piece. */
function stripCitations(text: string): string {
  return text.replace(CITATION, "").replace(BARE_CITATION, "").trim();
}

/**
 * Splits off the leading speakable piece, or "" if there is not one yet.
 *
 * Never decides on the final character: mid-stream it is not yet known what
 * follows, and "6," looks exactly like a clause ending until the "000"
 * arrives in the next token.
 */
function takePiece(buf: string, minimum: number, clauses: boolean): [string, string] {
  const breaks = clauses ? SENTENCE_ENDS + CLAUSE_BREAKS : SENTENCE_ENDS;
  for (let i = 0; i < buf.length; i++) {
    const ch = buf[i];
    if (!breaks.includes(ch)) continue;
    if (i + 1 >= buf.length) break;
    if ((ch === "." || ch === ",") && /\d/.test(buf[i + 1])) continue;
    if (i + 1 >= minimum) {
      return [buf.slice(0, i + 1).trim(), buf.slice(i + 1).replace(/^\s+/, "")];
    }
  }
  return ["", buf];
}

interface StreamBody {
  question?: string;
  lang?: LangCode;
  state?: string;
}

export async function POST(req: NextRequest) {
  let body: StreamBody;
  try {
    body = (await req.json()) as StreamBody;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const question = body.question?.trim();
  const lang: LangCode = body.lang ?? "en";
  const memberState = body.state?.trim() || undefined;
  if (!question) {
    return Response.json({ error: "question is required" }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));

      try {
        // Greetings never reach retrieval, and the reply is already whole.
        const chat = smallTalkIntent(question);
        if (chat) {
          const { text } = smallTalkReply(chat, lang);
          send({ type: "say", text });
          send({ type: "done", provenance: null, passageId: null, spokenTail: "" });
          return;
        }

        void ensureFreshAlerts();

        // Timed because the two halves fail differently and a single total
        // hides which: slow retrieval is an embedding or index problem, slow
        // first token is the model.
        const t0 = Date.now();
        const { results } = await retrieve(question, 4, memberState);
        const tRetrieved = Date.now();
        if (!hasUsableContext(results)) {
          // The refusal still carries the warning: this is the exact sentence
          // an intermediary waits for, because the machine has just admitted
          // it does not know and he is about to say that he does.
          const prov = escalationProvenance(lang);
          send({
            type: "escalate",
            provenance: prov,
            spokenTail: [prov.spokenNotice, prov.spokenFreeService].filter(Boolean).join(" "),
          });
          return;
        }

        const top = results[0];
        let buf = "";
        let spoken = 0;
        let full = "";
        let insufficient = false;
        let citationSeen = false;

        for await (const delta of streamAnswer(question, lang, results, { mode: "voice" })) {
          full += delta;
          if (full.includes("INSUFFICIENT_CONTEXT")) {
            insufficient = true;
            break;
          }
          buf += delta;

          /*
           * Cut the citation off before anything is split or spoken.
           *
           * The marker always terminates the answer, so the first sight of it
           * ends the spoken text - everything after belongs to `full`, which
           * extractCitation reads at the end, and to nobody else.
           *
           * Truncating here rather than stripping from each finished piece,
           * because stripping was not enough: ':' is a clause break, so the
           * splitter divided the buffer inside "SOURCE:" before its digits
           * had streamed in, and the strip pattern needs those digits to
           * match. The board read "SOURCE:" and then "[1]" aloud to a farmer
           * as two separate sentences.
           *
           * The partial guard covers the other half of the same race - a
           * delta ending mid-marker, where the whole word is not there yet.
           */
          const marker = buf.search(/\n*\s*SOURCE\s*:/i);
          if (marker >= 0) {
            buf = buf.slice(0, marker);
            citationSeen = true;
          }
          if (citationSeen) {
            // Everything from here on is citation, not answer.
            continue;
          }

          // Anchored on a boundary: without it the bare "S" alternative
          // matches the last letter of any ordinary word ending in s -
          // "documents", "guidelines" - and holds back the rest of a perfectly
          // good sentence forever.
          const guard = buf.search(
            /(?:^|\s)(?:S|SO|SOU|SOUR|SOURC|SOURCE)\s*:?\s*\[?[\d,\s]*\]?\s*$|\[[\d,\s]*$/i
          );
          const safe = guard >= 0 ? buf.slice(0, guard) : buf;
          const held = guard >= 0 ? buf.slice(guard) : "";

          let rest = safe;
          for (;;) {
            let [piece, remainder] = takePiece(
              rest,
              spoken === 0 ? MIN_FIRST : MIN_NEXT,
              true
            );
            // No break in sight and the opening is already long: cut it anyway
            // rather than let the speaker stay silent for another sentence.
            const cap = spoken === 0 ? MAX_FIRST : MAX_NEXT;
            if (!piece && rest.length > cap) {
              [piece, remainder] = cutAtWord(rest, cap);
            }
            if (!piece) break;
            const clean = stripCitations(piece);
            if (clean) {
              if (spoken === 0) {
                console.log(
                  `[stream] retrieval ${tRetrieved - t0}ms, first sentence ` +
                    `${Date.now() - tRetrieved}ms after it (${Date.now() - t0}ms total)`
                );
              }
              send({ type: "say", text: clean });
              spoken++;
            }
            rest = remainder;
          }
          buf = rest + held;
        }

        if (insufficient) {
          const prov = escalationProvenance(lang);
          send({
            type: "escalate",
            provenance: prov,
            spokenTail: [prov.spokenNotice, prov.spokenFreeService].filter(Boolean).join(" "),
          });
          return;
        }

        const tail = stripCitations(buf);
        if (tail) send({ type: "say", text: tail });

        // The passage the model cited, not merely the top-ranked one.
        //
        // These are often different, and using the wrong one is not cosmetic:
        // the verdict has to describe the document the answer was actually
        // drawn from, or an answer taken from an undated passage inherits a
        // fresh one's badge - and a member is told a figure was checked
        // against a document that had nothing to do with it. Observed on the
        // board: a crop-insurance answer cited to the Cooperative Societies
        // Act sections on member rights.
        const { citedIndex } = extractCitation(full, results.length);
        const cited = citedIndex !== null ? results[citedIndex] : top;

        // The verdict and the caveat come last, once the passage behind the
        // answer is known. The free-service line closes every spoken answer:
        // twelve words, and there is no way to tell in advance which member is
        // the one about to hand over twenty thousand rupees.
        const prov = assessPassage(
          {
            passageId: cited.chunk.id,
            source: cited.chunk.source,
            url: cited.chunk.url,
            verifiedOn: cited.chunk.verifiedOn,
            validTill: cited.chunk.validTill,
          },
          lang
        );
        send({
          type: "done",
          provenance: prov,
          passageId: cited.chunk.id,
          source: cited.chunk.source,
          spokenTail: [prov.spokenNotice, prov.spokenFreeService].filter(Boolean).join(" "),
        });
      } catch (err) {
        console.error("[ask/stream]", err);
        send({ type: "error", message: err instanceof Error ? err.message : "failed" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      // Nothing may sit on this: a proxy that buffers the body to measure it
      // gives back exactly the all-at-once behaviour this route exists to end.
      "X-Accel-Buffering": "no",
    },
  });
}
