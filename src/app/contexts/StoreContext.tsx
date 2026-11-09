"use client";

// Store context: client-side cart, wishlist, compare and recently-viewed state.
// Backed by localStorage via the local repositories, kept in sync with React
// state so the header badges and pages update instantly. Book records referenced
// by id are resolved on demand and cached here.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { services } from "../../services";
import type { Book, ProductVariant } from "../../types";
import type { LocalCartItem } from "../../services/repositories";
import { toast } from "sonner";

interface StoreState {
  cart: LocalCartItem[];
  cartCount: number;
  wishlist: string[];
  compare: string[];
  recent: string[];
  bookCache: Record<string, Book>;
  cartDrawerOpen: boolean;
  addToCart(book: Book, qty?: number, variant?: ProductVariant): void;
  setQty(bookId: string, qty: number, variantId?: string): void;
  removeFromCart(bookId: string, variantId?: string): void;
  clearCart(): void;
  toggleWishlist(book: Book): void;
  inWishlist(bookId: string): boolean;
  toggleCompare(book: Book): void;
  inCompare(bookId: string): boolean;
  removeCompare(bookId: string): void;
  pushRecent(book: Book): void;
  openCartDrawer(): void;
  closeCartDrawer(): void;
}

const StoreContext = createContext<StoreState | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<LocalCartItem[]>(() => services.cart.items());
  const [wishlist, setWishlist] = useState<string[]>(() => services.wishlist.ids());
  const [compare, setCompare] = useState<string[]>(() => services.compare.ids());
  const [recent, setRecent] = useState<string[]>(() => services.recent.ids());
  const [bookCache, setBookCache] = useState<Record<string, Book>>({});
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);

  const cache = useCallbackFn((books: Book[]) => {
    setBookCache((prev) => {
      const next = { ...prev };
      books.forEach((b) => { next[b.id] = b; });
      return next;
    });
  });

  // Resolve any referenced-but-uncached books (e.g. restored from localStorage).
  useEffect(() => {
    const needed = [...cart.map((c) => c.bookId), ...wishlist, ...compare, ...recent]
      .filter((id, i, arr) => arr.indexOf(id) === i && !bookCache[id]);
    if (needed.length) {
      services.books.getMany(needed).then(cache).catch((e) => console.error("Resolve books failed:", e));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, wishlist, compare, recent]);

  const openCartDrawer = useCallbackFn(() => setCartDrawerOpen(true));
  const closeCartDrawer = useCallbackFn(() => setCartDrawerOpen(false));

  const addToCart = useCallbackFn((book: Book, qty = 1, variant?: ProductVariant) => {
    cache([book]);
    setCart(services.cart.add(book.id, qty, variant?.id));
    toast.success(`Added "${book.title}" (${variant?.name ?? "Paperback (Premium)"}) to cart`);
    setCartDrawerOpen(true);
  });
  const setQty = useCallbackFn((bookId: string, qty: number, variantId?: string) => setCart(services.cart.setQty(bookId, qty, variantId)));
  const removeFromCart = useCallbackFn((bookId: string, variantId?: string) => setCart(services.cart.remove(bookId, variantId)));
  const clearCart = useCallbackFn(() => setCart(services.cart.clear()));

  const toggleWishlist = useCallbackFn((book: Book) => {
    cache([book]);
    const next = services.wishlist.toggle(book.id);
    setWishlist(next);
    toast(next.includes(book.id) ? "Added to wishlist" : "Removed from wishlist");
  });

  const toggleCompare = useCallbackFn((book: Book) => {
    cache([book]);
    const next = services.compare.toggle(book.id);
    setCompare(next);
  });
  const removeCompare = useCallbackFn((bookId: string) => setCompare(services.compare.remove(bookId)));

  const pushRecent = useCallbackFn((book: Book) => {
    cache([book]);
    setRecent(services.recent.push(book.id));
  });

  const value = useMemo<StoreState>(() => ({
    cart,
    cartCount: cart.reduce((n, i) => n + i.qty, 0),
    wishlist,
    compare,
    recent,
    bookCache,
    cartDrawerOpen,
    addToCart,
    setQty,
    removeFromCart,
    clearCart,
    toggleWishlist,
    inWishlist: (id) => wishlist.includes(id),
    toggleCompare,
    inCompare: (id) => compare.includes(id),
    removeCompare,
    pushRecent,
    openCartDrawer,
    closeCartDrawer,
  }), [cart, wishlist, compare, recent, bookCache, cartDrawerOpen, addToCart, setQty, removeFromCart, clearCart, toggleWishlist, toggleCompare, removeCompare, pushRecent, openCartDrawer, closeCartDrawer]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

// Small helper: stable callback without spelling out useCallback deps everywhere.
function useCallbackFn<T extends (...args: never[]) => unknown>(fn: T): T {
  // We intentionally keep the latest closure; identity is stable for memo deps.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(fn, []);
}

export function useStore(): StoreState {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
