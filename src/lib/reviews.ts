// Helpers for the review endpoints.
// If `npm run typecheck` reports a mismatch with your Review type, adjust toReview.
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { Review } from "@/types";

export const reviewInclude = { user: { select: { name: true } } } satisfies Prisma.ReviewInclude;
export type ReviewRecord = Prisma.ReviewGetPayload<{ include: typeof reviewInclude }>;

export function toReview(r: ReviewRecord): Review {
  return {
    id: r.id,
    bookId: r.productId,
    userId: r.userId,
    userName: r.user.name,
    rating: r.rating,
    title: r.title ?? "",
    body: r.body,
    helpful: r.helpful,
    approved: r.approved,
    createdAt: r.createdAt.toISOString(),
  };
}

// Keeps the book's star average and count in step with its approved reviews.
export async function recomputeRating(productId: string) {
  const agg = await prisma.review.aggregate({
    where: { productId, approved: true },
    _avg: { rating: true },
    _count: { _all: true },
  });
  await prisma.product.update({
    where: { id: productId },
    data: {
      ratingAverage: Math.round((agg._avg.rating ?? 0) * 100) / 100,
      ratingCount: agg._count._all,
    },
  });
}
