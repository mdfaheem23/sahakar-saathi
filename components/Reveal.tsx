"use client";

import { useRef } from "react";
import { gsap, useIsomorphicLayoutEffect, prefersReducedMotion } from "@/lib/motion";

/**
 * Scroll-triggered entrance. Children rise and fade as the element enters the
 * viewport; `stagger` cascades direct children instead of moving the wrapper.
 */
export default function Reveal({
  children,
  delay = 0,
  y = 26,
  stagger,
  className = "",
  as: Tag = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  stagger?: number;
  className?: string;
  as?: "div" | "section" | "ul" | "header";
}) {
  const ref = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (prefersReducedMotion()) {
      gsap.set(stagger ? el.children : el, { opacity: 1, y: 0 });
      return;
    }

    const targets = stagger ? Array.from(el.children) : el;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        targets,
        { opacity: 0, y },
        {
          opacity: 1,
          y: 0,
          duration: 0.9,
          delay,
          ease: "power3.out",
          stagger: stagger ?? 0,
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
        }
      );
    }, ref);

    return () => ctx.revert();
  }, [delay, y, stagger]);

  return (
    <Tag ref={ref as never} className={className}>
      {children}
    </Tag>
  );
}
