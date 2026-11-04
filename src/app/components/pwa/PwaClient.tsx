"use client";

import { useEffect, useState } from "react";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "pustak.pwa-install-dismissed";
const DISMISS_DAYS = 14;

export function PwaClient() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    if ("serviceWorker" in navigator) navigator.serviceWorker.register(`${base}/sw.js`, { scope: `${base}/` }).catch(() => undefined);

    const dismissed = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    if (dismissed && Date.now() - dismissed < DISMISS_DAYS * 86400000) return;

    const onInstall = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onInstall);
    return () => window.removeEventListener("beforeinstallprompt", onInstall);
  }, []);

  if (!visible || !promptEvent) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  const install = async () => {
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === "accepted") setVisible(false);
    else dismiss();
  };

  return (
    <div className="fixed inset-x-4 bottom-20 z-50 flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-3 text-sm shadow-lg md:inset-x-auto md:bottom-6 md:right-6 md:w-80">
      <p className="text-foreground">Install Odhay BD for a quicker reading experience.</p>
      <div className="flex shrink-0 items-center gap-2">
        <button type="button" onClick={dismiss} className="text-xs text-muted-foreground hover:text-foreground">Later</button>
        <button type="button" onClick={install} className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">Install</button>
      </div>
    </div>
  );
}
