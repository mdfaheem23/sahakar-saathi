"use client";

/**
 * Physical PACS kiosk chassis.
 *
 * Drawn rather than photographed so the hardware described in Section 3.5 of
 * the proposal — Raspberry Pi-class SBC, 5-inch touchscreen, push-to-talk mic,
 * speaker — is legible as an actual object a farmer walks up to at the PACS
 * counter, not an abstract "hardware" bullet point.
 *
 * The screen area is left transparent; live UI is layered over it in HTML at
 * SCREEN_RECT so text stays real text (selectable, crisp, translatable) rather
 * than being baked into the illustration.
 */

// Screen window as a fraction of the 440x700 viewBox, for the HTML overlay.
export const SCREEN_RECT = {
  left: `${(70 / 440) * 100}%`,
  top: `${(78 / 700) * 100}%`,
  width: `${(300 / 440) * 100}%`,
  height: `${(190 / 700) * 100}%`,
};

export default function KioskChassis({
  listening = false,
  online = true,
  className = "",
}: {
  listening?: boolean;
  online?: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 440 700"
      className={className}
      aria-hidden="true"
      style={{ overflow: "visible" }}
    >
      <defs>
        <linearGradient id="k-body" x1="0" y1="0" x2="1" y2="0.35">
          <stop offset="0%" stopColor="#454c55" />
          <stop offset="18%" stopColor="#333a42" />
          <stop offset="52%" stopColor="#272d34" />
          <stop offset="82%" stopColor="#1e232a" />
          <stop offset="100%" stopColor="#2b3138" />
        </linearGradient>

        <linearGradient id="k-shelf" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3d444d" />
          <stop offset="45%" stopColor="#2b3138" />
          <stop offset="100%" stopColor="#1b2026" />
        </linearGradient>

        <linearGradient id="k-column" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#20252b" />
          <stop offset="22%" stopColor="#3a4149" />
          <stop offset="50%" stopColor="#2a3037" />
          <stop offset="78%" stopColor="#1d2228" />
          <stop offset="100%" stopColor="#31373f" />
        </linearGradient>

        <linearGradient id="k-base" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#333941" />
          <stop offset="100%" stopColor="#15191d" />
        </linearGradient>

        <linearGradient id="k-bezel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0c0e11" />
          <stop offset="100%" stopColor="#181c21" />
        </linearGradient>

        <radialGradient id="k-btn" cx="0.38" cy="0.32" r="0.78">
          <stop offset="0%" stopColor="#3fd39b" />
          <stop offset="42%" stopColor="#1b9068" />
          <stop offset="100%" stopColor="#0a4a37" />
        </radialGradient>

        <radialGradient id="k-btn-hot" cx="0.38" cy="0.32" r="0.78">
          <stop offset="0%" stopColor="#ffbe86" />
          <stop offset="40%" stopColor="#d4681c" />
          <stop offset="100%" stopColor="#7d3a08" />
        </radialGradient>

        <linearGradient id="k-trim" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#8d6b13" />
          <stop offset="35%" stopColor="#e0b53f" />
          <stop offset="60%" stopColor="#c99a1e" />
          <stop offset="100%" stopColor="#7d5f10" />
        </linearGradient>

        {/* Diagonal sheen across the cover glass */}
        <linearGradient id="k-glare" x1="0" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.16" />
          <stop offset="38%" stopColor="#ffffff" stopOpacity="0.05" />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>

        <filter id="k-drop" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="16" stdDeviation="18" floodColor="#141a1e" floodOpacity="0.34" />
        </filter>

        <filter id="k-glow" x="-90%" y="-90%" width="280%" height="280%">
          <feGaussianBlur stdDeviation="7" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="k-floor" x="-30%" y="-60%" width="160%" height="260%">
          <feGaussianBlur stdDeviation="13" />
        </filter>

        <pattern id="k-mesh" width="5" height="5" patternUnits="userSpaceOnUse">
          <circle cx="2.5" cy="2.5" r="1.15" fill="#0b0d10" />
        </pattern>
      </defs>

      {/* ---- Contact shadow on the floor ---- */}
      <ellipse cx="220" cy="617" rx="132" ry="19" fill="#1b2420" opacity="0.42" filter="url(#k-floor)" />

      {/* ---- Base plinth ---- */}
      <g filter="url(#k-drop)">
        <path d="M116 596 L146 520 L294 520 L324 596 Z" fill="url(#k-base)" />
        <rect x="110" y="592" width="220" height="16" rx="6" fill="#22272d" />
        <rect x="110" y="592" width="220" height="4" rx="2" fill="#3c434b" opacity="0.7" />
        {/* Levelling feet */}
        <rect x="124" y="606" width="26" height="7" rx="3" fill="#12161a" />
        <rect x="290" y="606" width="26" height="7" rx="3" fill="#12161a" />
      </g>

      {/* ---- Column / neck ---- */}
      <g>
        <rect x="176" y="330" width="88" height="196" fill="url(#k-column)" />
        {/* Cable channel */}
        <rect x="214" y="330" width="4" height="196" fill="#12161a" opacity="0.55" />
        {/* Cable exiting to the floor */}
        <path
          d="M264 512 C300 528 312 556 300 592"
          stroke="#15191d"
          strokeWidth="7"
          fill="none"
          strokeLinecap="round"
        />
      </g>

      {/* ---- Control shelf (angled, below the screen) ---- */}
      <g filter="url(#k-drop)">
        <path d="M52 300 L388 300 L364 388 L76 388 Z" fill="url(#k-shelf)" />
        <path d="M52 300 L388 300 L386 307 L54 307 Z" fill="#525a64" opacity="0.55" />

        {/* Push-to-talk button */}
        <g transform="translate(126, 344)">
          <ellipse cx="0" cy="4" rx="35" ry="33" fill="#0e1216" opacity="0.85" />
          <circle
            r="31"
            fill={listening ? "url(#k-btn-hot)" : "url(#k-btn)"}
            filter={listening ? "url(#k-glow)" : undefined}
          />
          <circle r="31" fill="none" stroke="#0a0d10" strokeWidth="2.5" opacity="0.6" />
          <circle r="24" fill="none" stroke="#ffffff" strokeWidth="1.2" opacity="0.16" />
          {/* Mic glyph */}
          <g transform="translate(0,1)" fill="#ffffff" opacity="0.92">
            <rect x="-4.5" y="-13" width="9" height="17" rx="4.5" />
            <path
              d="M-9 -1 a9 9 0 0 0 18 0"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <rect x="-1.1" y="8" width="2.2" height="6" rx="1" />
          </g>
        </g>

        {/* Speaker grille */}
        <g transform="translate(238, 322)">
          <rect width="112" height="44" rx="8" fill="#171b20" />
          <rect x="4" y="4" width="104" height="36" rx="5" fill="url(#k-mesh)" />
          <rect width="112" height="44" rx="8" fill="none" stroke="#0b0e11" strokeWidth="1.5" />
        </g>

        {/* Mic port + status LED */}
        <circle cx="196" cy="368" r="3.4" fill="#101418" />
        <circle cx="205" cy="368" r="3.4" fill="#101418" />
        <circle
          cx="366"
          cy="316"
          r="4"
          fill={online ? "#2fd18f" : "#e04b32"}
          filter="url(#k-glow)"
        />
      </g>

      {/* ---- Screen housing ---- */}
      <g filter="url(#k-drop)">
        <rect x="40" y="34" width="360" height="272" rx="20" fill="url(#k-body)" />
        {/* Top bevel highlight */}
        <path
          d="M60 36 L380 36 A18 18 0 0 1 396 52 L396 58 L44 58 L44 52 A18 18 0 0 1 60 36 Z"
          fill="#5a626c"
          opacity="0.35"
        />
        {/* Side vents */}
        {[0, 1, 2, 3].map((i) => (
          <rect key={`vl${i}`} x="46" y={214 + i * 11} width="16" height="4" rx="2" fill="#12161a" opacity="0.8" />
        ))}
        {[0, 1, 2, 3].map((i) => (
          <rect key={`vr${i}`} x="378" y={214 + i * 11} width="16" height="4" rx="2" fill="#12161a" opacity="0.8" />
        ))}

        {/* Screen bezel */}
        <rect x="60" y="68" width="320" height="210" rx="12" fill="url(#k-bezel)" />
        <rect
          x="66"
          y="74"
          width="308"
          height="198"
          rx="8"
          fill="none"
          stroke="#000000"
          strokeWidth="2"
          opacity="0.6"
        />
        {/* Screen aperture — deliberately transparent; HTML UI sits here */}
        <rect x="70" y="78" width="300" height="190" rx="6" fill="#05070a" />

        {/* Camera / ambient-light sensor pinhole */}
        <circle cx="220" cy="62" r="2.6" fill="#0a0d10" />
        <circle cx="220" cy="62" r="1.1" fill="#2a3138" />

        {/* Corner screws */}
        {[
          [54, 48],
          [386, 48],
          [54, 292],
          [386, 292],
        ].map(([cx, cy], i) => (
          <g key={i} transform={`translate(${cx},${cy})`}>
            <circle r="4.2" fill="#171b20" />
            <circle r="4.2" fill="none" stroke="#4a525b" strokeWidth="0.8" opacity="0.6" />
            <path d="M-2.2 0 H2.2" stroke="#5b636d" strokeWidth="1.1" strokeLinecap="round" />
          </g>
        ))}
      </g>

      {/* ---- Brand plate on the shelf front ---- */}
      <g transform="translate(220, 402)">
        <rect x="-92" y="-13" width="184" height="26" rx="6" fill="#191d22" />
        <rect x="-92" y="-13" width="184" height="26" rx="6" fill="none" stroke="url(#k-trim)" strokeWidth="1.2" opacity="0.8" />
        <text
          textAnchor="middle"
          y="5"
          fill="#d9c78e"
          fontSize="12.5"
          fontWeight="700"
          letterSpacing="3.2"
          fontFamily="var(--font-body), Georgia, serif"
        >
          PACS SAHAYAK
        </text>
      </g>

      {/* Ministry attribution etched on the column */}
      <text
        x="220"
        y="470"
        textAnchor="middle"
        fill="#6d757f"
        fontSize="8.5"
        letterSpacing="1.8"
        fontFamily="var(--font-body), Georgia, serif"
      >
        MINISTRY OF COOPERATION
      </text>
    </svg>
  );
}

/** Cover-glass sheen, layered above the live screen so it reads as glass. */
export function ScreenGlare() {
  return (
    <svg
      viewBox="0 0 300 190"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="glare-a" x1="0" y1="0" x2="0.85" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.13" />
          <stop offset="34%" stopColor="#ffffff" stopOpacity="0.04" />
          <stop offset="52%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M0 0 L138 0 L44 190 L0 190 Z" fill="url(#glare-a)" />
    </svg>
  );
}
