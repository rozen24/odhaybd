// Helpers for the admin "home category sections" endpoints.
import { randomBytes } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import type { HomeCategoryItem, HomeCategorySection } from "@/types";

export const sectionInclude = {
  items: { orderBy: { displayOrder: "asc" as const } },
} satisfies Prisma.HomepageSectionInclude;

export const slugFor = (title: string) =>
  (title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "section") +
  "-" + randomBytes(3).toString("hex");

export function toSection(s: {
  id: string; title: string; categoryId: string | null; displayOrder: number; active: boolean;
}): HomeCategorySection {
  return {
    id: s.id,
    title: s.title,
    category_id: s.categoryId ?? "",
    display_order: s.displayOrder,
    is_active: s.active,
  };
}

export function toItem(i: { sectionId: string; productId: string; displayOrder: number }): HomeCategoryItem {
  return {
    id: `${i.sectionId}:${i.productId}`,
    section_id: i.sectionId,
    product_id: i.productId,
    display_order: i.displayOrder,
  };
}
