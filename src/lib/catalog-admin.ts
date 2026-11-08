// Shared helpers for the admin write endpoints of authors, publishers,
// categories and banners.
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { Author, Banner, Category, Publisher } from "@/types";

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50) || "item";

type SlugModel = "author" | "publisher" | "category";

async function slugTaken(model: SlugModel, slug: string, excludeId?: string): Promise<boolean> {
  const where = { slug, ...(excludeId ? { id: { not: excludeId } } : {}) };
  const select = { id: true };
  const found =
    model === "author" ? await prisma.author.findFirst({ where, select })
    : model === "publisher" ? await prisma.publisher.findFirst({ where, select })
    : await prisma.category.findFirst({ where, select });
  return !!found;
}

// A slug nobody else uses; adds a short random suffix when the name is taken.
export async function uniqueSlug(model: SlugModel, source: string, excludeId?: string): Promise<string> {
  const base = slugify(source);
  return (await slugTaken(model, base, excludeId)) ? `${base}-${randomBytes(3).toString("hex")}` : base;
}

// Only same-site paths and http(s) URLs are accepted, so a saved link or image
// can never be a "javascript:" URL.
export function safeUrl(v: string): string | null {
  if (!v) return null;
  if (v.startsWith("/") && !v.startsWith("//")) return v;
  return /^https?:\/\//i.test(v) ? v : null;
}

export function toAuthor(
  a: { id: string; slug: string; name: string; bio: string | null; photoUrl: string | null },
  bookCount: number,
): Author {
  return { id: a.id, slug: a.slug, name: a.name, bio: a.bio ?? "", photoUrl: a.photoUrl ?? "", bookCount };
}

export function toPublisher(p: { id: string; slug: string; name: string }, bookCount: number): Publisher {
  return { id: p.id, slug: p.slug, name: p.name, bookCount };
}

export function toCategory(c: {
  id: string; slug: string; name: string; parentId: string | null; icon: string | null;
}): Category {
  return { id: c.id, slug: c.slug, name: c.name, parentId: c.parentId, icon: c.icon ?? undefined };
}

export function toBanner(b: {
  id: string; title: string; subtitle: string | null; ctaLabel: string | null; ctaHref: string | null;
  imageUrl: string | null; background: string | null; placement: string | null; active: boolean; sortOrder: number;
}): Banner {
  return {
    id: b.id,
    sortOrder: b.sortOrder,
    title: b.title,
    subtitle: b.subtitle ?? "",
    ctaLabel: b.ctaLabel ?? "",
    ctaHref: b.ctaHref ?? "",
    imageUrl: b.imageUrl ?? "",
    bg: b.background ?? "",
    placement: (b.placement ?? undefined) as Banner["placement"],
    active: b.active,
  };
}
