"use client";

import { useEffect } from "react";
import { Check, ShoppingBag, Sparkles, X } from "lucide-react";
import { useStore } from "../../contexts/StoreContext";

const confetti = Array.from({ length: 28 }, (_, index) => ({
  id: index,
  left: `${(index * 37) % 100}%`,
  delay: `${(index % 9) * 70}ms`,
  duration: `${1150 + (index % 5) * 180}ms`,
  color: ["#e0655a", "#e0a84f", "#5fa88e", "#7d9fd1", "#f4efe7"][index % 5],
}));

export function CartCelebration() {
  const { cartCelebration, dismissCartCelebration } = useStore();

  useEffect(() => {
    if (!cartCelebration) return;
    const timer = window.setTimeout(dismissCartCelebration, 2800);
    return () => window.clearTimeout(timer);
  }, [cartCelebration, dismissCartCelebration]);

  if (!cartCelebration) return null;

  return (
    <div
      className="cart-celebration fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#1c1b1a]/60 p-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Item added to cart"
      onClick={dismissCartCelebration}
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {confetti.map((piece) => (
          <span
            key={piece.id}
            className="cart-confetti absolute top-1/2 h-3 w-2 rounded-full"
            style={{
              left: piece.left,
              backgroundColor: piece.color,
              animationDelay: piece.delay,
              animationDuration: piece.duration,
            }}
          />
        ))}
      </div>

      <div
        className="cart-celebration-card relative w-full max-w-md rounded-3xl border border-white/50 bg-[#fffaf5] px-7 py-9 text-center shadow-2xl shadow-black/30 dark:bg-[#26231f]"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={dismissCartCelebration}
          className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
          aria-label="Close celebration"
        >
          <X size={18} />
        </button>
        <div className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30">
          <ShoppingBag size={34} strokeWidth={1.7} />
          <span className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#e0a84f] text-[#1c1b1a] shadow-md">
            <Check size={16} strokeWidth={3} />
          </span>
          <Sparkles className="absolute -left-7 -top-4 text-[#e0a84f]" size={22} />
          <Sparkles className="absolute -bottom-3 -right-7 text-[#5fa88e]" size={18} />
        </div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">Wonderful choice</p>
        <h2 className="mt-2 text-3xl font-semibold text-foreground">Added to your cart!</h2>
        <p className="mx-auto mt-3 max-w-xs truncate text-sm text-muted-foreground">{cartCelebration.title}</p>
        <p className="mt-5 text-sm text-muted-foreground">Your next great read is on its way.</p>
      </div>
    </div>
  );
}
