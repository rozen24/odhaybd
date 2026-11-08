// HTTP implementations of the repository interfaces. Data flows through this
// app's Prisma-backed API routes. Cart / wishlist / compare / recently-viewed
// remain client-side state and reuse the local implementations.

import type {
  Author, Banner, BlogPost, Book, BookQuery, Category, CmsPage, Coupon,
  Order, OrderStatus, Paginated, Profile, Publisher, Review, Seller,
  StoreSettings, AdminReport,
  DealCampaign, DealProduct, DealTab, HomeCategorySection, HomeCategoryItem, CategoryCollection,
} from "../types";
import { api } from "./api/client";
import {
  localStores, type CatalogAdminRepository, type StoreRepository,
  type BooksRepository, type CatalogRepository, type CouponsRepository,
  type OrdersRepository, type ReviewsRepository, type NotificationsRepository,
  type ContentRepository, type SearchRepository, type AdminUsersRepository,
  type DealsRepository, type HomeSectionsRepository,
} from "./repositories";

// Swallow 404s so optional lookups resolve to undefined instead of throwing.
async function optional<T>(p: Promise<T>): Promise<T | undefined> {
  try { return await p; } catch { return undefined; }
}

function queryString(q: BookQuery): string {
  const params = new URLSearchParams();
  Object.entries(q).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
  });
  const s = params.toString();
  return s ? `?${s}` : "";
}

const booksRepo: BooksRepository = {
  list: (query) => api.get<Paginated<Book>>(`/books${queryString(query)}`),
  getBySlug: (slug) => optional(api.get<Book>(`/books/slug/${encodeURIComponent(slug)}`)),
  getById: (id) => optional(api.get<Book>(`/books/id/${id}`)),
  getMany: (ids) => (ids.length ? api.get<Book[]>(`/books/by-ids?ids=${ids.join(",")}`) : Promise.resolve([])),
  related: (book) => api.get<Book[]>(`/books/id/${book.id}/related`),
  frequentlyBoughtTogether: (book) => api.get<Book[]>(`/books/id/${book.id}/fbt`),
  create: (book) => api.post<Book>(`/books`, book),
  update: (id, patch) => api.put<Book>(`/books/${id}`, patch),
  remove: (id) => api.del<void>(`/books/${id}`),
};

const catalogRepo: CatalogRepository = {
  authors: () => api.get<Author[]>(`/authors`),
  authorBySlug: (slug) => optional(api.get<Author>(`/authors/${slug}`)),
  publishers: () => api.get<Publisher[]>(`/publishers`),
  publisherBySlug: (slug) => optional(api.get<Publisher>(`/publishers/${slug}`)),
  categories: () => api.get<Category[]>(`/categories`),
  categoryBySlug: (slug) => optional(api.get<Category>(`/categories/${slug}`)),
  sellers: () => api.get<Seller[]>(`/sellers`),
  sellerBySlug: (slug) => optional(api.get<Seller>(`/sellers/${slug}`)),
  banners: () => api.get<Banner[]>(`/banners`),
};

const couponsRepo: CouponsRepository = {
  all: () => api.get<Coupon[]>(`/coupons`),
  create: (coupon) => api.post<Coupon>(`/coupons`, coupon),
  remove: async (code) => { await api.del(`/coupons/${encodeURIComponent(code)}`); },
  validate: (code, subtotal) =>
    api.post<{ ok: boolean; discount: number; message: string; coupon?: Coupon }>(`/coupons/validate`, { code, subtotal }),
};

const adminUsersRepo: AdminUsersRepository = {
  list: () => api.get<Profile[]>(`/admin/users`),
  create: (input) => api.post<Profile>(`/admin/users`, input),
  setRole: (id, role) => api.put<Profile>(`/admin/users/${id}/role`, { role }),
  setStatus: (id, status) => api.put<Profile>(`/admin/users/${id}/status`, { status }),
  remove: async (id) => { await api.del(`/admin/users/${id}`); },
};

const ordersRepo: OrdersRepository = {
  create: (order) => api.post<Order>(`/orders`, order),
  listForUser: () => api.get<Order[]>(`/orders/mine`),
  listAll: () => api.get<Order[]>(`/orders`),
  listForSeller: () => api.get<Order[]>(`/orders/seller/mine`),
  getById: (id) => optional(api.get<Order>(`/orders/${id}`)),
  updateStatus: (id, status: OrderStatus, note) => api.put<Order>(`/orders/${id}/status`, { status, note }),
};

const reviewsRepo: ReviewsRepository = {
  forBook: (bookId) => api.get<Review[]>(`/reviews/book/${bookId}`),
  forUser: () => api.get<Review[]>(`/reviews/mine`),
  pending: () => api.get<Review[]>(`/reviews/pending`),
  add: (review) => api.post<Review>(`/reviews`, review),
  setApproved: async (id, approved) => { await api.put(`/reviews/${id}/approve`, { approved }); },
};

const notificationsRepo: NotificationsRepository = {
  forUser: () => api.get<import("../types").AppNotification[]>(`/notifications`),
  markRead: async (id) => { await api.put(`/notifications/${id}/read`); },
  // Notifications are created server-side (e.g. on order placement); this is a
  // no-op on the client to satisfy the interface.
  add: async () => {},
};

const contentRepo: ContentRepository = {
  blogPosts: () => api.get<BlogPost[]>(`/blog`),
  blogBySlug: (slug) => optional(api.get<BlogPost>(`/blog/${slug}`)),
  cmsPage: (slug) => optional(api.get<CmsPage>(`/cms/${slug}`)),
};

const searchRepo: SearchRepository = {
  suggest: (term) =>
    api.get<{ books: Book[]; authors: Author[]; categories: Category[]; publishers?: Publisher[] }>(`/search/suggest?q=${encodeURIComponent(term)}`),
  popular: () => api.get<string[]>(`/search/popular`),
};

const catalogAdminRepo: CatalogAdminRepository = {
  createAuthor: (a) => api.post<Author>(`/authors`, a),
  updateAuthor: (id, a) => api.put<Author>(`/authors/${id}`, a),
  removeAuthor: async (id) => { await api.del(`/authors/${id}`); },
  createPublisher: (p) => api.post<Publisher>(`/publishers`, p),
  updatePublisher: (id, p) => api.put<Publisher>(`/publishers/${id}`, p),
  removePublisher: async (id) => { await api.del(`/publishers/${id}`); },
  createCategory: (c) => api.post<Category>(`/categories`, c),
  updateCategory: (id, c) => api.put<Category>(`/categories/${id}`, c),
  removeCategory: async (id) => { await api.del(`/categories/${id}`); },
  createBanner: (b) => api.post<Banner>(`/banners`, b),
  updateBanner: (id, b) => api.put<Banner>(`/banners/${id}`, b),
  removeBanner: async (id) => { await api.del(`/banners/${id}`); },
  reorderBanners: async (ids) => { await api.put(`/admin/banners/reorder`, { ids }); },
};

const storeRepo: StoreRepository = {
  settings: () => api.get<StoreSettings>(`/settings`),
  saveSettings: (s) => api.put<StoreSettings>(`/settings`, s),
  recentlySold: () => api.get<Book[]>(`/books/recently-sold`),
  subscribe: (email) => api.post<{ ok: boolean; already: boolean }>(`/newsletter`, { email }),
  reports: () => api.get<AdminReport>(`/admin/reports`),
};

const dealsRepo: DealsRepository = {
  quickDeals: (limit) => api.get<DealTab[]>(`/home/quick-deals${limit ? `?limit=${limit}` : ""}`),
  campaigns: () => api.get<DealCampaign[]>(`/admin/deal-campaigns`),
  createCampaign: (c) => api.post<DealCampaign>(`/admin/deal-campaigns`, c),
  updateCampaign: (id, c) => api.put<DealCampaign>(`/admin/deal-campaigns/${encodeURIComponent(id)}`, c),
  removeCampaign: async (id) => { await api.del(`/admin/deal-campaigns/${encodeURIComponent(id)}`); },
  reorderCampaigns: async (ids) => { await api.put(`/admin/deal-campaigns/reorder`, { ids }); },
  products: (campaignId) =>
    api.get<{ deal: DealProduct; book?: Book }[]>(`/admin/deal-campaigns/${encodeURIComponent(campaignId)}/products`),
  addProduct: (p) => api.post<DealProduct>(`/admin/deal-products`, p),
  updateProduct: (campaignId, id, p) =>
    api.put<DealProduct>(`/admin/deal-products/${encodeURIComponent(campaignId)}/${encodeURIComponent(id)}`, p),
  removeProduct: async (campaignId, id) => {
    await api.del(`/admin/deal-products/${encodeURIComponent(campaignId)}/${encodeURIComponent(id)}`);
  },
};

const homeSectionsRepo: HomeSectionsRepository = {
  collections: () => api.get<CategoryCollection[]>(`/home/category-collections`),
  list: () => api.get<(HomeCategorySection & { items: HomeCategoryItem[] })[]>(`/admin/home-sections`),
  create: (s) => api.post<HomeCategorySection>(`/admin/home-sections`, s),
  update: (id, s) => api.put<HomeCategorySection>(`/admin/home-sections/${encodeURIComponent(id)}`, s),
  remove: async (id) => { await api.del(`/admin/home-sections/${encodeURIComponent(id)}`); },
  reorder: async (ids) => { await api.put(`/admin/home-sections/reorder`, { ids }); },
  setItems: (id, productIds) =>
    api.put<HomeCategoryItem[]>(`/admin/home-sections/${encodeURIComponent(id)}/items`, { productIds }),
};

export const httpRepositories = {
  books: booksRepo,
  catalog: catalogRepo,
  cart: localStores.cart,
  wishlist: localStores.wishlist,
  compare: localStores.compare,
  recent: localStores.recent,
  coupons: couponsRepo,
  adminUsers: adminUsersRepo,
  orders: ordersRepo,
  reviews: reviewsRepo,
  notifications: notificationsRepo,
  content: contentRepo,
  search: searchRepo,
  catalogAdmin: catalogAdminRepo,
  store: storeRepo,
  deals: dealsRepo,
  homeSections: homeSectionsRepo,
};
