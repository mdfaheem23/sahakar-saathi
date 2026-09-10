"use client";

import { useRef } from "react";
import { gsap, useIsomorphicLayoutEffect, prefersReducedMotion } from "@/lib/motion";

/**
 * The room the kiosk stands in: a PACS branch office.
 *
 * Context matters for this deliverable — the hardware only makes sense once
 * you picture where it sits. A member walks in past the notice board, past the
 * queue at the counter, and finds the terminal against the side wall.
 *
 * Deliberately low-contrast and desaturated so it reads as background and
 * never competes with the machine in front of it.
 */
export default function PacsOfficeScene({ className = "" }: { className?: string }) {
  const root = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    if (prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      // Ceiling fan — fast enough to blur, slow enough not to strobe.
      gsap.to("[data-fan]", {
        rotation: 360,
        transformOrigin: "50% 50%",
        repeat: -1,
        duration: 0.85,
        ease: "none",
      });

      gsap.to("[data-clock-min]", {
        rotation: 360,
        transformOrigin: "50% 100%",
        repeat: -1,
        duration: 60,
        ease: "none",
      });

      // Daylight breathes as clouds pass the window.
      gsap.to("[data-shaft]", {
        opacity: 0.5,
        duration: 6.5,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      // Dust drifting in the light.
      gsap.utils.toArray<SVGElement>("[data-mote]").forEach((mote, i) => {
        gsap.to(mote, {
          y: `-=${40 + i * 9}`,
          x: `+=${(i % 2 === 0 ? 1 : -1) * (10 + i * 3)}`,
          opacity: 0,
          duration: 7 + i * 1.3,
          repeat: -1,
          delay: i * 0.9,
          ease: "none",
          onRepeat() {
            gsap.set(mote, { y: 0, x: 0, opacity: 0.5 });
          },
        });
      });

      // The queue shuffles forward now and then.
      gsap.to("[data-queue]", {
        x: 6,
        duration: 3.2,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        stagger: 0.4,
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={root} className={`pointer-events-none ${className}`} aria-hidden="true">
      <svg
        viewBox="0 0 1440 720"
        preserveAspectRatio="xMidYMax slice"
        className="h-full w-full"
      >
        <defs>
          <linearGradient id="o-wall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#efe7d6" />
            <stop offset="62%" stopColor="#e7ddc9" />
            <stop offset="100%" stopColor="#ddd2ba" />
          </linearGradient>
          <linearGradient id="o-floor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#cfc3aa" />
            <stop offset="100%" stopColor="#bdb096" />
          </linearGradient>
          <linearGradient id="o-shaft" x1="0" y1="0" x2="0.4" y2="1">
            <stop offset="0%" stopColor="#fff6dd" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#fff6dd" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="o-wood" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#9c7b52" />
            <stop offset="100%" stopColor="#7a5e3c" />
          </linearGradient>
        </defs>

        {/* Wall + floor */}
        <rect width="1440" height="560" fill="url(#o-wall)" />
        <rect y="556" width="1440" height="164" fill="url(#o-floor)" />
        <rect y="548" width="1440" height="10" fill="#a2937a" opacity="0.55" />

        {/* Floor tile lines */}
        {Array.from({ length: 13 }).map((_, i) => (
          <line
            key={i}
            x1={-140 + i * 150}
            y1="720"
            x2={280 + i * 92}
            y2="558"
            stroke="#a89a80"
            strokeWidth="1.4"
            opacity="0.32"
          />
        ))}

        {/* Window + daylight */}
        <g>
          <rect x="112" y="96" width="212" height="176" rx="6" fill="#cddcda" />
          <rect x="112" y="96" width="212" height="176" rx="6" fill="none" stroke="#9c8f76" strokeWidth="7" />
          <line x1="218" y1="96" x2="218" y2="272" stroke="#9c8f76" strokeWidth="5" />
          <line x1="112" y1="184" x2="324" y2="184" stroke="#9c8f76" strokeWidth="5" />
        </g>
        <path data-shaft d="M126 272 L318 272 L470 558 L196 558 Z" fill="url(#o-shaft)" opacity="0.8" />

        {/* Dust motes in the shaft */}
        {[
          [250, 470], [300, 420], [355, 505], [220, 400], [400, 530], [285, 350],
        ].map(([cx, cy], i) => (
          <circle key={i} data-mote cx={cx} cy={cy} r={2.1} fill="#fff8e4" opacity="0.5" />
        ))}

        {/* Ceiling fan */}
        <g transform="translate(760, 40)">
          <rect x="-3" y="0" width="6" height="42" fill="#8a7f6a" />
          <g data-fan transform="translate(0,46)">
            <ellipse cx="0" cy="0" rx="9" ry="9" fill="#7b7160" />
            {[0, 120, 240].map((deg) => (
              <ellipse
                key={deg}
                cx="52"
                cy="0"
                rx="52"
                ry="7"
                fill="#8d8270"
                opacity="0.5"
                transform={`rotate(${deg})`}
              />
            ))}
          </g>
        </g>

        {/* Notice board with scheme posters */}
        <g transform="translate(430, 120)">
          <rect width="238" height="158" rx="4" fill="#7a5e3c" />
          <rect x="7" y="7" width="224" height="144" fill="#e9e0cd" />
          <rect x="18" y="18" width="94" height="58" fill="#c9d9cf" />
          <rect x="122" y="18" width="94" height="58" fill="#e6d3bd" />
          <rect x="18" y="86" width="198" height="9" fill="#b9ab92" />
          <rect x="18" y="102" width="164" height="9" fill="#b9ab92" />
          <rect x="18" y="118" width="182" height="9" fill="#b9ab92" />
        </g>

        {/* Wall clock */}
        <g transform="translate(1010, 150)">
          <circle r="34" fill="#f2ead8" stroke="#8a7f6a" strokeWidth="4" />
          <circle r="2.6" fill="#5b5245" />
          <line data-clock-min y1="0" y2="-24" stroke="#5b5245" strokeWidth="2.4" strokeLinecap="round" />
          <line y1="0" y2="-15" stroke="#5b5245" strokeWidth="3.2" strokeLinecap="round" transform="rotate(105)" />
        </g>

        {/* Shelving with ledgers */}
        <g transform="translate(1120, 236)">
          <rect width="250" height="322" fill="url(#o-wood)" />
          {[0, 1, 2].map((row) => (
            <g key={row} transform={`translate(0, ${row * 104})`}>
              <rect x="8" y="8" width="234" height="88" fill="#d9cdb4" />
              {Array.from({ length: 11 }).map((_, i) => (
                <rect
                  key={i}
                  x={14 + i * 20}
                  y={14 + (i % 3) * 2}
                  width="15"
                  height={76 - (i % 3) * 4}
                  fill={["#8d4f3a", "#4f6b52", "#7a6a44", "#5c6a7d"][i % 4]}
                  opacity="0.8"
                />
              ))}
            </g>
          ))}
        </g>

        {/* Service counter with grille */}
        <g transform="translate(690, 380)">
          <rect width="352" height="178" fill="url(#o-wood)" />
          <rect y="-16" width="352" height="20" rx="3" fill="#a98a5f" />
          <rect x="24" y="-140" width="304" height="126" fill="#cfe0dd" opacity="0.5" />
          {Array.from({ length: 12 }).map((_, i) => (
            <line
              key={i}
              x1={30 + i * 26}
              y1="-140"
              x2={30 + i * 26}
              y2="-16"
              stroke="#8a7f6a"
              strokeWidth="3"
              opacity="0.75"
            />
          ))}
          <rect x="150" y="-72" width="58" height="56" fill="#efe7d6" />
        </g>

        {/* Members queuing at the counter */}
        {[
          { x: 604, h: 128, c: "#6f7d6a" },
          { x: 556, h: 120, c: "#7b6a58" },
          { x: 512, h: 124, c: "#5f6a78" },
        ].map((p, i) => (
          <g key={i} data-queue transform={`translate(${p.x}, ${558 - p.h})`}>
            <circle cx="0" cy="14" r="15" fill={p.c} opacity="0.62" />
            <path
              d={`M-19 ${p.h} L-19 44 Q-19 32 0 32 Q19 32 19 44 L19 ${p.h} Z`}
              fill={p.c}
              opacity="0.62"
            />
          </g>
        ))}

        {/* Potted plant */}
        <g transform="translate(300, 470)">
          <path d="M-22 88 L-16 26 L16 26 L22 88 Z" fill="#a86b47" />
          <path d="M0 26 C-30 -6 -22 -40 -2 -30 C6 -46 26 -34 20 -12 C34 -8 26 20 0 26 Z" fill="#5b7a56" opacity="0.85" />
        </g>

        {/* Warm vignette so the edges fall away behind the machine */}
        <rect width="1440" height="720" fill="url(#o-vig)" />
        <defs>
          <radialGradient id="o-vig" cx="0.5" cy="0.55" r="0.75">
            <stop offset="55%" stopColor="#000000" stopOpacity="0" />
            <stop offset="100%" stopColor="#3a3122" stopOpacity="0.34" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
}
