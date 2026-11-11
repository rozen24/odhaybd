// Storefront home. Above-the-fold (hero, popular searches, category tiles,
// flash sale) loads immediately; everything else is lazy-mounted as it nears
// the viewport so the page doesn't fire every request at once.

import { PopularSearchChips } from "../layout/Header";
import { LazySection } from "../common/LazySection";
import { HeroSection, useBanners } from "../home/Hero";
import { CategorySections, CategoryTiles } from "../home/Categories";
import {
  CampaignCollection, ExploreTabs, FlashSale, Recommendations, RecentlySold, TopAuthors, TopPublishers,
} from "../home/Collections";
import { NewsletterBlock, ServiceStrip } from "../home/Newsletter";
import { CONTAINER, QueryRailSection } from "../home/shared";
import { QuickDeal } from "../home/quick-deal/QuickDeal";
import { CategoryCollectionSlider } from "../home/category-collection/CategoryCollectionSlider";

export default function HomePage() {
  const { campaign } = useBanners();

  return (
    <div className="pb-6">
      <div className={`${CONTAINER} pt-4`}>
        <PopularSearchChips className="mb-4" />
        <HeroSection />
      </div>
      <CategoryTiles />
      <LazySection><CategoryCollectionSlider /></LazySection> 
      
      <FlashSale />
      <QuickDeal />
                  
      <LazySection>
        <QueryRailSection eyebrow="Most loved" title="Best sellers" subtitle="What everyone's reading right now" href="/books?flag=bestseller" query={{ flag: "bestseller" }} />
      </LazySection>
      

      <CategorySections />

      <LazySection><TopAuthors /></LazySection>
      <LazySection><RecentlySold /></LazySection>
      <LazySection>
        <QueryRailSection eyebrow="Fresh off the press" title="New releases" href="/books?flag=new" query={{ flag: "new", sort: "newest" }} />
      </LazySection>
      <LazySection>
        <QueryRailSection eyebrow="Offers" title="Biggest discounts" subtitle="The deepest price cuts in the shop" href="/books?minDiscount=1&sort=discount" query={{ sort: "discount", minDiscount: 1 }} band />
      </LazySection>
      <LazySection><TopPublishers /></LazySection>
      <LazySection><CampaignCollection banners={campaign} /></LazySection>
      <LazySection><Recommendations /></LazySection>
      <LazySection minHeight={480}><ExploreTabs /></LazySection>
      <LazySection minHeight={200}><NewsletterBlock /></LazySection>
      <ServiceStrip />
    </div>
  );
}
