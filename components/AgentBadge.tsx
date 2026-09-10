import { AGENT_LABELS } from "@/lib/router";
import { AgentId, LangCode } from "@/lib/types";

const AGENT_COLORS: Record<AgentId, string> = {
  cooperative_law: "bg-indigo-100 text-indigo-800 border-indigo-200",
  schemes: "bg-amber-100 text-amber-800 border-amber-200",
  pmfby: "bg-emerald-100 text-emerald-800 border-emerald-200",
  grievance: "bg-rose-100 text-rose-800 border-rose-200",
};

export default function AgentBadge({ agent, lang }: { agent: AgentId; lang: LangCode }) {
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${AGENT_COLORS[agent]}`}
    >
      {AGENT_LABELS[agent][lang] ?? AGENT_LABELS[agent].en}
    </span>
  );
}
