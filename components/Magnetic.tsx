"use client";

import { useRef } from "react";
import { gsap, useIsomorphicLayoutEffect, prefersReducedMotion } from "@/lib/motion";

/**
 * Magnetic hover: the child drifts toward the cursor while it's inside the
 * element's bounds and springs back on exit. Pointer-based, so it no-ops on
 * touch devices where there's no hover to respond to.
 */
export default function Magnetic({
  children,
  strength = 0.32,
  className = "",
}: {
  children: React.ReactNode;
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    const inner = el.firstElementChild as HTMLElement | null;
    if (!inner) return;

    const xTo = gsap.quickTo(inner, "x", { duration: 0.55, ease: "power3.out" });
    const yTo = gsap.quickTo(inner, "y", { duration: 0.55, ease: "power3.out" });

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * strength);
      yTo((e.clientY - (r.top + r.height / 2)) * strength);
    };
    const onLeave = () => {
      xTo(0);
      yTo(0);
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [strength]);

  return (
    <span ref={ref} className={`inline-block ${className}`}>
      {children}
    </span>
  );
}
