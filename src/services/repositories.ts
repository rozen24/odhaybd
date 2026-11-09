// Repository interfaces (the swap point) + client-side local stores for the
// cart-family state (cart / wishlist / compare / recently-viewed). Data-domain
// repositories are implemented against the app's HTTP API in ./http-repositories.ts.
// Later, a REST/Prisma backend can implement these same interfaces and be wired
// in ./index.ts with no component changes.

import type {
  Author, Banner, BlogPost, Book, BookQuery, Category, CmsPage, Coupon,
  AppNotification, Order, OrderStatus, Paginated, Profile, Publisher, Review,
  Seller, UserRole, AccountStatus, StoreSettings, AdminReport,
  DealCampaign, DealProduct, DealTab, HomeCategorySection, HomeCategoryItem, CategoryCollection,
} from "../types";

export interface DealsRepository {
  quickDeals(limit?: number): Promise<DealTab[]>;
  campaigns(): Promise<DealCampaign[]>;
  createCampaign(c: Partial<DealCampaign>): Promise<DealCampaign>;
  updateCampaign(id: string, c: Partial<DealCampaign>): Promise<DealCampaign>;
  removeCampaign(id: string): Promise<void>;
  reorderCampaigns(ids: string[]): Promise<void>;
  products(campaignId: string): Promise<{ deal: DealProduct; book?: Book }[]>;
  addProduct(p: {
    campaign_id: string; product_id: string; deal_price: number;
    stock_limit?: number | null; display_order?: number; is_active?: boolean;
  }): Promise<DealProduct>;
  updateProduct(campaignId: string, id: string, p: Partial<DealProduct>): Promise<DealProduct>;
  removeProduct(campaignId: string, id: string): Promise<void>;
}

export interface HomeSectionsRepository {
  collections(): Promise<CategoryCollection[]>;
  list(): Promise<(HomeCategorySection & { items: HomeCategoryItem[] })[]>;
  create(s: Partial<HomeCategorySection>): Promise<HomeCategorySection>;
  update(id: string, s: Partial<HomeCategorySection>): Promise<HomeCategorySection>;
  remove(id: string): Promise<void>;
  reorder(ids: string[]): Promise<void>;
  setItems(id: string, productIds: string[]): Promise<HomeCategoryItem[]>;
}

/* ------------------------------------------------------------------ */
/* Interfaces                                                          */
/* ------------------------------------------------------------------ */

export interface BooksRepository {
  list(query: BookQuery): Promise<Paginated<Book>>;
  getBySlug(slug: string): Promise<Book | undefined>;
  getById(id: string): Promise<Book | undefined>;
  getMany(ids: string[]): Promise<Book[]>;
  related(book: Book): Promise<Book[]>;
  frequentlyBoughtTogether(book: Book): Promise<Book[]>;
  create(book: Partial<Book>): Promise<Book>;
  update(id: string, patch: Partial<Book>): Promise<Book>;
  remove(id: string): Promise<void>;
}

export interface CatalogRepository {
  authors(): Promise<Author[]>;
  authorBySlug(slug: string): Promise<Author | undefined>;
  publishers(): Promise<Publisher[]>;
  publisherBySlug(slug: string): Promise<Publisher | undefined>;
  categories(): Promise<Category[]>;
  categoryBySlug(slug: string): Promise<Category | undefined>;
  sellers(): Promise<Seller[]>;
  sellerBySlug(slug: string): Promise<Seller | undefined>;
  banners(): Promise<Banner[]>;
}

export interface CouponsRepository {
  all(): Promise<Coupon[]>;
  create(coupon: Partial<Coupon>): Promise<Coupon>;
  remove(code: string): Promise<void>;
  validate(code: string, subtotal: number): Promise<{ ok: boolean; discount: number; message: string; coupon?: Coupon }>;
}

export interface AdminUsersRepository {
  list(): Promise<Profile[]>;
  create(input: { name: string; email: string; password: string; role: UserRole }): Promise<Profile>;
  setRole(id: string, role: UserRole): Promise<Profile>;
  setStatus(id: string, status: AccountStatus): Promise<Profile>;
  remove(id: string): Promise<void>;
}

export interface OrdersRepository {
  create(order: Partial<Order>): Promise<Order>;
  listForUser(): Promise<Order[]>;
  listAll(): Promise<Order[]>;
  listForSeller(): Promise<Order[]>;
  getById(id: string): Promise<Order | undefined>;
  updateStatus(id: string, status: OrderStatus, note?: string): Promise<Order>;
}

export interface ReviewsRepository {
  forBook(bookId: string): Promise<Review[]>;
  forUser(): Promise<Review[]>;
  pending(): Promise<Review[]>;
  add(review: Partial<Review>): Promise<Review>;
  setApproved(id: string, approved: boolean): Promise<void>;
}

export interface NotificationsRepository {
  forUser(): Promise<AppNotification[]>;
  markRead(id: string): Promise<void>;
  add(notification: Partial<AppNotification>): Promise<void>;
}

export interface ContentRepository {
  blogPosts(): Promise<BlogPost[]>;
  blogBySlug(slug: string): Promise<BlogPost | undefined>;
  cmsPage(slug: string): Promise<CmsPage | undefined>;
}

export interface SearchRepository {
  suggest(term: string): Promise<{ books: Book[]; authors: Author[]; categories: Category[]; publishers?: Publisher[] }>;
  popular(): Promise<string[]>;
}

// Admin-only catalog writes (authors / publishers / categories / banners).
export interface CatalogAdminRepository {
  createAuthor(a: Partial<Author>): Promise<Author>;
  updateAuthor(id: string, a: Partial<Author>): Promise<Author>;
  removeAuthor(id: string): Promise<void>;
  createPublisher(p: Partial<Publisher>): Promise<Publisher>;
  updatePublisher(id: string, p: Partial<Publisher>): Promise<Publisher>;
  removePublisher(id: string): Promise<void>;
  createCategory(c: Partial<Category>): Promise<Category>;
  updateCategory(id: string, c: Partial<Category>): Promise<Category>;
  removeCategory(id: string): Promise<void>;
  createBanner(b: Partial<Banner>): Promise<Banner>;
  updateBanner(id: string, b: Partial<Banner>): Promise<Banner>;
  removeBanner(id: string): Promise<void>;
  reorderBanners(ids: string[]): Promise<void>;
}

export interface StoreRepository {
  settings(): Promise<StoreSettings>;
  saveSettings(s: StoreSettings): Promise<StoreSettings>;
  recentlySold(): Promise<Book[]>;
  subscribe(email: string): Promise<{ ok: boolean; already: boolean }>;
  reports(): Promise<AdminReport>;
}

/* ------------------------------------------------------------------ */
/* Client-side local stores (cart / wishlist / compare / recent)       */
/* ------------------------------------------------------------------ */

export interface LocalCartItem { bookId: string; variantId?: string; qty: number }

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore quota */ }
}

const CART_KEY = "bp.cart";
const WISH_KEY = "bp.wishlist";
const CMP_KEY = "bp.compare";
const RECENT_KEY = "bp.recent";
const MAX_RECENT = 12;
const MAX_COMPARE = 4;

export interface CartRepository {
  items(): LocalCartItem[];
  add(bookId: string, qty?: number, variantId?: string): LocalCartItem[];
  setQty(bookId: string, qty: number, variantId?: string): LocalCartItem[];
  remove(bookId: string, variantId?: string): LocalCartItem[];
  clear(): LocalCartItem[];
}

export interface WishlistRepository {
  ids(): string[];
  toggle(id: string): string[];
  has(id: string): boolean;
  clear(): string[];
}

export interface CompareRepository {
  ids(): string[];
  toggle(id: string): string[];
  remove(id: string): string[];
  clear(): string[];
}

export interface RecentRepository {
  ids(): string[];
  push(id: string): string[];
}

const cart: CartRepository = {
  items: () => read<LocalCartItem[]>(CART_KEY, []),
  add(bookId, qty = 1, variantId) {
    const items = cart.items();
    const existing = items.find((i) => i.bookId === bookId && i.variantId === variantId);
    if (existing) existing.qty += qty;
    else items.push({ bookId, variantId, qty });
    write(CART_KEY, items);
    return items;
  },
  setQty(bookId, qty, variantId) {
    let items = cart.items();
    if (qty <= 0) items = items.filter((i) => !(i.bookId === bookId && i.variantId === variantId));
    else items = items.map((i) => (i.bookId === bookId && i.variantId === variantId ? { ...i, qty } : i));
    write(CART_KEY, items);
    return items;
  },
  remove(bookId, variantId) {
    const items = cart.items().filter((i) => !(i.bookId === bookId && i.variantId === variantId));
    write(CART_KEY, items);
    return items;
  },
  clear() {
    write(CART_KEY, []);
    return [];
  },
};

const wishlist: WishlistRepository = {
  ids: () => read<string[]>(WISH_KEY, []),
  toggle(id) {
    const ids = wishlist.ids();
    const next = ids.includes(id) ? ids.filter((x) => x !== id) : [id, ...ids];
    write(WISH_KEY, next);
    return next;
  },
  has: (id) => wishlist.ids().includes(id),
  clear() {
    write(WISH_KEY, []);
    return [];
  },
};

const compare: CompareRepository = {
  ids: () => read<string[]>(CMP_KEY, []),
  toggle(id) {
    const ids = compare.ids();
    let next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
    if (next.length > MAX_COMPARE) next = next.slice(next.length - MAX_COMPARE);
    write(CMP_KEY, next);
    return next;
  },
  remove(id) {
    const next = compare.ids().filter((x) => x !== id);
    write(CMP_KEY, next);
    return next;
  },
  clear() {
    write(CMP_KEY, []);
    return [];
  },
};

const recent: RecentRepository = {
  ids: () => read<string[]>(RECENT_KEY, []),
  push(id) {
    const next = [id, ...recent.ids().filter((x) => x !== id)].slice(0, MAX_RECENT);
    write(RECENT_KEY, next);
    return next;
  },
};

export const localStores = { cart, wishlist, compare, recent };
