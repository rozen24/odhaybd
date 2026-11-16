"use client";

import { useEffect } from "react";
import { BookOpen, Heart, Sparkles, Star } from "lucide-react";
import { useStore } from "../../contexts/StoreContext";

const COLORS = ["#e0655a", "#e0a84f", "#5fa88e", "#7d9fd1", "#f4efe7", "#f2b8c6"];

// Deterministic "randomness" so the animation is identical on every render
const confetti = Array.from({ length: 72 }, (_, i) => {
  const shape = i % 3; // 0 = rect, 1 = circle, 2 = thin strip
  return {
    id: i,
    left: `${(i * 53 + (i % 7) * 11) % 100}%`,
    delay: `${(i % 16) * 55}ms`,
    duration: `${1900 + (i % 6) * 210}ms`,
    drift: `${((i * 29) % 41) - 20}vw`,
    spin: `${(i % 2 ? 1 : -1) * (540 + (i % 5) * 120)}deg`,
    width: shape === 2 ? 4 : 7 + (i % 4) * 2,
    height: shape === 2 ? 18 + (i % 3) * 4 : shape === 1 ? 7 + (i % 4) * 2 : 12 + (i % 3) * 3,
    radius: shape === 1 ? "9999px" : "2px",
    color: COLORS[i % COLORS.length],
  };
});

const floaters = [
  { Icon: BookOpen, left: "12%", size: 34, color: "#e0a84f", delay: 100 },
  { Icon: Star, left: "26%", size: 24, color: "#f4efe7", delay: 350 },
  { Icon: Heart, left: "38%", size: 26, color: "#e0655a", delay: 200 },
  { Icon: BookOpen, left: "52%", size: 30, color: "#5fa88e", delay: 450 },
  { Icon: Sparkles, left: "64%", size: 28, color: "#e0a84f", delay: 150 },
  { Icon: Heart, left: "76%", size: 22, color: "#f2b8c6", delay: 400 },
  { Icon: Star, left: "88%", size: 30, color: "#7d9fd1", delay: 250 },
  { Icon: BookOpen, left: "46%", size: 22, color: "#e0655a", delay: 650 },
];

const streamers = [
  { left: "8%", color: "#e0655a", delay: 0, rot: -6 },
  { left: "22%", color: "#e0a84f", delay: 120, rot: 5 },
  { left: "37%", color: "#5fa88e", delay: 60, rot: -4 },
  { left: "63%", color: "#7d9fd1", delay: 90, rot: 6 },
  { left: "78%", color: "#f2b8c6", delay: 30, rot: -5 },
  { left: "92%", color: "#e0a84f", delay: 150, rot: 4 },
];

const twinkles = [
  { left: "18%", top: "10%", size: 22, delay: 200 },
  { left: "42%", top: "6%", size: 28, delay: 350 },
  { left: "58%", top: "12%", size: 20, delay: 500 },
  { left: "81%", top: "8%", size: 26, delay: 300 },
];

export function CartCelebration() {
  const { cartCelebration, dismissCartCelebration } = useStore();

  useEffect(() => {
    if (!cartCelebration) return;
    const timer = window.setTimeout(dismissCartCelebration, 3600);
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
        @keyframes cc-glow {
          0%   { opacity: 0; transform: translateY(-20%); }
          25%  { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(0); }
        }
        @keyframes cc-fall {
          0%   { transform: translate3d(0, -12vh, 0); opacity: 0; }
          8%   { opacity: 1; }
          85%  { opacity: 1; }
          100% { transform: translate3d(var(--drift), 112vh, 0); opacity: 0; }
        }
        @keyframes cc-spin {
          0%   { transform: rotateZ(0) rotateX(0) rotateY(0); }
          100% { transform: rotateZ(var(--spin)) rotateX(720deg) rotateY(360deg); }
        }
        @keyframes cc-float {
          0%   { transform: translate3d(0, -14vh, 0) scale(0.4) rotate(-12deg); opacity: 0; }
          12%  { opacity: 1; transform: translate3d(0, 4vh, 0) scale(1.15) rotate(8deg); }
          35%  { transform: translate3d(14px, 28vh, 0) scale(1) rotate(-8deg); }
          60%  { transform: translate3d(-14px, 55vh, 0) scale(1) rotate(8deg); }
          85%  { opacity: 1; }
          100% { transform: translate3d(8px, 105vh, 0) scale(0.9) rotate(-6deg); opacity: 0; }
        }
        @keyframes cc-streamer {
          0%   { transform: scaleY(0) rotate(var(--rot)); opacity: 1; }
          30%  { transform: scaleY(1) rotate(var(--rot)); opacity: 1; }
          55%  { transform: scaleY(1) rotate(calc(var(--rot) * -1)); opacity: 1; }
          100% { transform: translateY(110vh) scaleY(1) rotate(var(--rot)); opacity: 0; }
        }
        @keyframes cc-twinkle {
          0%   { transform: scale(0) rotate(0deg); opacity: 0; }
          40%  { transform: scale(1.3) rotate(90deg); opacity: 1; }
          100% { transform: scale(0) rotate(180deg); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .cc-motion { display: none !important; }
        }
      `}</style>

      {/* Warm light washing down from the top */}
      <div
        className="absolute inset-x-0 top-0 h-[55vh]"
        style={{
          background:
            "radial-gradient(ellipse 70% 100% at 50% 0%, rgba(224,168,79,0.55), rgba(242,184,198,0.22) 45%, transparent 75%)",
          animation: "cc-glow 1800ms ease-out forwards",
        }}
      />

      <div className="cc-motion absolute inset-0">
        {/* Ribbons unrolling from the top edge */}
        {streamers.map((s, i) => (
          <span
            key={i}
            className="absolute top-0 block h-[38vh] w-[7px] origin-top rounded-b-full"
            style={
              {
                left: s.left,
                background: `linear-gradient(to bottom, ${s.color}, ${s.color}cc)`,
                ["--rot" as string]: `${s.rot}deg`,
                animation: `cc-streamer 2300ms cubic-bezier(.2,.8,.3,1) ${s.delay}ms forwards`,
                transform: "scaleY(0)",
                opacity: 0,
              } as React.CSSProperties
            }
          />
        ))}

        {/* Confetti */}
        {confetti.map((p) => (
          <span
            key={p.id}
            className="absolute top-0 block"
            style={
              {
                left: p.left,
                opacity: 0,
                ["--drift" as string]: p.drift,
                ["--spin" as string]: p.spin,
                animation: `cc-fall ${p.duration} cubic-bezier(.3,.1,.6,1) ${p.delay} forwards`,
              } as React.CSSProperties
            }
          >
            <span
              className="block"
              style={
                {
                  width: p.width,
                  height: p.height,
                  borderRadius: p.radius,
                  backgroundColor: p.color,
                  ["--spin" as string]: p.spin,
                  animation: `cc-spin ${p.duration} linear ${p.delay} forwards`,
                } as React.CSSProperties
              }
            />
          </span>
        ))}

        {/* Floating books, hearts and stars */}
        {floaters.map(({ Icon, left, size, color, delay }, i) => (
          <span
            key={i}
            className="absolute top-0 block"
            style={{
              left,
              opacity: 0,
              color,
              filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.25))",
              animation: `cc-float 2800ms ease-in-out ${delay}ms forwards`,
            }}
          >
            <Icon size={size} strokeWidth={1.8} fill={Icon === Sparkles ? "none" : "currentColor"} fillOpacity={0.18} />
          </span>
        ))}

        {/* Twinkling sparkles near the top */}
        {twinkles.map((t, i) => (
          <Sparkles
            key={i}
            size={t.size}
            className="absolute text-[#e0a84f]"
            style={{
              left: t.left,
              top: t.top,
              opacity: 0,
              animation: `cc-twinkle 1100ms ease-out ${t.delay}ms forwards`,
            }}
          />
        ))}
      </div>
    </div>
  );
}