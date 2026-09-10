"use client";

import { useRef } from "react";
import { gsap, useIsomorphicLayoutEffect, prefersReducedMotion } from "@/lib/motion";

/**
 * Living background: a field of stalks that sways on its own and parts around
 * the cursor, like walking through standing crop.
 *
 * Canvas rather than DOM — a few hundred animated nodes as elements would
 * thrash layout. Drawn at device pixel ratio, paused when scrolled out of
 * view, and disabled entirely under prefers-reduced-motion.
 */

interface Stalk {
  x: number;
  baseY: number;
  height: number;
  phase: number;
  speed: number;
  /** Current and target lean, eased per frame toward the target. */
  lean: number;
  leanTarget: number;
}

export default function InteractiveField({
  className = "",
  density = 26,
}: {
  className?: string;
  density?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    if (prefersReducedMotion()) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let stalks: Stalk[] = [];
    let visible = true;

    // Pointer is tracked in canvas space; starts far away so nothing bends
    // until the cursor actually enters.
    const pointer = { x: -9999, y: -9999 };
    const INFLUENCE = 165;

    function build() {
      const rect = wrap!.getBoundingClientRect();
      width = rect.width;
      height = rect.height;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.floor(width * dpr);
      canvas!.height = Math.floor(height * dpr);
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      const columns = Math.max(8, Math.floor(width / density));
      stalks = [];
      for (let i = 0; i < columns; i++) {
        const x = (i + 0.5) * (width / columns);
        // Deterministic jitter keyed on index: stable across resizes, so the
        // field doesn't visibly reshuffle when the window changes.
        const j = Math.sin(i * 12.9898) * 43758.5453;
        const rand = j - Math.floor(j);
        stalks.push({
          x: x + (rand - 0.5) * density * 0.6,
          baseY: height,
          height: height * (0.26 + rand * 0.4),
          phase: rand * Math.PI * 2,
          speed: 0.5 + rand * 0.5,
          lean: 0,
          leanTarget: 0,
        });
      }
    }

    function draw(time: number) {
      if (!visible) return;
      ctx!.clearRect(0, 0, width, height);

      for (const s of stalks) {
        // Idle sway
        const sway = Math.sin(time * 0.0006 * s.speed + s.phase) * 7;

        // Cursor parts the field: stalks lean away, falling off with distance.
        const dx = s.x - pointer.x;
        const dy = s.baseY - s.height * 0.5 - pointer.y;
        const dist = Math.hypot(dx, dy);
        s.leanTarget =
          dist < INFLUENCE ? (dx / (dist || 1)) * (1 - dist / INFLUENCE) * 46 : 0;
        s.lean += (s.leanTarget - s.lean) * 0.09;

        const tipX = s.x + sway + s.lean;
        const tipY = s.baseY - s.height;
        const ctrlX = s.x + (sway + s.lean) * 0.35;
        const ctrlY = s.baseY - s.height * 0.55;

        const bend = Math.min(Math.abs(s.lean) / 46, 1);

        ctx!.beginPath();
        ctx!.moveTo(s.x, s.baseY);
        ctx!.quadraticCurveTo(ctrlX, ctrlY, tipX, tipY);
        ctx!.strokeStyle = `rgba(20, 115, 84, ${0.09 + bend * 0.16})`;
        ctx!.lineWidth = 1.15;
        ctx!.lineCap = "round";
        ctx!.stroke();

        // Grain head, warming as the stalk bends
        ctx!.beginPath();
        ctx!.arc(tipX, tipY, 1.7 + bend * 1.1, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(201, 154, 30, ${0.16 + bend * 0.4})`;
        ctx!.fill();
      }
    }

    build();

    const tick = (time: number) => draw(time * 1000);
    gsap.ticker.add(tick);

    const onPointerMove = (e: PointerEvent) => {
      const rect = wrap!.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
    };
    const onPointerLeave = () => {
      pointer.x = -9999;
      pointer.y = -9999;
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerleave", onPointerLeave);

    const ro = new ResizeObserver(build);
    ro.observe(wrap);

    // Don't burn frames on a field nobody can see.
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
      },
      { threshold: 0 }
    );
    io.observe(wrap);

    return () => {
      gsap.ticker.remove(tick);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
      ro.disconnect();
      io.disconnect();
    };
  }, [density]);

  return (
    <div ref={wrapRef} className={`pointer-events-none ${className}`} aria-hidden="true">
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}
