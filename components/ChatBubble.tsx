import AgentBadge from "./AgentBadge";
import ProvenanceNote from "./ProvenanceNote";
import RejectionButton from "./RejectionButton";
import { ChatMessage, LangCode } from "@/lib/types";
import { t } from "@/lib/i18n";
import { Volume2, Square } from "lucide-react";

export default function ChatBubble({
  msg,
  onSpeak,
  speaking = false,
  onStopSpeaking,
}: {
  msg: ChatMessage;
  onSpeak?: (text: string) => void;
  speaking?: boolean;
  onStopSpeaking?: () => void;
}) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
          isUser
            ? "rounded-br-sm bg-forest-700 text-white"
            : "rounded-bl-sm border border-line bg-surface text-ink"
        }`}
      >
        {!isUser && msg.agent && (
          <div className="mb-1.5">
            <AgentBadge agent={msg.agent} lang={msg.lang as LangCode} />
          </div>
        )}
        <p className="whitespace-pre-wrap">{msg.text}</p>
        {/* The dated verdict replaces the bare source line. A citation without
            a date says only that a document exists, which is exactly what an
            outdated answer also says. */}
        {!isUser && msg.provenance && <ProvenanceNote provenance={msg.provenance} />}
        {/* The one signal that comes from reality rather than from a document.
            Offered on every answer, because the member who was just refused is
            about to walk out and never tell anyone. */}
        {!isUser && msg.passageId && (
          <RejectionButton passageId={msg.passageId} lang={msg.lang} />
        )}
        {!isUser && !msg.provenance && msg.source && (
          <p className="mt-2 border-t border-line/70 pt-1.5 text-[11px] text-ink-faint">
            {t("source", msg.lang)}: {msg.source}
          </p>
        )}
        {!isUser && msg.escalated && (
          <p className="mt-2 text-[11px] font-medium text-rose-600">
            ⚠ {t("escalated", msg.lang)}
          </p>
        )}
        {!isUser && onSpeak && (
          <button
            onClick={() =>
              speaking && onStopSpeaking ? onStopSpeaking() : onSpeak(msg.spokenText ?? msg.text)
            }
            className={`mt-2 flex items-center gap-1 text-[11px] font-medium ${
              speaking ? "text-clay-600" : "text-forest-600 hover:text-forest-800"
            }`}
          >
            {speaking ? <Square size={11} /> : <Volume2 size={12} />}
            {speaking ? t("stopReply", msg.lang) : t("listenReply", msg.lang)}
          </button>
        )}
      </div>
    </div>
  );
}
