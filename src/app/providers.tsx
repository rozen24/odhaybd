"use client";

// Composes all app-wide providers: TanStack Query, theme, auth, catalog, store,
// quick-view, and the toast portal. Also kicks off the one-time seed bootstrap.

import { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { queryClient } from "../lib/query";
import { seedIfNeeded } from "../services";
import { AuthProvider } from "./contexts/AuthContext";
import { CatalogProvider } from "./contexts/CatalogContext";
import { StoreProvider } from "./contexts/StoreContext";
import { QuickViewProvider } from "./contexts/QuickViewContext";
import { PwaClient } from "./components/pwa/PwaClient";
import { CartCelebration } from "./components/cart/CartCelebration";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    seedIfNeeded();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <AuthProvider>
          <CatalogProvider>
            <StoreProvider>
              <QuickViewProvider>
                {children}
                <CartCelebration />
                <Toaster position="top-center" richColors closeButton />
                <PwaClient />
              </QuickViewProvider>
            </StoreProvider>
          </CatalogProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
