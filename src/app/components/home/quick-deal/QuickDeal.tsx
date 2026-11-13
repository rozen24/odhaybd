// Quick Deal section container: fetches live campaigns (one aggregate request)
// and renders the bordered block with header bar, tabs and carousel.

import { Zap } from "lucide-react";
import { useQuery } from "../../../../lib/query";
import { services } from "../../../../services";
import { ErrorState } from "../../common/EmptyState";
import { CONTAINER } from "../shared";
import { QuickDealTabs } from "./QuickDealTabs";

const SPARKS = [
  { l: "6%",  t: "38%", d: "0s" },
  { l: "28%", t: "78%", d: "0.8s" },
  { l: "52%", t: "30%", d: "1.4s" },
  { l: "74%", t: "80%", d: "0.4s" },
  { l: "93%", t: "42%", d: "1.9s" },
];

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <section className="py-6 md:py-8" aria-labelledby="quick-deal-heading">
      <div className={CONTAINER}>
        <div className="fs-wrap">
          <div className="fs-inner bg-card">
            {/* animated background */}
            <span className="fs-blob fs-blob-a" aria-hidden />
            <span className="fs-blob fs-blob-b" aria-hidden />
            <span className="fs-blob fs-blob-c" aria-hidden />
            {SPARKS.map((s, i) => (
              <span key={i} className="fs-spark" aria-hidden style={{ left: s.l, top: s.t, animationDelay: s.d }} />
            ))}

            {/* header bar */}
            <div className="fs-bar flex items-center justify-between gap-3 px-4 py-2.5">
              <div className="relative z-10 flex items-center gap-2.5">
                <span className="fs-bar-icon" aria-hidden><Zap size={15} /></span>
                <h2 id="quick-deal-heading" className="font-display text-lg font-semibold tracking-tight">
                  Quick Deal
                </h2>
              </div>
              <span className="fs-bar-pill relative z-10">
                <span className="fs-live-dot" aria-hidden /> Live
              </span>
            </div>
            <div className="fs-stripes" aria-hidden />

            <div className="relative">{children}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function QuickDealSkeleton() {
  return (
    <div aria-busy className="p-3 md:p-4">
      <div className="mb-4 flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-8 w-24 animate-pulse rounded-full bg-muted" />)}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={i >= 2 ? (i >= 3 ? "hidden lg:block" : "hidden md:block") : undefined}>
            <div className="aspect-[2/3] animate-pulse rounded-[3px] bg-muted" />
            <div className="mt-3 h-3 w-4/5 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-muted" />
            <div className="mt-3 h-8 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function QuickDeal() {
  const q = useQuery(["deals", "quick"], () => services.deals.quickDeals(12));

  if (q.loading) return <Shell><QuickDealSkeleton /></Shell>;
  if (q.error) return <Shell><div className="p-4"><ErrorState compact title="Couldn't load deals" onRetry={q.refetch} /></div></Shell>;
  const tabs = (q.data ?? []).filter((t) => t.items.length > 0);
  if (tabs.length === 0) return null;
  return <Shell><QuickDealTabs tabs={tabs} /></Shell>;
}
