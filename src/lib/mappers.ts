// Maps Prisma rows to the shapes the frontend expects (src/types).
// If `npm run typecheck` reports a mismatch, this is the one file to adjust.
import type { Prisma } from "@/generated/prisma/client";
import type { Address, AppNotification, Coupon, Order, OrderStatus } from "@/types";

export const orderInclude = {
  items: true,
  payment: true,
  timeline: { orderBy: { createdAt: "asc" as const } },
} satisfies Prisma.OrderInclude;

export type OrderRecord = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

export function toOrder(o: OrderRecord): Order {
  const a = (o.shippingAddress ?? {}) as Partial<Record<keyof Address, string>>;
  return {
    id: o.id,
    userId: o.userId,
    items: o.items.map((i) => ({
      bookId: i.productId,
      variantId: i.variantId ?? undefined,
      variantName: i.variantName ?? undefined,
      title: i.title,
      coverUrl: i.coverUrl ?? "",
      price: Number(i.price),
      quantity: i.quantity,
    })),
    subtotal: Number(o.subtotal),
    shipping: Number(o.shipping),
    discount: Number(o.discount),
    total: Number(o.total),
    couponCode: o.couponCode ?? undefined,
    paymentMethod: o.paymentMethod.toLowerCase() as Order["paymentMethod"],
    status: o.status.toLowerCase() as OrderStatus,
    address: {
      id: "addr",
      label: "Shipping",
      isDefault: true,
      fullName: a.fullName ?? "",
      phone: a.phone ?? "",
      district: a.district ?? "",
      area: a.area ?? "",
      street: a.street ?? "",
    },
    timeline: o.timeline.map((t) => ({
      status: t.status.toLowerCase() as OrderStatus,
      at: t.createdAt.toISOString(),
      note: t.note ?? undefined,
    })),
    createdAt: o.createdAt.toISOString(),
  };
}

export function toNotification(n: {
  id: string; userId: string; title: string; body: string; read: boolean; createdAt: Date;
}): AppNotification {
  return {
    id: n.id,
    userId: n.userId,
    title: n.title,
    body: n.body,
    read: n.read,
    createdAt: n.createdAt.toISOString(),
  };
}

export function toCoupon(c: {
  code: string; type: "PERCENT" | "FLAT"; value: Prisma.Decimal; minSpend: Prisma.Decimal;
  active: boolean; expiresAt: Date | null;
}): Coupon {
  return {
    code: c.code,
    type: c.type.toLowerCase() as Coupon["type"],
    value: Number(c.value),
    minSpend: Number(c.minSpend),
    active: c.active,
    expiresAt: c.expiresAt?.toISOString() ?? "",
  };
}
