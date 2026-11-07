import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/constants";
import { Providers } from "./providers";
import { StorefrontShell } from "./components/layout/RootLayout";
import "../styles/index.css";
import ChatWidget from "@/components/ChatWidget";

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";


export const metadata: Metadata = {
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s · ${SITE_NAME}`,
  },
  description:
    "Shop books online across Bangladesh with search, deals, and order tracking.",
  applicationName: SITE_NAME,
  manifest: `${base}/manifest.webmanifest`,
  icons: {
    icon: [
      { url: `${base}/icons/icon-192.svg`, sizes: "192x192", type: "image/svg+xml" },
      { url: `${base}/icons/icon-512.svg`, sizes: "512x512", type: "image/svg+xml" },
    ],
  },
  openGraph: {
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: "Shop books online across Bangladesh with search, deals, and order tracking.",
    siteName: SITE_NAME,
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#9E2A2B",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="suppressHydrationWarning min-h-screen bg-background font-sans antialiased">
        <Suspense fallback={<div className="min-h-screen bg-background" />}>
          <Providers>
            <StorefrontShell>{children}</StorefrontShell>
            <ChatWidget />
          </Providers>
        </Suspense>
      </body>
    </html>
  );
}
