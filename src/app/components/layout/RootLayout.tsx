"use client";

// Storefront shell: header, routed content, footer, mobile tab bar and the
// global quick-view modal. Scrolls to top on route change.

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { BottomTabBar } from "./MobileNav";
import { QuickViewModal } from "../common/QuickViewModal";
import { ShoppingCartDrawer } from "../cart/ShoppingCartDrawer";
import { CouponPopup } from "../common/CouponPopup";

export function StorefrontShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-background pb-16 md:pb-0">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-card focus:px-3 focus:py-2 focus:ring-2 focus:ring-ring/40">
        Skip to content
      </a>
      <Header />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
      <BottomTabBar />
      <QuickViewModal />
      <ShoppingCartDrawer />
      <CouponPopup />
    </div>
  );
}
