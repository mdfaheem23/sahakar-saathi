"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);

// SSR-safe layout effect — GSAP must measure after paint, but useLayoutEffect
// warns during server render.
export const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/** Respect the user's reduced-motion preference for every animation here. */
export function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Lenis smooth scrolling, driven by GSAP's ticker so ScrollTrigger stays in
 * sync with the interpolated scroll position rather than the native one.
 */
export function useSmoothScroll() {
  useEffect(() => {
    if (prefersReducedMotion()) return;

    const lenis = new Lenis({
      duration: 1.05,
      easing: (t: number) => 1 - Math.pow(1 - t, 3),
      wheelMultiplier: 1,
      touchMultiplier: 1.6,
    });

    lenis.on("scroll", ScrollTrigger.update);

    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
    };
  }, []);
}

/**
 * Scoped GSAP context: everything created inside `fn` is reverted on unmount,
 * which matters under React strict mode and client-side route changes.
 */
export function useGsapContext(
  fn: (ctx: { self: gsap.Context }) => void,
  deps: unknown[] = []
) {
  const scope = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    const ctx = gsap.context((self) => fn({ self }), scope);
    return () => ctx.revert();
  }, deps);

  return scope;
}

/**
 * Splits an element's text into per-word spans wrapped in an overflow-hidden
 * mask, so words can rise into view from behind a clipping edge.
 * Returns the word elements for staggering.
 */
export function splitWords(el: HTMLElement): HTMLElement[] {
  if (el.dataset.split === "true") {
    return Array.from(el.querySelectorAll<HTMLElement>("[data-word]"));
  }

  const words = (el.textContent ?? "").split(/(\s+)/);
  el.textContent = "";

  const out: HTMLElement[] = [];
  for (const chunk of words) {
    if (/^\s+$/.test(chunk)) {
      el.appendChild(document.createTextNode(" "));
      continue;
    }
    const mask = document.createElement("span");
    mask.style.display = "inline-block";
    mask.style.overflow = "hidden";
    mask.style.verticalAlign = "top";
    mask.style.paddingBottom = "0.12em";
    mask.style.marginBottom = "-0.12em";

    const word = document.createElement("span");
    word.dataset.word = "true";
    word.style.display = "inline-block";
    word.style.willChange = "transform";
    word.textContent = chunk;

    mask.appendChild(word);
    el.appendChild(mask);
    out.push(word);
  }

  el.dataset.split = "true";
  return out;
}

/** Animates a number from 0 to `value`, formatted with Indian digit grouping. */
export function countUp(el: HTMLElement, value: number, duration = 1.6) {
  const state = { n: 0 };
  return gsap.to(state, {
    n: value,
    duration,
    ease: "power2.out",
    onUpdate: () => {
      el.textContent = Math.round(state.n).toLocaleString("en-IN");
    },
  });
}

export { gsap, ScrollTrigger };
