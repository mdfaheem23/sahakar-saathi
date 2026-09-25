"use client";

import { useCallback, useMemo, useState } from "react";
import { routeQuery } from "./router";
import { logQuery } from "./storage";
import { ChatMessage, LangCode, AgentId } from "./types";
import { tLang } from "./i18n";
import { detectLanguage } from "./detectLang";
import { useDistrict } from "./DistrictContext";
import { getDistrict } from "./districtData";
import { stateCodeFromName } from "./rag/stateSchemes";
import { assessPassage, escalationProvenance, type Provenance } from "./sources/freshness";
import { rejectionCount } from "./storage";

let msgCounter = 0;
function nextId() {
  msgCounter += 1;
  return `m${Date.now()}${msgCounter}`;
}

export interface RetrievalMeta {
  mode: "hybrid" | "lexical";
  /** Which vector store served the dense half — or that none did. */
  semanticBackend?: "pgvector" | "in-process" | "none";
  passages: {
    id: string;
    source: string;
    score: number;
    lexicalRank: number | null;
    semanticRank: number | null;
  }[];
}

interface AskResponse {
  answer: string | null;
  /**
   * Language the answer text is actually written in — not necessarily the one
   * asked in. Null when there is no answer text (escalation).
   */
  answerLang?: LangCode | null;
  /** True when the text was machine-translated from the stored English. */
  translated?: boolean;
  escalate: boolean;
  agent: AgentId | null;
  source: string | null;
  generated: boolean;
  degraded?: boolean;
  /** Trust verdict, recomputed server-side on every response. */
  provenance?: Provenance | null;
  /** Corpus passage the answer rests on, for the printed receipt. */
  passageId?: string | null;
  /** The answer with its caveat and the free-service line folded in. */
  spokenAnswer?: string | null;
  retrieval: RetrievalMeta;
}

export function useChatEngine(lang: LangCode, channel: "app" | "web" | "kiosk") {
  // The member's state, taken from the district they already selected. Sent
  // with every question so a Thanjavur member is not answered with Karnataka's
  // 0% crop loan, which is a real scheme — just not theirs.
  const { districtId } = useDistrict();
  const memberState = stateCodeFromName(getDistrict(districtId)?.state);
  // Only the conversation itself is state. The greeting is derived, because
  // it has to follow the member's language: it used to be seeded once in a
  // useState initialiser, but the stored language is applied after that first
  // render, so the assistant opened with an English greeting under a Tamil
  // interface — and the kiosk read it aloud in an English voice.
  const [conversation, setConversation] = useState<ChatMessage[]>([]);

  const greeting = useMemo<ChatMessage>(() => {
    const { text, lang: spokenLang } = tLang("welcomeMsg", lang);
    return {
      id: "greeting",
      role: "assistant",
      text,
      lang: spokenLang,
      // Constant rather than a clock read: the greeting always precedes the
      // conversation, and deriving it during render must stay pure.
      timestamp: 0,
    };
  }, [lang]);

  const messages = useMemo(() => [greeting, ...conversation], [greeting, conversation]);
  const [pending, setPending] = useState(false);
  const [retrieval, setRetrieval] = useState<RetrievalMeta | null>(null);


  /**
   * Sends the question to the hybrid-RAG endpoint. If that call fails outright
   * (offline kiosk, API down) we fall back to the on-device keyword router so
   * the member still gets a grounded answer rather than an error.
   */
  const ask = useCallback(
    async (rawText: string, detected?: LangCode): Promise<ChatMessage | null> => {
      const text = rawText.trim();
      if (!text) return null;

      // Answer in the language the member actually used, not the one the UI
      // happens to be set to. Speech supplies `detected`; typed input is
      // classified by script here.
      const replyLang: LangCode = detected ?? detectLanguage(text, lang);

      const userMsg: ChatMessage = {
        id: nextId(),
        role: "user",
        text,
        lang: replyLang,
        timestamp: Date.now(),
      };
      setConversation((prev) => [...prev, userMsg]);
      setPending(true);

      let assistantMsg: ChatMessage;

      try {
        const res = await fetch("/api/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: text, lang: replyLang, state: memberState }),
        });
        if (!res.ok) throw new Error(`ask failed: ${res.status}`);
        const data = (await res.json()) as AskResponse;
        setRetrieval(data.retrieval);

        if (data.escalate || !data.answer) {
          // The escalation notice is interface copy, so it exists only in the
          // languages it has been translated into. Tag it with the language it
          // really came back in so it is spoken with the matching voice.
          const notice = tLang("escalateMsg", replyLang);
          // Tagged with the language the notice actually came back in, so the
          // caveat is spoken in the same voice as the sentence it follows.
          const provenance = data.provenance ?? escalationProvenance(notice.lang);
          assistantMsg = {
            id: nextId(),
            role: "assistant",
            text: notice.text,
            lang: notice.lang,
            agent: data.agent ?? undefined,
            provenance,
            spokenText: [notice.text, provenance.spokenNotice, provenance.spokenFreeService]
              .filter(Boolean)
              .join(" "),
            escalated: true,
            timestamp: Date.now(),
          };
        } else {
          // The server does not know what this counter has been refusing, so
          // the verdict is re-checked against what members reported here. It
          // can only ever be made worse: `assessPassage` ranks a refusal above
          // every document signal, and nothing in this path can clear one.
          const answerLang = data.answerLang ?? replyLang;
          const rejections = data.passageId ? rejectionCount(data.passageId) : 0;
          const provenance =
            rejections > 0 && data.passageId
              ? assessPassage(
                  {
                    passageId: data.passageId,
                    source: data.source ?? undefined,
                    verifiedOn: data.provenance?.verifiedOn,
                    validTill: data.provenance?.validTill,
                    fieldRejections: rejections,
                  },
                  answerLang
                )
              : (data.provenance ?? undefined);

          assistantMsg = {
            id: nextId(),
            role: "assistant",
            text: data.answer,
            // Trust the server's report of what language the text is in. A
            // stored passage with no translation comes back in English, and
            // labelling that as Telugu would have the speech engine read
            // English words with a Telugu voice.
            lang: data.answerLang ?? replyLang,
            agent: data.agent ?? undefined,
            source: data.source ?? undefined,
            provenance,
            passageId: data.passageId ?? undefined,
            spokenText:
              rejections > 0 && provenance
                ? [data.answer, provenance.spokenNotice, provenance.spokenFreeService]
                    .filter(Boolean)
                    .join(" ")
                : (data.spokenAnswer ?? undefined),
            generated: data.generated,
            translated: data.translated,
            timestamp: Date.now(),
          };
        }

        logQuery({
          id: nextId(),
          agent: assistantMsg.agent ?? "grievance",
          lang: replyLang,
          resolved: !data.escalate,
          channel,
          timestamp: Date.now(),
        });
      } catch {
        // Offline / server unreachable — on-device retrieval.
        const local = routeQuery(text, replyLang);
        if (local.matched && local.entry) {
          // Offline there is no translation service to fall back on, so an
          // untranslated entry is served in English and labelled as English
          // rather than mislabelled as the member's language.
          const stored = local.entry.answer[replyLang];
          const answerText = stored ?? local.entry.answer.en;
          const answerLang = stored ? replyLang : "en";

          // A kiosk that could not reach the server could not check anything,
          // so it says so. This is the case an offline cache quietly gets
          // wrong: the answer it holds was true when it was cached, the screen
          // has no way to know whether it still is, and the member has no way
          // to tell a cached answer from a live one. A disconnected machine
          // that still looks authoritative is the exact object a fraud needs.
          const provenance = assessPassage(
            {
              passageId: `kb:${local.entry.id}`,
              source: local.entry.source,
              offline: true,
            },
            answerLang
          );

          assistantMsg = {
            id: nextId(),
            role: "assistant",
            text: answerText,
            lang: answerLang,
            agent: local.entry.agent,
            source: local.entry.source,
            provenance,
            spokenText: [answerText, provenance.spokenNotice, provenance.spokenFreeService]
              .filter(Boolean)
              .join(" "),
            offline: true,
            timestamp: Date.now(),
          };
        } else {
          const notice = tLang("escalateMsg", replyLang);
          // Offline and unable to answer is the weakest the service ever is,
          // so it is where the free-service warning matters most.
          const provenance = escalationProvenance(notice.lang);
          assistantMsg = {
            id: nextId(),
            role: "assistant",
            text: notice.text,
            lang: notice.lang,
            agent: local.agent ?? undefined,
            provenance,
            spokenText: [notice.text, provenance.spokenNotice, provenance.spokenFreeService]
              .filter(Boolean)
              .join(" "),
            escalated: true,
            offline: true,
            timestamp: Date.now(),
          };
        }

        logQuery({
          id: nextId(),
          agent: assistantMsg.agent ?? "grievance",
          lang: replyLang,
          resolved: !!local.matched,
          channel,
          timestamp: Date.now(),
        });
      }

      setConversation((prev) => [...prev, assistantMsg]);
      setPending(false);
      return assistantMsg;
    },
    [lang, channel, memberState]
  );

  const reset = useCallback(() => {
    setRetrieval(null);
    setConversation([]);
  }, []);

  return { messages, ask, reset, pending, retrieval };
}
