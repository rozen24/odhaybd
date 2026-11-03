# Next.js migration plan
_Exported on 10/8/2026 at 02:43:53 GMT+6 from Cursor (3.23.23)_

---

**User**

MIGRATE EXISTING FIGMA REACT APP TO NEXT.JS + POSTGRESQL + PWA
ROLE:
Act as a senior Next.js architect, full-stack engineer, database architect, and PWA engineer.
PROJECT:
I have an existing e-commerce/bookstore web application created with Figma Make in this bookstore folder I added.
The current application is a frontend prototype/application generated with React, TypeScript, Tailwind CSS, shadcn/ui and related frontend libraries.
I now want to convert the existing project into a production-ready full-stack Next.js application.
IMPORTANT:
Do NOT rebuild the application from scratch.
Use the existing project as the source of truth for the UI/UX.
The migration must preserve the existing design, components, pages, layouts, product cards, product loops, cart UI, Quick Deal section, category collection slider, navigation, responsive behavior, and existing functionality unless a change is specifically required for the migration.
==================================================
1. TARGET TECHNOLOGY STACK
==================================================
Convert the application to:
Frontend:
- Next.js
- TypeScript
- React
- Tailwind CSS
- shadcn/ui
- Lucide icons
Architecture:
- Next.js App Router
- Server Components by default
- Client Components only where interactivity is required
- Server Actions and/or Route Handlers where appropriate
Database:
- PostgreSQL
ORM:
- Prisma ORM
Authentication:
- Implement an architecture that can support:
  - Customer accounts
  - Admin accounts
  - Seller/vendor accounts if required later
PWA:
- Installable Progressive Web App
- Web App Manifest
- Service Worker
- Offline support
- Install prompt
- App icons
- Splash/loading experience
- Mobile-friendly behavior
State management:
- Reuse the existing state-management solution if appropriate.
- Do not introduce another state-management library unnecessarily.
Data fetching:
- Prefer Server Components for server-side data.
- Use client-side data fetching only where interactive/persistent client state is required.
==================================================
2. FIRST: ANALYZE THE EXISTING PROJECT
==================================================
Before modifying anything, inspect the complete project.
Analyze:
- package.json
- source directory structure
- routes/pages
- components
- layouts
- hooks
- utilities
- services
- API calls
- mock/seed data
- product models
- cart logic
- wishlist logic
- compare logic
- authentication-related code
- forms
- images/assets
- Tailwind configuration
- shadcn configuration
- environment variables
- localStorage usage
- session/state management
- responsive behavior
Create a migration plan internally before making changes.
IMPORTANT:
Do not immediately start rewriting files.
First understand how the existing application works.
==================================================
3. PRESERVE THE EXISTING UI/UX
==================================================
The current Figma-generated UI is the design reference.
Preserve:
- Header
- Top navigation
- Search
- Main navigation
- Product loops
- Product cards
- Product details
- Quick Deal
- Deal tabs
- Category collection slider
- Category sections
- Best sellers
- New releases
- Product recommendations
- Cart
- Shopping cart drawer
- Wishlist
- Compare
- Footer
- Buttons
- Typography
- Spacing
- Borders
- Shadows
- Cards
- Responsive layouts
- Mobile navigation
- Desktop navigation
Do NOT redesign the application during migration.
The objective is:
EXISTING UI
        ↓
NEXT.JS APPLICATION
NOT:
EXISTING UI
        ↓
COMPLETELY DIFFERENT UI
Only make UI changes when required for:
- Next.js compatibility
- accessibility
- responsiveness
- performance
- PWA functionality
- backend integration
==================================================
4. CONVERT VITE/REACT TO NEXT.JS
==================================================
Replace the existing Vite application architecture with Next.js App Router.
Create a clean structure similar to:
src/
  app/
    layout.tsx
    page.tsx
    globals.css
    products/
      page.tsx
      [slug]/
        page.tsx
    categories/
      page.tsx
      [slug]/
        page.tsx
    authors/
      [slug]/
        page.tsx
    publishers/
      [slug]/
        page.tsx
    cart/
      page.tsx
    checkout/
      page.tsx
    wishlist/
      page.tsx
    compare/
      page.tsx
    account/
      page.tsx
    admin/
      page.tsx
    api/
      ...
  components/
    ui/
    layout/
    home/
    product/
    cart/
    checkout/
    category/
    account/
    admin/
  lib/
    prisma.ts
    auth.ts
    utils.ts
    validations/
  services/
    product.service.ts
    category.service.ts
    cart.service.ts
    order.service.ts
    user.service.ts
  repositories/
    product.repository.ts
    category.repository.ts
    order.repository.ts
    user.repository.ts
  types/
  hooks/
  config/
Use the actual existing project structure where practical instead of blindly forcing this structure.
==================================================
5. NEXT.JS APP ROUTER
==================================================
Use the App Router.
Use:
- Server Components by default
- Client Components only when necessary
Components requiring:
- onClick
- useState
- useEffect
- browser APIs
- cart interaction
- wishlist interaction
- carousel interaction
- PWA installation
- local client state
may use:
"use client";
Do NOT convert the entire application to Client Components.
Keep data-heavy pages and layouts server-rendered wherever possible.
==================================================
6. NEXT.JS IMAGE OPTIMIZATION
==================================================
Replace unnecessary <img> usage with:
next/image
where appropriate.
Implement:
- responsive image sizes
- lazy loading
- priority loading for important hero images
- appropriate width/height/aspect ratio
- optimized product images
Do not break the existing image appearance.
==================================================
7. POSTGRESQL DATABASE
==================================================
Add PostgreSQL as the primary database.
Use Prisma ORM.
Create:
prisma/
  schema.prisma
  seed.ts
Configure:
DATABASE_URL
in:
.env
Example:
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public"
DO NOT hardcode database credentials.
==================================================
8. DESIGN THE DATABASE PROPERLY
==================================================
Create a scalable schema suitable for a large online bookstore/e-commerce application.
At minimum support:
User
Role
Product
Category
Subcategory
Author
Publisher
ProductAuthor
ProductCategory
ProductImage
ProductVariant
Inventory
Cart
CartItem
Wishlist
WishlistItem
CompareList
CompareItem
Order
OrderItem
Payment
Address
Coupon
Review
Rating
DealCampaign
DealProduct
HomepageSection
HomepageSectionItem
Banner
Search history if required
The schema should be normalized and scalable.
Use:
- UUID or appropriate stable IDs
- timestamps
- indexes
- unique constraints
- foreign keys
- cascading rules where appropriate
Use PostgreSQL-native capabilities where beneficial.
==================================================
9. PRODUCT DATABASE
==================================================
Products should support:
- title
- slug
- SKU
- description
- short description
- ISBN where applicable
- brand/author/publisher
- regular price
- sale price
- discount
- stock
- images
- categories
- tags
- ratings
- reviews
- active/inactive status
- featured status
- bestseller status
- new-release status
Do not store calculated values unnecessarily if they can safely be derived.
For pricing:
regularPrice
salePrice
discountAmount
discountPercentage
must remain mathematically consistent.
==================================================
10. CART SYSTEM
==================================================
Move the existing cart system from frontend-only/mock/localStorage logic to a scalable architecture.
Support:
- Add product
- Remove product
- Increase quantity
- Decrease quantity
- Update quantity
- Clear cart
- Cart subtotal
- Discount
- Savings
- Shipping
- Grand total
For guest users:
Use a guest cart mechanism such as:
- secure cookie/cart token
- or client-side temporary cart
For authenticated users:
Persist the cart in PostgreSQL.
When a guest logs in:
Merge guest cart with the user's database cart.
Do not duplicate cart items.
==================================================
11. SHOPPING CART DRAWER
==================================================
Keep the existing shopping cart drawer design.
When:
"Add to Cart"
is clicked:
1. Add product to cart.
2. Update cart state.
3. Open the right-side cart drawer.
4. Update cart count.
5. Update subtotal.
6. Update savings.
7. Update free-shipping progress.
The drawer must work with the PostgreSQL-backed cart system.
Do not create a separate fake cart state.
==================================================
12. QUICK DEAL SYSTEM
==================================================
Convert the existing Quick Deal section into a database-driven system.
Support:
- Today's Deal
- Buy 1 Get 1
- Free Shipping
- Best Price
- Clearance Sale if enabled
Use database entities such as:
DealCampaign
DealProduct
Each campaign should support:
- name
- slug
- type
- startAt
- endAt
- active status
- display order
Deal products should support:
- product
- original price
- deal price
- stock limit
- sold count
- display order
The frontend must retrieve real data from PostgreSQL.
Do not hardcode the Quick Deal products.
==================================================
13. HOMEPAGE CMS / DYNAMIC SECTIONS
==================================================
Make the homepage database-driven.
The homepage should support dynamic sections such as:
- Hero Banner
- Quick Deal
- Category Collections
- Best Sellers
- New Releases
- Featured Products
- Academic Books
- Islamic Books
- Language Books
- Novels
- Motivational Books
- Children & Teen
- Thriller
- Recruitment/Admission
- Biography
- Business
- Story Books
- Electronics
- Beauty/Health
- Islamic Accessories
- Grocery
- Stationery
- Kitchen/Household
- Recommendations
- Recently Viewed
- Top Authors
- Publishers
Create a flexible homepage section system.
Admin should eventually be able to:
- create section
- edit section
- reorder section
- activate/deactivate section
- add products
- remove products
- change title
- change banner
- change display type
Do not hardcode the entire homepage structure.
==================================================
14. CATEGORY COLLECTION SLIDER
==================================================
Keep the existing category collection slider.
Each collection can contain:
- title
- category
- 4 featured products
- display order
- active status
The UI should remain similar to the existing design.
Retrieve the data from PostgreSQL.
==================================================
15. PRODUCT LOOP
==================================================
Keep the existing product loop design.
Add/use:
- Product image
- Product title
- Author/brand
- Regular price
- Sale price
- Discount %
- Amount saved
- Wishlist
- Compare
- Add to Cart
Product hover:
- Smooth image scale
- Smooth action icons
- Smooth transitions
- No layout jumping
Use CSS transforms rather than expensive JavaScript animations.
==================================================
16. SEARCH
==================================================
Create a scalable search architecture.
Initially support PostgreSQL search.
Structure the code so it can later be upgraded to:
- Meilisearch
- Elasticsearch
- OpenSearch
without rewriting the UI.
Search should support:
- Product title
- ISBN
- Author
- Publisher
- Category
- Brand
- SKU
==================================================
17. AUTHENTICATION
==================================================
Prepare authentication architecture for:
CUSTOMER
ADMIN
EDITOR
SELLER
Do not expose admin functionality to normal users.
Implement proper authorization checks on the server.
IMPORTANT:
Never rely only on frontend role checks.
Every protected server action/API must verify authorization.
==================================================
18. ADMIN ARCHITECTURE
==================================================
Create the foundation for an admin dashboard.
Admin should eventually manage:
- Products
- Categories
- Authors
- Publishers
- Orders
- Customers
- Inventory
- Coupons
- Deals
- Homepage sections
- Banners
- Reviews
- Users
- Roles
Use a reusable service/repository architecture.
==================================================
19. PWA IMPLEMENTATION
==================================================
Convert the Next.js application into a Progressive Web App.
Implement:
- Web App Manifest
- Service Worker
- Offline fallback
- Installable application
- App icons
- Theme color
- Background color
- Standalone display mode
- Mobile viewport optimization
Create appropriate files such as:
public/
  icons/
  manifest.webmanifest
and the required service-worker/PWA integration.
Use a mature Next.js-compatible PWA implementation rather than writing a fragile custom service worker unless there is a specific reason.
IMPORTANT:
Do NOT cache sensitive/private data incorrectly.
Never cache:
- payment information
- private account information
- authenticated sensitive API responses
- admin responses
Prefer safe caching for:
- static assets
- public images
- public product/category data where appropriate
==================================================
20. PWA INSTALL EXPERIENCE
==================================================
Add an install experience.
On supported browsers:
Show an unobtrusive:
"Install App"
or
"Add to Home Screen"
option.
Do not repeatedly annoy the user.
Store appropriate client-side state so the prompt does not appear unnecessarily often.
==================================================
21. OFFLINE EXPERIENCE
==================================================
Create an offline fallback page.
Example:
"You are offline"
with:
"Some features may not be available until your connection is restored."
Previously cached public pages/assets should remain usable where practical.
Do not pretend checkout/payment works offline.
==================================================
22. RESPONSIVE DESIGN
==================================================
The application must work correctly on:
- Desktop
- Laptop
- Tablet
- Mobile
Test:
320px
375px
390px
414px
768px
1024px
1280px
1440px+
Do not introduce horizontal page overflow.
==================================================
23. PERFORMANCE
==================================================
Optimize for:
- Core Web Vitals
- LCP
- CLS
- INP
- TTFB
Use:
- Server Components
- streaming where appropriate
- Suspense
- next/image
- dynamic imports where useful
- caching/revalidation
- database indexes
- efficient Prisma queries
- pagination
- lazy loading
Do not fetch the entire product catalog on the homepage.
==================================================
24. SECURITY
==================================================
Implement secure architecture.
Never:
- expose DATABASE_URL
- expose Prisma credentials
- trust frontend role checks
- accept arbitrary user-controlled database queries
- expose admin APIs publicly without authorization
- store plaintext passwords
- expose private user data
Validate all user input.
Use schema validation such as Zod where appropriate.
Protect:
- API routes
- Server Actions
- admin routes
- checkout
- order operations
- account operations
==================================================
25. ENVIRONMENT CONFIGURATION
==================================================
Create:
.env.example
with placeholders such as:
DATABASE_URL=
NEXT_PUBLIC_APP_URL=
AUTH_SECRET=
and any other required variables.
Never commit:
.env
or secrets.
==================================================
26. DATABASE MIGRATION
==================================================
Use Prisma migrations.
Commands should follow a workflow similar to:
npx prisma7 generate
npx prisma7 migrate dev
npx prisma7 db seed
For production:
npx prisma7 migrate deploy
Do not use destructive database resets on a production database.
==================================================
27. SEED DATA
==================================================
Create realistic development seed data.
Seed:
- Users
- Categories
- Authors
- Publishers
- Products
- Product images
- Deals
- Homepage sections
- Banners
The seed data should be structurally realistic.
Do not replace existing UI with fake/random content if the project already contains usable product data.
==================================================
28. API / SERVICE ARCHITECTURE
==================================================
Do not put all database queries directly inside UI components.
Use:
UI
 ↓
Server Action / Route Handler
 ↓
Service
 ↓
Repository
 ↓
Prisma
 ↓
PostgreSQL
For example:
ProductCard
 ↓
Cart Action
 ↓
CartService
 ↓
CartRepository
 ↓
Prisma
 ↓
PostgreSQL
This architecture should make the project maintainable.
==================================================
29. TYPESCRIPT
==================================================
Use strict TypeScript.
Avoid:
any
unless absolutely necessary.
Create reusable types.
Ensure Prisma types and frontend types are consistent.
==================================================
30. ERROR HANDLING
==================================================
Implement proper:
- loading states
- error states
- empty states
- skeletons
- database error handling
- network error handling
Use Next.js:
loading.tsx
error.tsx
not-found.tsx
where appropriate.
==================================================
31. SEO
==================================================
Since this is an e-commerce/bookstore website, implement proper Next.js SEO.
Support:
- title
- description
- canonical URLs
- Open Graph
- Twitter metadata
- product metadata
- category metadata
- sitemap
- robots.txt
- structured data where appropriate
For products, consider:
Product
Offer
AggregateRating
BreadcrumbList
structured data.
==================================================
32. ROUTING
==================================================
Use SEO-friendly URLs.
Examples:
/products/[slug]
/category/[slug]
/author/[slug]
/publisher/[slug]
/search?q=...
/cart
/checkout
/account
/admin
Avoid unnecessary query-based URLs when a clean slug route is more appropriate.
==================================================
33. MIGRATION RULES
==================================================
IMPORTANT:
Do not destroy the current application.
Before migration:
1. Inspect the project.
2. Identify reusable components.
3. Identify reusable styles.
4. Identify existing functionality.
5. Identify mock data.
6. Identify dependencies.
7. Identify browser-only code.
8. Identify localStorage usage.
9. Identify routing.
10. Identify state management.
Then migrate systematically.
If a component can be reused:
REUSE IT.
If it needs modification:
ADAPT IT.
Only rewrite it when necessary.
==================================================
34. DO NOT BREAK EXISTING FEATURES
==================================================
After migration verify:
- Homepage
- Header
- Navigation
- Search
- Product listing
- Product details
- Product loop
- Quick Deal
- Category slider
- Cart
- Cart drawer
- Wishlist
- Compare
- Responsive navigation
- Footer
- Forms
All must continue working.
==================================================
35. TESTING
==================================================
After implementation perform:
TypeScript check
Lint check
Production build
Database connection test
Prisma validation
Route testing
Responsive testing
PWA manifest testing
Service worker testing
Cart testing
Authentication/authorization testing
==================================================
36. FINAL PROJECT STRUCTURE
==================================================
The final project should conceptually follow:
Next.js
│
├── App Router
│
├── React + TypeScript
│
├── Tailwind + shadcn/ui
│
├── PostgreSQL
│     └── Prisma
│
├── Authentication
│
├── Service Layer
│
├── Repository Layer
│
├── API / Server Actions
│
├── PWA
│     ├── Manifest
│     ├── Service Worker
│     ├── Offline Support
│     └── Install Experience
│
└── Existing Figma UI
      ├── Homepage
      ├── Product Loop
      ├── Quick Deal
      ├── Category Slider
      ├── Cart
      ├── Wishlist
      ├── Compare
      └── Responsive UI
==================================================
37. IMPLEMENTATION ORDER
==================================================
Follow this order:
PHASE 1
Analyze the existing Figma project.
PHASE 2
Convert Vite/React structure to Next.js App Router.
PHASE 3
Make the existing UI work perfectly in Next.js.
PHASE 4
Configure PostgreSQL + Prisma.
PHASE 5
Create database schema and migrations.
PHASE 6
Create seed data.
PHASE 7
Create service/repository architecture.
PHASE 8
Connect products/categories/deals to PostgreSQL.
PHASE 9
Migrate cart/wishlist/compare functionality.
PHASE 10
Implement authentication and authorization foundation.
PHASE 11
Implement dynamic homepage sections.
PHASE 12
Implement admin-ready architecture.
PHASE 13
Add PWA functionality.
PHASE 14
Add offline support and installation experience.
PHASE 15
Optimize performance and SEO.
PHASE 16
Run complete testing and fix all issues.
==================================================
38. MOST IMPORTANT RULE
==================================================
DO NOT sacrifice the existing UI during the migration.
The goal is:
Figma-generated frontend
        ↓
Production-quality Next.js frontend
        ↓
PostgreSQL + Prisma backend
        ↓
Scalable e-commerce architecture
        ↓
Installable PWA
Keep the existing visual identity and user experience while transforming the underlying architecture into a professional production-ready system.
Start by analyzing the current project and then execute the migration phase by phase.
Do not make unrelated design changes.
Do not delete working functionality.
Do not use fake backend behavior when PostgreSQL functionality should be implemented.
Do not create duplicate cart/product/state systems.create a plan to implement a new feature:

---

**Cursor**

I’ll inspect the existing bookstore app first so the migration plan matches the real UI, routing, and data flow—then I’ll turn that into a phase-by-phase Next.js + PostgreSQL + PWA plan without rewriting yet.

The app is already a structured bookstore SPA, not a throwaway Figma dump. The migration should **swap the Vite + Supabase KV shell** while **keeping this UI, routes, and repository contracts**.

## What you have today

**Stack:** Vite 6 + React 18 + TypeScript + Tailwind 4 + shadcn/ui + Lucide. Brand is **Pustak BD** / Boierpata (`guidelines/Guidelines.md`).

**Routing (keep these URLs):**

| Current | Do not rename to |
|---|---|
| `/books`, `/book/:slug` | `/products`, `/products/:slug` |
| `/category/:slug`, `/author/:slug`, `/publisher/:slug` | `/categories/...` |
| `/search`, `/cart`, `/wishlist`, `/compare`, `/checkout` | — |
| `/account/*`, `/seller/*`, `/admin/*` | — |

The prompt’s `/products` tree would **break SEO, nav, and every `Link`**. Map App Router to the **existing** paths.

**Already-good architecture:**
- Domain types in `src/types/index.ts` (Book, DealCampaign, HomeCategorySection, roles, orders).
- Repository interfaces in `src/services/repositories.ts`.
- UI talks only to `services` (`src/services/index.ts`).
- Homepage already uses Quick Deal + category collections as **data-driven** sections.

**Current backends (replace):**
- Catalog/auth: Supabase Auth + Hono edge function + **KV store**, not PostgreSQL.
- Cart / wishlist / compare / recently viewed: **localStorage** (`bp.cart`, etc.) via `StoreContext`.
- Seed: realistic BD catalog in `src/services/seed.ts`, posted to `/seed`.

**Client-only pieces to mark `"use client"`:** Header, MegaMenu, MobileNav, SearchBar, cart drawer, BookCard actions, carousels (Embla), Quick Deal tabs, CatalogBrowser filters, Auth/Store/QuickView contexts.

---

## Guiding decisions (so we don’t rebuild)

1. **Reuse components.** Convert `react-router` `Link`/`useNavigate`/`useParams` → Next `Link`/`useRouter`/`useParams`. Do not restyle.
2. **Keep repository interfaces.** New Prisma repos implement the same methods; UI stays on `services`.
3. **Keep TanStack Query** for interactive client fetches. Server Components load first-paint catalog/homepage data.
4. **Keep existing seed content.** Port `seed.ts` into `prisma/seed.ts`; don’t invent a new catalog.
5. **One cart.** Drawer, `/cart`, and checkout all read the same Prisma cart (plus a guest cookie). No parallel localStorage cart after Phase 9.
6. **Auth on the server.** Today `ProtectedRoute` is client-only. Next.js `middleware` + server checks on every admin/seller/account action.

---

## Target shape (adapted, not forced)

```
src/
  app/                    # App Router (existing URLs)
    layout.tsx            # fonts, theme, Providers, PWA
    page.tsx              # HomePage
    books/ page.tsx
    book/[slug]/page.tsx
    category/[slug]/page.tsx
    author/[slug]/page.tsx
    publisher/[slug]/page.tsx
    search/page.tsx
    cart/ wishlist/ compare/ checkout/
    account/ seller/ admin/ …
    offline/page.tsx
    api/auth/[...nextauth]/
    robots.ts sitemap.ts
  components/             # MOVE existing UI here (same folders)
  lib/prisma.ts auth.ts utils.ts
  services/               # keep interfaces; Prisma implementations
  repositories/           # Prisma adapters
  actions/                # cart, wishlist, auth-sensitive writes
prisma/schema.prisma seed.ts
public/icons/ manifest.webmanifest
```

Vite `src/app/*` pages become Next `src/app/*` routes; presentational files move under `src/components`.

---

## Database (Prisma + PostgreSQL)

Normalize what is now nested JSON, without throwing away bookshop fields.

**Identity:** `User` (id UUID, email unique, passwordHash, role `CUSTOMER | EDITOR | SELLER | ADMIN`, status, wallet, points) · `Account`/`Session` for Auth.js · `Address` · `Seller`.

**Catalog:** `Product` (maps today’s `Book`: slug, sku, isbn, title, descriptions, language, binding, pages, regularPrice, salePrice, stock, flags, status) · `ProductImage` · `ProductAuthor` · `ProductCategory` · `Author` · `Publisher` · `Category` (self-parent for subcategories) · `Tag` / `ProductTag` · `Inventory` (optional first version: stock on Product).

**Pricing:** store `regularPrice` + `salePrice` only. Derive discount amount/% in code. Deal rows may snapshot `originalPrice`/`dealPrice` for the campaign.

**Commerce:** `Cart` (userId XOR guestToken) · `CartItem` (unique cartId+productId) · `Wishlist`/`WishlistItem` · `CompareList`/`CompareItem` · `Order`/`OrderItem`/`Payment` · `Coupon` · `Review` (rating lives on review; aggregate on product via query or cached columns updated on write).

**Merchandising:** `DealCampaign` / `DealProduct` (already typed) · `HomepageSection` / `HomepageSectionItem` (generalize current `HomeCategorySection`) · `Banner` · `StoreSettings` · `SearchQuery` (optional).

Indexes: slug/sku/isbn unique, full-text on title+isbn, FKs, `(campaignId, displayOrder)`, active flags.

---

## Cart / guest merge

- Guest: httpOnly `cart_token` cookie → `Cart.guestToken`.
- Logged in: `Cart.userId`.
- On login: merge by product id (sum qty, cap at stock), then drop guest cart.
- `addToCart` Server Action → Prisma → return cart DTO → `StoreProvider` updates count + **opens existing drawer**. Same source for drawer, cart page, checkout.

Wishlist/compare: same pattern (guest cookie or local until login, then persist). Compare max 4 stays.

---

## Auth

Replace Supabase with **Auth.js (NextAuth v5) + Prisma + credentials** (Google later). Roles: CUSTOMER, ADMIN, EDITOR, SELLER.

- `middleware.ts` protects `/admin`, `/seller`, `/account`.
- Every Server Action/Route Handler re-checks session + role. UI hiding is not enough.
- Seed: `admin@…`, `editor@…`, `seller@…`, `customer@…` with hashed passwords from env, never committed.

---

## Homepage & search

- Server-load: banners, quick deals, category collections, a **limited** bestseller/new rail (do not load full catalog).
- Keep `LazySection` + client carousels.
- Admin already has Quick Deals + Home Collections pages — point them at Prisma.
- Search: Prisma `contains` / `to_tsvector` behind `SearchRepository.suggest` so Meilisearch can replace the repo later without UI changes.

---

## PWA

- `@serwist/next` (or official Serwist Next plugin): manifest, icons, standalone, theme `#9E2A2B` / background `#FAF7F2`.
- Cache static assets + public catalog pages. **Never cache** `/account`, `/admin`, `/checkout`, `/api/auth`, payments.
- `/offline` fallback copy: connection required for checkout.
- Install control: `beforeinstallprompt`, dismiss stored in localStorage (e.g. 14 days), unobtrusive header/account CTA.

---

## Phase plan (execute in this order)

**Phase 1 — Analysis (done).** UI, routes, repos, localStorage cart, Supabase KV, seed catalog.

**Phase 2 — Next.js shell.** Add Next App Router beside Vite; Tailwind 4 + path alias `@`; copy `styles/`; `next/font` for Fraunces/Figtree/Hind Siliguri. Keep Vite until Next `dev` matches the storefront visually.

**Phase 3 — UI parity.** Move layouts/pages; replace router APIs; `next/image` in `ImageWithFallback`/`BookCover` without changing aspect/spine look; homepage, catalog, PDP, cart drawer, footer, mobile nav all work with **seed still optional / mock via same services** if DB isn’t up yet.

**Phase 4–6 — Prisma.** `.env.example` (`DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`). Schema + `migrate dev` + seed from existing `seed.ts` including deals/homepage/banners.

**Phase 7–8 — Wire catalog.** Prisma repos; homepage/PDP/category/author/publisher/search read PostgreSQL. Remove KV/edge function from the data path.

**Phase 9 — Cart family.** Server Actions + merge; keep drawer UX; delete localStorage as source of truth (one-time import from `bp.cart` is optional).

**Phase 10 — Auth.** Auth.js, middleware, server authorization, login/register/reset using existing auth pages.

**Phase 11–12 — CMS + admin foundation.** Homepage sections from DB; admin/seller layouts stay; mutations go through authorized services (not a new admin UI).

**Phase 13–14 — PWA** (manifest, SW, offline, install prompt).

**Phase 15 — SEO/perf.** Metadata, JSON-LD Product/Offer/AggregateRating/BreadcrumbList, sitemap, robots, pagination, `loading.tsx`/`error.tsx`/`not-found.tsx`.

**Phase 16 — Verify.** `tsc`, lint, `next build`, Prisma validate, cart/auth/PWA checks, viewports 320–1440.

---

## What we will not do

- Redesign or rename routes to the prompt’s generic `/products` tree.
- Dual cart (localStorage + DB).
- Hardcoded Quick Deal products after seed.
- Fetching the full catalog on the homepage.
- Trusting only client `ProtectedRoute`.
- Committing `.env` or keeping live Supabase keys in source after cutover.

---

## Risks to handle in implementation

- **Tailwind 4 + Next** needs the same Vite-era CSS pipeline (`@tailwindcss/postcss` or equivalent).
- Hundreds of `react-router` imports — mechanical, must be complete.
- **MUI** is in `package.json`; drop it if unused to keep the bundle clean.
- `figma:asset/` Vite plugin must become normal `public/` or `src/assets` imports.
- Guest cart cookie must be httpOnly + unguessable.

---

This is the implementation plan, not the rewrite. If you want me to start, the first coding slice is **Phase 2 + 3**: Next.js App Router with existing pages/components and current URLs, still talking to the same `services` layer, before Prisma is introduced. Say the word and I’ll begin there.

Starting Phase 2–3: Next.js App Router with the existing UI and URLs. I’ll inspect the remaining Vite entrypoints, then add the Next shell without moving or restyling components.

Setting up the Next.js foundation and a React Router compatibility layer so we can keep existing URLs and UI while swapping the Vite shell.
