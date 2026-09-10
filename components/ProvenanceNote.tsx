import { ShieldCheck, ShieldAlert, ShieldX, ExternalLink, BadgeIndianRupee } from "lucide-react";
import type { Provenance, TrustTier } from "@/lib/sources/freshness";

/**
 * The trust verdict, as a screen renders it.
 *
 * Deliberately not the whole story. The same verdict is also spoken on the
 * kiosk and the telephone line and printed on the receipt, and this component
 * is only the visual third of that — which is why it takes a `Provenance`
 * computed elsewhere rather than working anything out itself. Three surfaces
 * that each decided for themselves how stale an answer was would eventually
 * disagree, and the member holding the printout would have no way to tell
 * which one to believe.
 *
 * The date is the point. An undated claim on a government-looking screen is
 * the instrument of the fraud this service exists to stop: it is what an agent
 * shows a farmer to prove a lapsed scheme is still running. A dated one, with
 * the document named beside it, is evidence the farmer can take to the office.
 */
const TIER_STYLE: Record<
  TrustTier,
  { icon: typeof ShieldCheck; wrap: string; accent: string; label: string }
> = {
  verified: {
    icon: ShieldCheck,
    wrap: "border-line bg-surface",
    accent: "text-forest-700",
    label: "text-ink-soft",
  },
  unconfirmed: {
    icon: ShieldAlert,
    wrap: "border-amber-400/70 bg-amber-50",
    accent: "text-amber-700",
    label: "text-amber-900",
  },
  expired: {
    icon: ShieldX,
    wrap: "border-rose-300 bg-rose-50",
    accent: "text-rose-700",
    label: "text-rose-900",
  },
};

export default function ProvenanceNote({
  provenance,
  compact = false,
}: {
  provenance: Provenance;
  /** Kiosk cards are height-constrained; drop to one line there. */
  compact?: boolean;
}) {
  const style = TIER_STYLE[provenance.tier];
  const Icon = style.icon;
  const isFresh = provenance.tier === "verified";

  return (
    <div className={`mt-2 rounded-xl border px-3 py-2 ${style.wrap}`}>
      <div className="flex items-start gap-2">
        <Icon size={compact ? 13 : 14} className={`mt-0.5 shrink-0 ${style.accent}`} />
        <div className="min-w-0 flex-1">
          <p className={`text-[11px] font-semibold leading-snug ${style.label}`}>
            {provenance.label}
          </p>
          {/* The sentence, not just the badge. A colour tells a member who has
              seen this screen before that something is different; it does not
              tell a member seeing it for the first time what to do about it. */}
          <p className={`mt-0.5 text-[11px] leading-relaxed ${isFresh ? "text-ink-faint" : style.label}`}>
            {provenance.notice}
          </p>

          {provenance.source && (
            <p className="mt-1 text-[10px] leading-relaxed text-ink-faint">
              {provenance.source}
              {provenance.url && (
                <>
                  {" "}
                  <a
                    href={provenance.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 font-medium text-forest-700 underline underline-offset-2"
                  >
                    <ExternalLink size={9} />
                  </a>
                </>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Always shown, on every answer, fresh or not. Every fraud this service
          is built against ends with money changing hands for something the
          state gives away free, and there is no way to know in advance which
          member is the one about to hand it over. */}
      {!compact && (
        <p className="mt-2 flex items-start gap-1.5 border-t border-line/60 pt-1.5 text-[10px] leading-relaxed font-medium text-forest-800">
          <BadgeIndianRupee size={11} className="mt-px shrink-0" />
          {provenance.freeService}
        </p>
      )}
    </div>
  );
}
