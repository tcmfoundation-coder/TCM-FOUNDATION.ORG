"use client";

import { useEffect, useRef, useState } from "react";

// Counts up from 0 once the stat scrolls into view. Respects
// prefers-reduced-motion by jumping straight to the final value instead of
// animating (checked once on mount — matches the CSS-level rule in
// globals.css that collapses animation/transition durations).
export function StatCounter({ value, label }: { value: number; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        observer.disconnect();

        if (reduceMotion) {
          setDisplay(value);
          return;
        }

        const duration = 1200;
        const start = performance.now();
        function tick(now: number) {
          const progress = Math.min((now - start) / duration, 1);
          setDisplay(Math.round(value * progress));
          if (progress < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [value]);

  return (
    <div ref={ref} className="flex flex-col items-center gap-2 text-center">
      <span className="font-display text-5xl font-medium leading-none tracking-tight text-brand-700 md:text-6xl">
        {display.toLocaleString()}+
      </span>
      <span className="max-w-[12rem] text-sm leading-relaxed text-stone-600">{label}</span>
    </div>
  );
}
