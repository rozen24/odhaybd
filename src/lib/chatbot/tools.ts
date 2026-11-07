import { Type, type FunctionDeclaration } from "@google/genai";
import { prisma } from "@/lib/prisma"; // adjust to your Prisma client export

const PRODUCT_PATH = "/books"; // your product page route, e.g. /books/[slug]
const num = (v: unknown) => (v == null ? null : Number(v));

export const functionDeclarations: FunctionDeclaration[] = [
  {
    name: "search_products",
    description:
      "Search published books by title, author, category, publisher, tag or ISBN, or browse a collection (bestsellers, new releases...). Returns price in Tk, discount and stock.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: "Title, author, category, publisher or ISBN. Optional if collection is given." },
        collection: {
          type: Type.STRING,
          enum: ["bestseller", "new_release", "featured", "editor_choice", "award_winner"],
          description: "Browse a curated collection.",
        },
        max_price: { type: Type.NUMBER, description: "Maximum price in Tk." },
      },
    },
  },
  {
    name: "get_active_deals",
    description: "List deal campaigns that are live right now, with sample discounted books.",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: "get_active_coupons",
    description: "List coupon codes that are currently active and not expired.",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: "check_coupon",
    description: "Check whether a coupon code is valid and estimate the discount for a cart total.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        code: { type: Type.STRING, description: "Coupon code" },
        cart_total: { type: Type.NUMBER, description: "Cart subtotal in Tk, if the customer said it." },
      },
      required: ["code"],
    },
  },
  {
    name: "track_order",
    description:
      "Get status of the logged-in customer's orders. Pass order_id if they gave one, otherwise returns their 3 latest orders.",
    parameters: {
      type: Type.OBJECT,
      properties: { order_id: { type: Type.STRING, description: "Order ID (or its first characters)." } },
    },
  },
];

// ───────── implementations ─────────

const COLLECTION_FIELD: Record<string, string> = {
  bestseller: "bestseller",
  new_release: "newRelease",
  featured: "featured",
  editor_choice: "editorChoice",
  award_winner: "awardWinner",
};

async function searchProducts(a: any) {
  const AND: any[] = [{ status: "PUBLISHED" }]; // `any`: dynamic where-builder

  const q = typeof a.query === "string" ? a.query.trim().slice(0, 80) : "";
  const words = q.split(/\s+/).filter(Boolean).slice(0, 4);
  for (const w of words) {
    const c = { contains: w, mode: "insensitive" };
    AND.push({
      OR: [
        { title: c },
        { isbn: w },
        { authors: { some: { author: { name: c } } } },
        { categories: { some: { category: { name: c } } } },
        { tags: { some: { tag: { name: c } } } },
        { publisher: { name: c } },
      ],
    });
  }
  const field = COLLECTION_FIELD[a.collection];
  if (field) AND.push({ [field]: true });
  if (typeof a.max_price === "number") {
    AND.push({
      OR: [{ salePrice: { lte: a.max_price } }, { salePrice: null, regularPrice: { lte: a.max_price } }],
    });
  }
  if (!words.length && !field) return { error: "Provide a query or a collection." };

  const rows = await prisma.product.findMany({
    where: { AND },
    orderBy: [{ bestseller: "desc" }, { ratingCount: "desc" }],
    take: 5,
    select: {
      title: true, slug: true, regularPrice: true, salePrice: true, language: true,
      binding: true, pages: true, edition: true, ratingAverage: true, ratingCount: true,
      authors: { select: { author: { select: { name: true } } } },
      publisher: { select: { name: true } },
      inventory: { select: { quantity: true, reserved: true } },
    },
  });
  if (!rows.length) return { found: 0 };

  return rows.map((p) => ({
    title: p.title,
    url: `${PRODUCT_PATH}/${p.slug}`,
    authors: p.authors.map((x) => x.author.name),
    publisher: p.publisher?.name ?? null,
    price_tk: num(p.salePrice ?? p.regularPrice),
    original_price_tk: p.salePrice ? num(p.regularPrice) : undefined,
    in_stock: p.inventory ? p.inventory.quantity - p.inventory.reserved > 0 : null,
    language: p.language, binding: p.binding, pages: p.pages, edition: p.edition,
    rating: num(p.ratingAverage), rating_count: p.ratingCount,
  }));
}

async function getActiveDeals() {
  const now = new Date();
  const rows = await prisma.dealCampaign.findMany({
    where: { active: true, startAt: { lte: now }, OR: [{ endAt: null }, { endAt: { gte: now } }] },
    orderBy: { displayOrder: "asc" },
    take: 5,
    select: {
      name: true, type: true, description: true, endAt: true,
      products: {
        where: { active: true, product: { status: "PUBLISHED" } },
        orderBy: { displayOrder: "asc" },
        take: 5,
        select: {
          dealPrice: true, originalPrice: true, stockLimit: true, soldCount: true,
          product: { select: { title: true, slug: true } },
        },
      },
    },
  });
  if (!rows.length) return { found: 0 };
  return rows.map((d) => ({
    name: d.name, type: d.type, description: d.description, ends_at: d.endAt,
    sample_books: d.products.map((p) => ({
      title: p.product.title,
      url: `${PRODUCT_PATH}/${p.product.slug}`,
      deal_price_tk: num(p.dealPrice),
      original_price_tk: num(p.originalPrice),
      left: p.stockLimit != null ? Math.max(0, p.stockLimit - p.soldCount) : undefined,
    })),
  }));
}

async function getActiveCoupons() {
  const now = new Date();
  const rows = await prisma.coupon.findMany({
    where: { active: true, OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { code: true, type: true, value: true, minSpend: true, expiresAt: true },
  });
  if (!rows.length) return { found: 0 };
  return rows.map((c) => ({
    code: c.code,
    discount: c.type === "PERCENT" ? `${num(c.value)}% off` : `Tk ${num(c.value)} off`,
    min_spend_tk: num(c.minSpend),
    expires_at: c.expiresAt,
  }));
}

async function checkCoupon(a: any) {
  const code = String(a.code ?? "").trim().slice(0, 40);
  if (!code) return { valid: false, reason: "No code given" };
  const c = await prisma.coupon.findFirst({ where: { code: { equals: code, mode: "insensitive" } } });
  if (!c || !c.active) return { valid: false, reason: "Code not found or inactive" };
  if (c.expiresAt && c.expiresAt < new Date()) return { valid: false, reason: "Coupon has expired" };

  const min = Number(c.minSpend);
  const value = Number(c.value);
  const result: Record<string, unknown> = {
    valid: true, code: c.code, type: c.type, value, min_spend_tk: min,
    note: "Final discount is confirmed at checkout.",
  };
  if (typeof a.cart_total === "number") {
    if (a.cart_total < min) return { valid: false, reason: `Minimum spend is Tk ${min}` };
    result.estimated_discount_tk = Math.round(
      c.type === "PERCENT" ? (a.cart_total * value) / 100 : Math.min(value, a.cart_total)
    );
  }
  return result;
}

async function trackOrder(a: any, ctx: { userId?: string }) {
  if (!ctx.userId) {
    return { error: "login_required", message: "Customer must log in to view orders." };
  }
  const id = typeof a.order_id === "string" ? a.order_id.trim().slice(0, 40) : "";
  const orders = await prisma.order.findMany({
    where: { userId: ctx.userId, ...(id ? { id: { startsWith: id } } : {}) },
    orderBy: { createdAt: "desc" },
    take: id ? 1 : 3,
    select: {
      id: true, status: true, createdAt: true, subtotal: true, shipping: true,
      discount: true, total: true, couponCode: true, paymentMethod: true,
      payment: { select: { status: true } },
      items: { select: { title: true, quantity: true } },
      timeline: { orderBy: { createdAt: "desc" }, take: 3, select: { status: true, note: true, createdAt: true } },
    },
  });
  if (!orders.length) return { found: 0, message: "No matching order on this account." };
  return orders.map((o) => ({
    order_id: o.id, status: o.status, placed_at: o.createdAt,
    total_tk: num(o.total), shipping_tk: num(o.shipping), discount_tk: num(o.discount),
    coupon: o.couponCode, payment_method: o.paymentMethod, payment_status: o.payment?.status ?? null,
    items: o.items, recent_updates: o.timeline,
  }));
}

export async function runTool(name: string, args: Record<string, any>, ctx: { userId?: string }) {
  try {
    switch (name) {
      case "search_products": return await searchProducts(args);
      case "get_active_deals": return await getActiveDeals();
      case "get_active_coupons": return await getActiveCoupons();
      case "check_coupon": return await checkCoupon(args);
      case "track_order": return await trackOrder(args, ctx);
      default: return { error: "Unknown tool" };
    }
  } catch (e) {
    console.error("tool error", name, e);
    return { error: "Lookup failed, please try again." };
  }
}