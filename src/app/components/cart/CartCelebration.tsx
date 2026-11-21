"use client";

import { useEffect } from "react";
import { useStore } from "../../contexts/StoreContext";

const COLORS = [
  "#2f6bff", // blue
  "#e8203a", // red
  "#ffd400", // yellow
  "#7bc043", // green
  "#7c4dff", // purple
  "#ff8ac0", // pink
  "#ff8a1f", // orange
  "#8fd3f4", // light blue
];

// Seeded generator: varied looking, but identical on every render
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const rand = seeded(7);

const RAIN_SPREAD_MS = 2200; // how long new pieces keep starting to fall

const confetti = Array.from({ length: 180 }, (_, i) => {
  const isSquare = rand() > 0.55;
  const w = 6 + Math.round(rand() * 8); // 6-14px
  const h = isSquare ? w : 5 + Math.round(rand() * 6); // 5-11px
  const dir = rand() > 0.5 ? 1 : -1;
  return {
    id: i,
    left: `${(rand() * 104 - 2).toFixed(2)}%`,
    delay: `${Math.round(rand() * RAIN_SPREAD_MS)}ms`,
    duration: `${1300 + Math.round(rand() * 1000)}ms`,
    // small, consistent slant like wind-blown rain
    drift: `${(3 + rand() * 4).toFixed(1)}vw`,
    flutter: `${Math.round(4 + rand() * 10)}px`,
    rx: `${dir * Math.round(360 + rand() * 540)}deg`,
    ry: `${-dir * Math.round(180 + rand() * 360)}deg`,
    rz: `${dir * Math.round(120 + rand() * 360)}deg`,
    width: w,
    height: h,
    color: COLORS[Math.floor(rand() * COLORS.length)],
  };
});

export function CartCelebration() {
  const { cartCelebration, dismissCartCelebration } = useStore();

  useEffect(() => {
    if (!cartCelebration) return;
    const timer = window.setTimeout(dismissCartCelebration, 4800);
    return () => window.clearTimeout(timer);
  }, [cartCelebration, dismissCartCelebration]);

  if (!cartCelebration) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[100] overflow-hidden"
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">Added to cart: {cartCelebration.title}</span>

      <style>{`
        @keyframes cc-rain {
          0%   { transform: translate3d(0, -10vh, 0); opacity: 1; }
          25%  { transform: translate3d(calc(var(--drift) * 0.25 + var(--flutter)), 27vh, 0); }
          50%  { transform: translate3d(calc(var(--drift) * 0.5 - var(--flutter)), 54vh, 0); }
          75%  { transform: translate3d(calc(var(--drift) * 0.75 + var(--flutter)), 81vh, 0); opacity: 1; }
          100% { transform: translate3d(var(--drift), 112vh, 0); opacity: 0; }
        }
        @keyframes cc-tumble {
          0%   { transform: perspective(500px) rotateX(0) rotateY(0) rotateZ(0); }
          100% { transform: perspective(500px) rotateX(var(--rx)) rotateY(var(--ry)) rotateZ(var(--rz)); }
        }
        @media (prefers-reduced-motion: reduce) {
          .cc-piece { display: none !important; }
        }
      `}</style>

      {confetti.map((p) => (
        <span
          key={p.id}
          className="cc-piece absolute top-0 block"
          style={
            {
              left: p.left,
              opacity: 0,
              ["--drift" as string]: p.drift,
              ["--flutter" as string]: p.flutter,
              animation: `cc-rain ${p.duration} linear ${p.delay} both`,
            } as React.CSSProperties
          }
        >
          <span
            className="block"
            style={
              {
                width: p.width,
                height: p.height,
                backgroundColor: p.color,
                ["--rx" as string]: p.rx,
                ["--ry" as string]: p.ry,
                ["--rz" as string]: p.rz,
                animation: `cc-tumble ${p.duration} linear ${p.delay} both`,
              } as React.CSSProperties
            }
          />
        </span>
      ))}
    </div>
  );
}