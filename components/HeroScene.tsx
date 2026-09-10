"use client";

import Link from "next/link";
import { useRef } from "react";
import { useRouter } from "next/navigation";
import {
  gsap,
  ScrollTrigger,
  useIsomorphicLayoutEffect,
  prefersReducedMotion,
} from "@/lib/motion";
import { Smartphone, MonitorSmartphone } from "lucide-react";

/**
 * The narrative hero: one member, two channels.
 *
 * He starts standing in the field with a phone in his hand. As the section
 * scrolls, the scene crosses over — he is sitting at the PACS counter working
 * the same assistant on a desktop. The point being made is that this is one
 * continuous service, not two products.
 *
 * Both devices are clickable and open the live assistant.
 *
 * Drawn as SVG rather than composited from images so it stays crisp, weighs
 * nothing, and can be animated part-by-part.
 */

const SKIN = "#d59a63";
const SKIN_DARK = "#b87f4c";

export default function HeroScene() {
  const root = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useIsomorphicLayoutEffect(() => {
    const el = root.current;
    if (!el) return;

    const reduced = prefersReducedMotion();

    const ctx = gsap.context(() => {
      if (reduced) {
        // No scroll choreography and no idle motion — the scene rests on the
        // opening station. Both channels stay reachable through the links
        // underneath, so nothing is lost by not animating.
        gsap.set("[data-pose='phone']", { opacity: 1, pointerEvents: "auto" });
        gsap.set("[data-pose='desk']", { opacity: 0, pointerEvents: "none" });
        gsap.set("[data-caption='phone']", { opacity: 1 });
        gsap.set("[data-caption='desk']", { opacity: 0 });
        return;
      }

      /* ---------- idle life, independent of scroll ---------- */

      gsap.to("[data-breathe]", {
        y: -3,
        duration: 2.4,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      gsap.to("[data-thumb]", {
        y: -4,
        duration: 0.55,
        repeat: -1,
        yoyo: true,
        ease: "power1.inOut",
      });

      gsap.to("[data-typing] circle", {
        opacity: 1,
        duration: 0.4,
        repeat: -1,
        yoyo: true,
        stagger: 0.16,
        ease: "sine.inOut",
      });

      gsap.utils.toArray<SVGElement>("[data-float]").forEach((n, i) => {
        gsap.to(n, {
          y: -10,
          duration: 2.6 + i * 0.5,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          delay: i * 0.35,
        });
      });

      gsap.to("[data-caret]", {
        opacity: 0,
        duration: 0.5,
        repeat: -1,
        yoyo: true,
        ease: "steps(1)",
      });

      // Both device targets breathe a halo so they read as tappable.
      gsap.to("[data-tap-ring]", {
        scale: 1.04,
        opacity: 0.12,
        transformOrigin: "50% 50%",
        duration: 1.6,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      /* ---------- the scroll crossover ---------- */

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: "[data-scene-track]",
          start: "top top",
          end: "bottom bottom",
          scrub: 0.5,
        },
      });

      // Hold on the phone for the first stretch, then hand over.
      tl.to("[data-pose='phone']", { opacity: 1, duration: 0.34 })
        .to("[data-pose='phone']", { opacity: 0, y: 26, scale: 0.94, duration: 0.2 })
        .to("[data-caption='phone']", { opacity: 0, y: -12, duration: 0.12 }, "<")
        .fromTo(
          "[data-pose='desk']",
          { opacity: 0, y: 34, scale: 0.94 },
          { opacity: 1, y: 0, scale: 1, duration: 0.24 },
          "-=0.06"
        )
        .fromTo(
          "[data-caption='desk']",
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 0.12 },
          "<"
        )
        .fromTo(
          "[data-screen-row]",
          { opacity: 0, x: -10 },
          { opacity: 1, x: 0, duration: 0.06, stagger: 0.04 },
          "-=0.1"
        )
        .to({}, { duration: 0.3 });

      // A faded-out pose still sits on top of the live one, so hit-testing has
      // to follow the crossover — otherwise the hidden device eats the click.
      ScrollTrigger.create({
        trigger: "[data-scene-track]",
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
          const onDesk = self.progress > 0.42;
          const phone = el.querySelector<SVGGElement>("[data-pose='phone']");
          const desk = el.querySelector<SVGGElement>("[data-pose='desk']");
          if (phone) phone.style.pointerEvents = onDesk ? "none" : "auto";
          if (desk) desk.style.pointerEvents = onDesk ? "auto" : "none";
        },
      });

      gsap.fromTo(
        "[data-progress-fill]",
        { scaleX: 0 },
        {
          scaleX: 1,
          transformOrigin: "0% 50%",
          ease: "none",
          scrollTrigger: {
            trigger: "[data-scene-track]",
            start: "top top",
            end: "bottom bottom",
            scrub: 0.5,
          },
        }
      );
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={root} className="relative">
      {/* Tall track gives the crossover room to play while the stage sticks. */}
      <div data-scene-track className="h-[230vh]">
        <div className="sticky top-0 flex h-screen min-h-[560px] flex-col items-center justify-center overflow-hidden">
          <div className="relative w-full max-w-5xl px-5">
            <svg
              viewBox="0 0 960 560"
              className="w-full"
              role="img"
              aria-label="A farmer using the assistant on a phone, then at a desk on the web"
            >
              <defs>
                <linearGradient id="hs-screen" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#123c30" />
                  <stop offset="100%" stopColor="#0a2a21" />
                </linearGradient>
                <linearGradient id="hs-desk" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#d8b489" />
                  <stop offset="100%" stopColor="#b98f61" />
                </linearGradient>
                <radialGradient id="hs-shadow">
                  <stop offset="0%" stopColor="rgba(18,33,28,0.22)" />
                  <stop offset="100%" stopColor="rgba(18,33,28,0)" />
                </radialGradient>
              </defs>

              {/* ============ POSE A — standing, on the phone ============ */}
              <g data-pose="phone" opacity="1">
                <ellipse cx="472" cy="516" rx="130" ry="20" fill="url(#hs-shadow)" />

                {/* His side of the conversation, floating free of the handset */}
                <g data-float style={{ pointerEvents: "none" }}>
                  <rect x="596" y="176" width="196" height="50" rx="14" fill="#ffffff" stroke="#e6e0d2" />
                  <rect x="614" y="193" width="118" height="7" rx="3.5" fill="#48584f" opacity="0.45" />
                  <rect x="614" y="207" width="74" height="7" rx="3.5" fill="#48584f" opacity="0.25" />
                </g>
                <g data-float style={{ pointerEvents: "none" }}>
                  <rect x="612" y="244" width="180" height="62" rx="14" fill="#0f5540" />
                  <rect x="630" y="262" width="108" height="7" rx="3.5" fill="#dcefe6" opacity="0.85" />
                  <rect x="630" y="276" width="144" height="7" rx="3.5" fill="#dcefe6" opacity="0.45" />
                  <rect x="630" y="290" width="62" height="7" rx="3.5" fill="#c99a1e" />
                </g>
                <g data-typing data-float style={{ pointerEvents: "none" }}>
                  <rect x="600" y="324" width="70" height="30" rx="15" fill="#ffffff" stroke="#e6e0d2" />
                  <circle cx="620" cy="339" r="4" fill="#147354" opacity="0.3" />
                  <circle cx="635" cy="339" r="4" fill="#147354" opacity="0.3" />
                  <circle cx="650" cy="339" r="4" fill="#147354" opacity="0.3" />
                </g>

                <g data-breathe style={{ pointerEvents: "none" }}>
                  {/* legs */}
                  <rect x="438" y="348" width="35" height="152" fill="#2f4a5c" />
                  <rect x="473" y="348" width="35" height="152" fill="#35576c" />
                  <rect x="428" y="496" width="48" height="16" rx="7" fill="#2a2f34" />
                  <rect x="472" y="496" width="48" height="16" rx="7" fill="#2a2f34" />

                  {/* kurta */}
                  <path d="M432 228c0-25 20-45 44-45s44 20 44 45l6 134H426z" fill="#147354" />
                  <path d="M470 184h12l-6 60-8-38z" fill="#0f5540" opacity="0.5" />

                  {/* arms bent forward around the handset */}
                  <path
                    d="M440 242c-18 34-20 70-6 100"
                    stroke="#1b9068"
                    strokeWidth="27"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <path
                    d="M512 242c18 34 20 70 6 100"
                    stroke="#1b9068"
                    strokeWidth="27"
                    strokeLinecap="round"
                    fill="none"
                  />

                  {/* head */}
                  <rect x="462" y="158" width="28" height="34" fill={SKIN_DARK} />
                  <circle cx="476" cy="140" r="40" fill={SKIN} />
                  <path
                    d="M436 136c0-25 18-43 40-43s40 18 40 43c-8-12-21-18-40-18s-32 6-40 18z"
                    fill="#1f2a26"
                  />
                  <circle cx="464" cy="150" r="3.4" fill="#1f2a26" />
                  <circle cx="490" cy="150" r="3.4" fill="#1f2a26" />
                  <path
                    d="M468 166q9 7 18 0"
                    stroke="#1f2a26"
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                  />
                </g>

                {/* ---- the handset opens the assistant ---- */}
                <g
                  aria-hidden="true"
                  className="cursor-pointer"
                  onClick={() => router.push("/chat")}
                >
                  <rect
                    data-tap-ring
                    x="430"
                    y="246"
                    width="92"
                    height="134"
                    rx="18"
                    fill="none"
                    stroke="#147354"
                    strokeWidth="2"
                    strokeDasharray="7 7"
                    opacity="0.3"
                  />
                  <g data-thumb>
                    <rect x="442" y="258" width="68" height="110" rx="11" fill="#1f2a26" />
                    <rect x="448" y="265" width="56" height="96" rx="7" fill="url(#hs-screen)" />
                    <rect x="453" y="272" width="30" height="5" rx="2.5" fill="#dcefe6" opacity="0.7" />
                    <rect x="463" y="285" width="36" height="14" rx="4" fill="#ffffff" opacity="0.13" />
                    <rect x="453" y="305" width="46" height="22" rx="5" fill="#1b9068" opacity="0.8" />
                    <rect x="458" y="311" width="26" height="4" rx="2" fill="#eef7f2" />
                    <rect x="458" y="319" width="34" height="4" rx="2" fill="#eef7f2" opacity="0.6" />
                    <circle cx="476" cy="345" r="9" fill="#c99a1e" />
                    <rect x="473.5" y="341" width="5" height="8" rx="2.5" fill="#0a3d2e" />
                    {/* hands gripping the corners, thumb resting on the glass */}
                    <ellipse cx="440" cy="352" rx="13" ry="11" fill={SKIN} />
                    <ellipse cx="512" cy="352" rx="13" ry="11" fill={SKIN} />
                    <ellipse
                      cx="497"
                      cy="333"
                      rx="8"
                      ry="14"
                      fill={SKIN}
                      transform="rotate(-22 497 333)"
                    />
                  </g>
                </g>
              </g>

              {/* ============ POSE B — seated, on the web ============ */}
              <g data-pose="desk" opacity="0" style={{ pointerEvents: "none" }}>
                <ellipse cx="500" cy="516" rx="240" ry="20" fill="url(#hs-shadow)" />

                {/* chair, drawn first so he sits in front of it */}
                <rect x="266" y="300" width="15" height="146" rx="7" fill="#4a5560" />
                <rect x="262" y="292" width="60" height="14" rx="7" fill="#5b6773" />
                <rect x="296" y="434" width="116" height="14" rx="6" fill="#5b6773" />
                <rect x="342" y="448" width="13" height="46" fill="#454f59" />
                <rect x="316" y="494" width="66" height="12" rx="6" fill="#3e4952" />

                <g data-breathe style={{ pointerEvents: "none" }}>
                  {/* thigh running right, under the desk; calf and foot below */}
                  <rect x="316" y="410" width="126" height="30" rx="12" fill="#2f4a5c" />
                  <rect x="414" y="424" width="28" height="76" fill="#35576c" />
                  <rect x="404" y="494" width="50" height="15" rx="7" fill="#2a2f34" />

                  {/* torso, leaning a little toward the screen */}
                  <path d="M304 302c0-24 19-43 42-43s42 19 42 43l8 122H298z" fill="#147354" />

                  {/* arm out to the keyboard */}
                  <path
                    d="M382 312c32 16 66 48 96 78"
                    stroke="#1b9068"
                    strokeWidth="25"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <ellipse cx="486" cy="396" rx="16" ry="11" fill={SKIN} />

                  {/* head, turned to the monitor */}
                  <rect x="330" y="234" width="28" height="32" fill={SKIN_DARK} />
                  <circle cx="344" cy="216" r="39" fill={SKIN} />
                  <path
                    d="M305 212c0-25 17-43 39-43s39 18 39 43c-8-12-20-18-39-18s-31 6-39 18z"
                    fill="#1f2a26"
                  />
                  <circle cx="360" cy="220" r="3.4" fill="#1f2a26" />
                  <circle cx="376" cy="218" r="3.4" fill="#1f2a26" />
                  <path
                    d="M360 236q10 6 17-2"
                    stroke="#1f2a26"
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                  />
                </g>

                {/* the desk, drawn over his lap so he reads as sitting at it */}
                <rect x="376" y="418" width="416" height="15" rx="6" fill="url(#hs-desk)" />
                <rect x="396" y="433" width="14" height="79" rx="5" fill="#a37f57" />
                <rect x="758" y="433" width="14" height="79" rx="5" fill="#a37f57" />
                <rect x="424" y="402" width="116" height="16" rx="5" fill="#e6e0d2" />
                <rect x="432" y="407" width="100" height="6" rx="3" fill="#c8c0ae" />
                <rect x="716" y="392" width="26" height="26" rx="5" fill="#ffffff" stroke="#e6e0d2" />
                <path
                  d="M742 399h9a7 7 0 0 1 0 13h-9"
                  fill="none"
                  stroke="#e6e0d2"
                  strokeWidth="3"
                />

                {/* ---- the monitor opens the assistant ---- */}
                <g
                  aria-hidden="true"
                  className="cursor-pointer"
                  onClick={() => router.push("/chat")}
                >
                  <rect
                    data-tap-ring
                    x="458"
                    y="178"
                    width="294"
                    height="196"
                    rx="20"
                    fill="none"
                    stroke="#147354"
                    strokeWidth="2"
                    strokeDasharray="8 8"
                    opacity="0.3"
                  />
                  <rect x="566" y="404" width="80" height="14" rx="5" fill="#39424a" />
                  <rect x="592" y="352" width="28" height="54" fill="#4a555f" />
                  <rect x="470" y="190" width="272" height="176" rx="14" fill="#1f2a26" />
                  <rect x="478" y="198" width="256" height="160" rx="9" fill="url(#hs-screen)" />

                  {/* browser chrome */}
                  <rect x="478" y="198" width="256" height="20" rx="9" fill="#ffffff" opacity="0.08" />
                  <circle cx="490" cy="208" r="3" fill="#e04b32" />
                  <circle cx="500" cy="208" r="3" fill="#c99a1e" />
                  <circle cx="510" cy="208" r="3" fill="#1b9068" />
                  <rect x="522" y="204" width="126" height="8" rx="4" fill="#ffffff" opacity="0.15" />

                  {/* sidebar */}
                  <rect x="486" y="226" width="46" height="124" rx="7" fill="#ffffff" opacity="0.07" />
                  <rect x="493" y="236" width="32" height="5" rx="2.5" fill="#dcefe6" opacity="0.5" />
                  <rect x="493" y="248" width="26" height="5" rx="2.5" fill="#dcefe6" opacity="0.28" />
                  <rect x="493" y="260" width="30" height="5" rx="2.5" fill="#dcefe6" opacity="0.28" />

                  {/* main column, typed in row by row as the scene settles */}
                  <rect data-screen-row x="542" y="228" width="98" height="9" rx="4" fill="#c99a1e" />
                  <rect data-screen-row x="542" y="246" width="180" height="26" rx="6" fill="#ffffff" opacity="0.1" />
                  <rect data-screen-row x="542" y="278" width="180" height="26" rx="6" fill="#ffffff" opacity="0.1" />
                  <rect data-screen-row x="542" y="310" width="180" height="26" rx="6" fill="#1b9068" opacity="0.6" />
                  <rect data-caret x="650" y="228" width="3" height="10" fill="#dcefe6" />
                </g>
              </g>
            </svg>

            {/* Captions sit in HTML so they stay real, translatable text. */}
            <div className="pointer-events-none relative mx-auto mt-2 h-16 max-w-lg text-center">
              <Caption
                kind="phone"
                icon={Smartphone}
                title="In the field, on his phone"
                body="Voice or text, in his own language, on the handset he already owns."
              />
              <Caption
                kind="desk"
                icon={MonitorSmartphone}
                title="At the PACS counter, on the web"
                body="Same assistant, same answer — now with the paperwork open beside it."
              />
            </div>

            <div className="mx-auto mt-4 h-[3px] w-40 overflow-hidden rounded-full bg-line">
              <div data-progress-fill className="h-full w-full origin-left scale-x-0 bg-forest-600" />
            </div>

            {/* The illustration is a mouse affordance; these links are the real
                controls, so keyboard and screen-reader users get the same
                destination without a duplicated pair of buttons. */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
              <p className="w-full text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
                Click either device to open the assistant
              </p>
              <Link
                href="/chat"
                className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface/80 px-4 py-2 text-[13px] font-semibold text-ink backdrop-blur-sm transition-colors hover:border-forest-500 hover:text-forest-700"
              >
                <Smartphone size={14} className="text-forest-600" />
                Open it on mobile
              </Link>
              <Link
                href="/chat"
                className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface/80 px-4 py-2 text-[13px] font-semibold text-ink backdrop-blur-sm transition-colors hover:border-forest-500 hover:text-forest-700"
              >
                <MonitorSmartphone size={14} className="text-forest-600" />
                Open it on the web
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Caption({
  kind,
  icon: Icon,
  title,
  body,
}: {
  kind: "phone" | "desk";
  icon: typeof Smartphone;
  title: string;
  body: string;
}) {
  return (
    <div
      data-caption={kind}
      className="absolute inset-x-0 top-0"
      style={{ opacity: kind === "phone" ? 1 : 0 }}
    >
      <p className="flex items-center justify-center gap-2 text-[15px] font-bold text-ink">
        <Icon size={16} className="text-forest-600" />
        {title}
      </p>
      <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}
