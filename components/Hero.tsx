"use client";

import Link from "next/link";
import { useRef } from "react";
import {
  gsap,
  splitWords,
  useIsomorphicLayoutEffect,
  prefersReducedMotion,
} from "@/lib/motion";
import InteractiveField from "./InteractiveField";
import { ArrowRight, Sparkles, ShieldAlert, Radar } from "lucide-react";

const PILLS = [
  { icon: Sparkles, title: "Inverts the question", body: "Returns the rupee value of everything you're entitled to and not claiming." },
  { icon: ShieldAlert, title: "Defends against rent-seeking", body: "Fact-checks a middleman's claim against the source, before money moves." },
  { icon: Radar, title: "Aggregates into evidence", body: "Clusters grievances so systemic failure reaches the Registrar." },
];

export default function Hero() {
  const root = useRef<HTMLElement>(null);

  useIsomorphicLayoutEffect(() => {
    const el = root.current;
    if (!el) return;

    const ctxCleanup: (() => void)[] = [];

    const ctx = gsap.context(() => {
      const heading = el.querySelector<HTMLElement>("[data-hero-heading]");
      const reduced = prefersReducedMotion();

      if (reduced) {
        gsap.set(el.querySelectorAll("[data-hero-item]"), { opacity: 1, y: 0 });
        return;
      }

      const words = heading ? splitWords(heading) : [];

      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.from("[data-hero-eyebrow]", { opacity: 0, y: 14, duration: 0.7 })
        .from(
          words,
          { yPercent: 118, duration: 1.05, stagger: 0.045, ease: "power4.out" },
          "-=0.42"
        )
        .from("[data-hero-sub]", { opacity: 0, y: 18, duration: 0.85 }, "-=0.62")
        .from("[data-hero-cta] > *", { opacity: 0, y: 16, duration: 0.7, stagger: 0.09 }, "-=0.5")
        .from("[data-hero-pill]", { opacity: 0, y: 22, duration: 0.75, stagger: 0.1 }, "-=0.42");

      // Depth: the wash layers drift at different rates as the hero scrolls
      // away, so the block reads as a space rather than a flat panel.
      gsap.to("[data-hero-wash]", {
        yPercent: 26,
        ease: "none",
        scrollTrigger: { trigger: el, start: "top top", end: "bottom top", scrub: 0.6 },
      });
      gsap.to("[data-hero-grid]", {
        yPercent: 14,
        ease: "none",
        scrollTrigger: { trigger: el, start: "top top", end: "bottom top", scrub: 0.6 },
      });
      // A soft warm light trails the pointer across the hero.
      const glow = el.querySelector<HTMLElement>("[data-hero-glow]");
      if (glow && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
        const xTo = gsap.quickTo(glow, "x", { duration: 0.9, ease: "power3.out" });
        const yTo = gsap.quickTo(glow, "y", { duration: 0.9, ease: "power3.out" });
        const onMove = (e: PointerEvent) => {
          const r = el.getBoundingClientRect();
          xTo(e.clientX - r.left);
          yTo(e.clientY - r.top);
        };
        el.addEventListener("pointermove", onMove);
        gsap.to(glow, { autoAlpha: 1, duration: 1.2, delay: 0.4 });
        ctxCleanup.push(() => el.removeEventListener("pointermove", onMove));
      }

      gsap.to("[data-hero-content]", {
        yPercent: 12,
        opacity: 0.25,
        ease: "none",
        scrollTrigger: { trigger: el, start: "center top", end: "bottom top", scrub: 0.6 },
      });
    }, root);

    return () => {
      ctxCleanup.forEach((fn) => fn());
      ctx.revert();
    };
  }, []);

  return (
    <section ref={root} className="relative overflow-hidden">
      <div data-hero-wash className="hero-field absolute inset-0 -z-10 scale-110" />
      <div data-hero-grid className="hero-grid absolute inset-0 -z-10 scale-110" aria-hidden="true" />

      {/* Pointer light — invisible until the cursor first moves */}
      <div
        data-hero-glow
        className="pointer-events-none absolute -left-48 -top-48 -z-10 h-96 w-96 rounded-full opacity-0 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(212,154,88,0.5) 0%, rgba(20,115,84,0.18) 45%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      {/* Standing crop that parts around the cursor */}
      <InteractiveField className="absolute inset-x-0 bottom-0 -z-10 h-[62%]" />

      <div
        data-hero-content
        className="relative mx-auto max-w-4xl px-5 py-24 text-center sm:py-32"
      >
        <span
          data-hero-eyebrow
          data-hero-item
          className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface/70 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-clay-600 backdrop-blur-sm"
        >
          SIH 26088 · Ministry of Cooperation
        </span>

        <h1
          data-hero-heading
          data-hero-item
          className="font-display mt-8 text-balance text-4xl font-bold leading-[1.06] text-ink sm:text-6xl lg:text-7xl"
        >
          A chatbot can only answer what you know to ask.
        </h1>

        <p
          data-hero-sub
          data-hero-item
          className="mx-auto mt-7 max-w-xl text-balance text-[15px] leading-relaxed text-ink-soft"
        >
          The farmers with the worst awareness gap are exactly the ones who don&apos;t know
          the question. The Ministry&apos;s National Cooperative Database already ships a
          multilingual Bhashini chatbot — so we built the three things a chatbot
          structurally cannot do.
        </p>

        <div
          data-hero-cta
          data-hero-item
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
        >
          <Link
            href="/entitlements"
            className="group inline-flex items-center gap-2 rounded-full bg-forest-800 px-7 py-3.5 text-sm font-semibold text-white shadow-xl transition-transform duration-300 hover:-translate-y-1"
          >
            See what a farmer is missing
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="/verify"
            className="inline-flex items-center gap-2 rounded-full border border-line-strong px-7 py-3.5 text-sm font-semibold text-ink transition-colors hover:bg-surface"
          >
            Fact-check a middleman
          </Link>
        </div>

        <div className="mt-16 grid gap-3 text-left sm:grid-cols-3">
          {PILLS.map((p) => (
            <div
              key={p.title}
              data-hero-pill
              data-hero-item
              className="card p-5"
            >
              <p.icon size={18} className="text-forest-600" />
              <p className="mt-3 text-sm font-bold text-ink">{p.title}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
