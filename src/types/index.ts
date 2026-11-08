// Shared domain types for the bookstore API and UI.

export type UserRole = "customer" | "seller" | "admin";
export type AccountStatus = "active" | "suspended";

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status?: AccountStatus;
  avatarUrl?: string;
  phone?: string;
  sellerId?: string;
  walletBalance: number;
  rewardPoints: number;
  addresses: Address[];
  createdAt: string;
}

export interface Author {
  id: string;
  slug: string;
  name: string;
  bio: string;
  photoUrl: string;
  bookCount: number;
}

export interface Publisher {
  id: string;
  slug: string;
  name: string;
  bookCount: number;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  parentId: string | null;
  icon?: string;
}

export type BookLanguage = "Bangla" | "English" | "Arabic" | "Hindi";
export type BookBinding = "Hardcover" | "Paperback";
export type BookStatus = "published" | "unpublished";

export interface Book {
  id: string;
  slug: string;
  title: string;
  status?: BookStatus;
  authorIds: string[];
  translator?: string;
  publisherId: string;
  categoryIds: string[];
  isbn: string;
  edition: string;
  pages: number;
  language: BookLanguage;
  binding: BookBinding;
  weightGrams: number;
  price: number;
  oldPrice: number;
  stock: number;
  coverUrl: string;
  images: string[];
  description: string;
  ratingAvg: number;
  ratingCount: number;
  sellerId: string;
  isBestseller: boolean;
  isNewArrival: boolean;
  isEditorsChoice: boolean;
  isAwardWinner: boolean;
  flashSale?: { price: number; endsAt: string };
  createdAt: string;
}

export interface Seller {
  id: string;
  slug: string;
  name: string;
  logoUrl: string;
  rating: number;
  since: string;
}

export interface Review {
  id: string;
  bookId: string;
  userId: string;
  userName: string;
  rating: number;
  title: string;
  body: string;
  createdAt: string;
  approved: boolean;
  helpful: number;
}

export interface CartItem {
  bookId: string;
  quantity: number;
}

export interface Address {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  district: string;
  area: string;
  street: string;
  isDefault: boolean;
}

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export type PaymentMethod = "cod" | "bkash" | "nagad" | "rocket" | "sslcommerz" | "stripe";

export interface OrderItem {
  bookId: string;
  title: string;
  coverUrl: string;
  price: number;
  quantity: number;
}

export interface OrderTimelineEntry {
  status: OrderStatus;
  at: string;
  note?: string;
}

export interface Order {
  id: string;
  userId: string | null;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  couponCode?: string;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  address: Address;
  timeline: OrderTimelineEntry[];
  createdAt: string;
}

export interface Coupon {
  code: string;
  type: "percent" | "flat";
  value: number;
  minSpend: number;
  active: boolean;
  expiresAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  coverUrl: string;
  author: string;
  category: string;
  createdAt: string;
}

export interface CmsPage {
  slug: string;
  title: string;
  body: string;
}

export interface Banner {
  id: string;
  sortOrder: number;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  imageUrl: string;
  bg: string;
  // Optional: where the banner renders on the homepage (defaults to "hero").
  placement?: "hero" | "secondary" | "campaign";
  active?: boolean;
}

export interface HomeSection {
  title: string;
  categorySlug: string;
  layout?: "rail" | "tiles";
}

export interface StoreSettings {
  storeName?: string;
  supportPhone?: string;
  supportEmail?: string;
  shippingFee?: number;
  freeShippingThreshold?: number;
  deliveryEstimate?: string;
  popularSearches?: string[];
  homeSections?: HomeSection[];
  announcement?: string;
}

export interface AdminReport {
  totals: { revenue: number; orders: number; avgOrder: number; books: number; lowStock: number; outOfStock: number; subscribers: number };
  daily: { date: string; revenue: number; orders: number }[];
  byStatus: Record<string, number>;
  topBooks: { bookId: string; title: string; units: number; revenue: number }[];
  topSellers: { id: string; name: string; revenue: number }[];
  subscribers: string[];
}

export interface BookQuery {
  search?: string;
  categoryId?: string;
  authorId?: string;
  publisherId?: string;
  sellerId?: string;
  language?: BookLanguage;
  binding?: BookBinding;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  minDiscount?: number;
  inStock?: boolean;
  includeUnpublished?: boolean;
  flag?: "bestseller" | "new" | "editors" | "award" | "flash";
  sort?: "popularity" | "newest" | "price_asc" | "price_desc" | "rating" | "discount";
  page?: number;
  pageSize?: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/* Homepage: Quick Deals + Category Collections */

export type DealType = "TODAYS_DEAL" | "BUY_ONE_GET_ONE" | "FREE_SHIPPING" | "BEST_PRICE" | "CLEARANCE_SALE";

export interface DealCampaign {
  id: string;
  name: string;
  slug: string;
  type: DealType;
  description?: string;
  banner?: string;
  is_active: boolean;
  start_at: string;
  end_at?: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface DealProduct {
  id: string;
  campaign_id: string;
  product_id: string;
  original_price: number;
  deal_price: number;
  discount_percentage: number;
  stock_limit?: number | null;
  sold_count: number;
  display_order: number;
  is_active: boolean;
}

export interface DealTab {
  campaign: DealCampaign;
  items: { deal: DealProduct; book: Book }[];
}

export interface HomeCategorySection {
  id: string;
  title: string;
  subtitle?: string;
  category_id: string;
  display_order: number;
  is_active: boolean;
}

export interface HomeCategoryItem {
  id: string;
  section_id: string;
  product_id: string;
  display_order: number;
}

export interface CategoryCollection {
  section: HomeCategorySection;
  category: Category;
  books: Book[];
}
