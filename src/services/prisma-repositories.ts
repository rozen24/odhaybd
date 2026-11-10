import { Prisma } from "@/generated/prisma/client";
import { prisma } from "../lib/prisma";
import type {
  Author,
  Book,
  BookQuery,
  CategoryCollection,
  DealCampaign,
  DealProduct,
  DealTab,
  Category,
  Paginated,
  Publisher,
  Seller,
} from "../types";
import type {
  BooksRepository,
  CatalogRepository,
  DealsRepository,
  HomeSectionsRepository,
  SearchRepository,
} from "./repositories";

const productInclude = {
  authors: { include: { author: true } },
  categories: { include: { category: true } },
  publisher: true,
  seller: true,
  images: { orderBy: { sortOrder: "asc" as const } },
  inventory: true,
  variants: { include: { inventory: true }, orderBy: { name: "asc" as const } },
  dealProducts: {
    where: { active: true, campaign: { active: true } },
    orderBy: { displayOrder: "asc" as const },
    include: { campaign: true },
  },
} satisfies Prisma.ProductInclude;

type ProductRecord = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

function numberValue(value: Prisma.Decimal | number | null | undefined): number {
  return value == null ? 0 : Number(value);
}

function toBook(product: ProductRecord): Book {
  const now = Date.now();
  const variantFlashIsLive = !!product.flashSaleEndsAt && product.flashSaleEndsAt.getTime() > now;
  const variantRecords = [...product.variants].sort((a, b) => {
    const aPaperback = a.name.toLowerCase().includes("paperback");
    const bPaperback = b.name.toLowerCase().includes("paperback");
    return aPaperback === bPaperback ? a.name.localeCompare(b.name) : aPaperback ? -1 : 1;
  });
  const variants = variantRecords.length > 0
    ? variantRecords.map((variant) => ({
        id: variant.id,
        name: variant.name,
        price: numberValue(variant.basePrice || (variant.salePrice ?? variant.regularPrice)),
        oldPrice: numberValue(variant.regularPrice),
        flashPrice: variantFlashIsLive && variant.salePrice ? numberValue(variant.salePrice) : undefined,
        stock: Math.max(0, (variant.inventory?.quantity ?? 0) - (variant.inventory?.reserved ?? 0)),
      }))
    : [{
        id: "",
        name: "Paperback (Premium)",
        price: numberValue(variantFlashIsLive && product.salePrice ? product.salePrice : product.regularPrice),
        oldPrice: numberValue(product.regularPrice),
        flashPrice: variantFlashIsLive && product.salePrice ? numberValue(product.salePrice) : undefined,
        stock: Math.max(0, (product.inventory?.quantity ?? 0) - (product.inventory?.reserved ?? 0)),
      }];
  const defaultVariant = variants[0];

  return {
    id: product.id,
    slug: product.slug,
    title: product.title,
    status: product.status === "UNPUBLISHED" ? "unpublished" : "published",
    authorIds: product.authors.map(({ author }) => author.id),
    translator: product.translator ?? undefined,
    publisherId: product.publisherId ?? "",
    categoryIds: product.categories.map(({ category }) => category.id),
    isbn: product.isbn ?? "",
    edition: product.edition ?? "",
    pages: product.pages ?? 0,
    language: (product.language ?? "English") as Book["language"],
    binding: (product.binding ?? "Paperback") as Book["binding"],
    weightGrams: product.weightGrams ?? 0,
    price: defaultVariant.price,
    oldPrice: defaultVariant.oldPrice,
    stock: defaultVariant.stock,
    variants,
    coverUrl: product.images[0]?.url ?? "",
    images: product.images.map((image) => image.url),
    description: product.description,
    ratingAvg: numberValue(product.ratingAverage),
    ratingCount: product.ratingCount,
    displayOrder: product.displayOrder,
    sellerId: product.sellerId ?? "",
    isBestseller: product.bestseller,
    isNewArrival: product.newRelease,
    isEditorsChoice: product.editorChoice,
    isAwardWinner: product.awardWinner,
    flashSale: variantFlashIsLive && defaultVariant.flashPrice
      ? { price: defaultVariant.flashPrice, endsAt: product.flashSaleEndsAt!.toISOString() }
      : undefined,
    createdAt: product.createdAt.toISOString(),
  };
}

function productWhere(query: BookQuery): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {
    ...(query.includeUnpublished ? {} : { status: "PUBLISHED" }),
    ...(query.search ? {
      OR: [
        { title: { contains: query.search, mode: "insensitive" } },
        { isbn: { contains: query.search, mode: "insensitive" } },
        { sku: { contains: query.search, mode: "insensitive" } },
        { authors: { some: { author: { name: { contains: query.search, mode: "insensitive" } } } } },
        { publisher: { name: { contains: query.search, mode: "insensitive" } } },
      ],
    } : {}),
    ...(query.categoryId ? { categories: { some: { categoryId: query.categoryId } } } : {}),
    ...(query.authorId ? { authors: { some: { authorId: query.authorId } } } : {}),
    ...(query.publisherId ? { publisherId: query.publisherId } : {}),
    ...(query.sellerId ? { sellerId: query.sellerId } : {}),
    ...(query.language ? { language: query.language } : {}),
    ...(query.binding ? { binding: query.binding } : {}),
    ...(query.inStock ? { inventory: { quantity: { gt: 0 } } } : {}),
    ...(query.minRating !== undefined ? { ratingAverage: { gte: query.minRating } } : {}),
    ...(query.minPrice !== undefined || query.maxPrice !== undefined ? {
      regularPrice: { gte: query.minPrice, lte: query.maxPrice },
    } : {}),
    ...(query.flag === "bestseller" ? { bestseller: true } : {}),
    ...(query.flag === "new" ? { newRelease: true } : {}),
    ...(query.flag === "editors" ? { editorChoice: true } : {}),
    ...(query.flag === "award" ? { awardWinner: true } : {}),
    ...(query.flag === "flash" ? {
      OR: [
        {
          flashSaleEndsAt: { gt: new Date() },
          OR: [
            { salePrice: { not: null } },
            { variants: { some: { salePrice: { not: null } } } },
          ],
        },
      ],
    } : {}),
  };
  return where;
}

const booksRepository: BooksRepository = {
  async list(query): Promise<Paginated<Book>> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 12));
    const where = productWhere(query);
    const orderBy: Prisma.ProductOrderByWithRelationInput | Prisma.ProductOrderByWithRelationInput[] =
      query.sort === "newest" ? { createdAt: "desc" } :
      query.sort === "order" ? [{ displayOrder: "asc" }, { createdAt: "asc" }] :
      query.sort === "price_asc" ? { regularPrice: "asc" } :
      query.sort === "price_desc" ? { regularPrice: "desc" } :
      query.sort === "rating" ? { ratingAverage: "desc" } :
      { ratingCount: "desc" };
    const [items, total] = await prisma.$transaction([
      prisma.product.findMany({ where, include: productInclude, orderBy, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.product.count({ where }),
    ]);
    return { items: items.map(toBook), total, page, pageSize };
  },

  async getBySlug(slug) {
    const product = await prisma.product.findUnique({ where: { slug }, include: productInclude });
    return product ? toBook(product) : undefined;
  },

  async getById(id) {
    const product = await prisma.product.findUnique({ where: { id }, include: productInclude });
    return product ? toBook(product) : undefined;
  },

  async getMany(ids) {
    const products = await prisma.product.findMany({ where: { id: { in: ids } }, include: productInclude });
    return products.map(toBook);
  },

  async related(book) {
    const products = await prisma.product.findMany({
      where: { id: { not: book.id }, status: "PUBLISHED", categories: { some: { categoryId: { in: book.categoryIds } } } },
      include: productInclude,
      orderBy: { ratingCount: "desc" },
      take: 6,
    });
    return products.map(toBook);
  },

  async frequentlyBoughtTogether(book) {
    return booksRepository.related(book);
  },

  reorder: async () => { throw new Error("Prisma catalog writes are not enabled yet"); },
  create: async () => { throw new Error("Prisma catalog writes are not enabled yet"); },
  update: async () => { throw new Error("Prisma catalog writes are not enabled yet"); },
  remove: async () => { throw new Error("Prisma catalog writes are not enabled yet"); },
};

const catalogRepository: CatalogRepository = {
  async authors(): Promise<Author[]> {
    const authors = await prisma.author.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { products: true } } } });
    return authors.map((author) => ({ id: author.id, slug: author.slug, name: author.name, bio: author.bio ?? "", photoUrl: author.photoUrl ?? "", bookCount: author._count.products }));
  },
  async authorBySlug(slug) {
    const author = await prisma.author.findUnique({ where: { slug }, include: { _count: { select: { products: true } } } });
    return author ? { id: author.id, slug: author.slug, name: author.name, bio: author.bio ?? "", photoUrl: author.photoUrl ?? "", bookCount: author._count.products } : undefined;
  },
  async publishers(): Promise<Publisher[]> {
    const publishers = await prisma.publisher.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { products: true } } } });
    return publishers.map((publisher) => ({ id: publisher.id, slug: publisher.slug, name: publisher.name, bookCount: publisher._count.products }));
  },
  async publisherBySlug(slug) {
    const publisher = await prisma.publisher.findUnique({ where: { slug }, include: { _count: { select: { products: true } } } });
    return publisher ? { id: publisher.id, slug: publisher.slug, name: publisher.name, bookCount: publisher._count.products } : undefined;
  },
  async categories(): Promise<Category[]> {
    const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
    return categories.map((category) => ({ id: category.id, slug: category.slug, name: category.name, parentId: category.parentId, icon: category.icon ?? undefined }));
  },
  async categoryBySlug(slug) {
    const category = await prisma.category.findUnique({ where: { slug } });
    return category ? { id: category.id, slug: category.slug, name: category.name, parentId: category.parentId, icon: category.icon ?? undefined } : undefined;
  },
  async sellers(): Promise<Seller[]> {
    const sellers = await prisma.seller.findMany({ orderBy: { name: "asc" } });
    return sellers.map((seller) => ({ id: seller.id, slug: seller.slug, name: seller.name, logoUrl: seller.logoUrl ?? "", rating: numberValue(seller.rating), since: seller.since ?? "" }));
  },
  async sellerBySlug(slug) {
    const seller = await prisma.seller.findUnique({ where: { slug } });
    return seller ? { id: seller.id, slug: seller.slug, name: seller.name, logoUrl: seller.logoUrl ?? "", rating: numberValue(seller.rating), since: seller.since ?? "" } : undefined;
  },
  async banners() {
    const banners = await prisma.banner.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });
    return banners.map((banner) => ({ id: banner.id, sortOrder: banner.sortOrder, title: banner.title, subtitle: banner.subtitle ?? "", ctaLabel: banner.ctaLabel ?? "", ctaHref: banner.ctaHref ?? "", imageUrl: banner.imageUrl ?? "", bg: banner.background ?? "", placement: banner.placement as "hero" | "secondary" | "campaign" | undefined, active: banner.active }));
  },
};

function toDealCampaign(campaign: {
  id: string;
  name: string;
  slug: string;
  type: DealCampaign["type"];
  description: string | null;
  banner: string | null;
  active: boolean;
  startAt: Date;
  endAt: Date | null;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}): DealCampaign {
  return {
    id: campaign.id,
    name: campaign.name,
    slug: campaign.slug,
    type: campaign.type,
    description: campaign.description ?? undefined,
    banner: campaign.banner ?? undefined,
    is_active: campaign.active,
    start_at: campaign.startAt.toISOString(),
    end_at: campaign.endAt?.toISOString() ?? null,
    display_order: campaign.displayOrder,
    created_at: campaign.createdAt.toISOString(),
    updated_at: campaign.updatedAt.toISOString(),
  };
}

function toDealProduct(deal: {
  id: string;
  campaignId: string;
  productId: string;
  originalPrice: Prisma.Decimal;
  dealPrice: Prisma.Decimal;
  stockLimit: number | null;
  soldCount: number;
  displayOrder: number;
  active: boolean;
}): DealProduct {
  const original = numberValue(deal.originalPrice);
  const price = numberValue(deal.dealPrice);
  return {
    id: deal.id,
    campaign_id: deal.campaignId,
    product_id: deal.productId,
    original_price: original,
    deal_price: price,
    discount_percentage: original > 0 ? Math.round(((original - price) / original) * 100) : 0,
    stock_limit: deal.stockLimit,
    sold_count: deal.soldCount,
    display_order: deal.displayOrder,
    is_active: deal.active,
  };
}

const dealsRepository: DealsRepository = {
  async quickDeals(limit = 12): Promise<DealTab[]> {
    const now = new Date();
    const campaigns = await prisma.dealCampaign.findMany({
      where: { active: true, startAt: { lte: now }, OR: [{ endAt: null }, { endAt: { gt: now } }] },
      orderBy: { displayOrder: "asc" },
      include: {
        products: {
          where: { active: true },
          orderBy: { displayOrder: "asc" },
          take: limit,
          include: { product: { include: productInclude } },
        },
      },
    });
    return campaigns.map((campaign) => ({
      campaign: toDealCampaign(campaign),
      items: campaign.products.map((item) => ({ deal: toDealProduct(item), book: toBook(item.product) })),
    }));
  },
  async campaigns() {
    const campaigns = await prisma.dealCampaign.findMany({ orderBy: { displayOrder: "asc" } });
    return campaigns.map(toDealCampaign);
  },
  async products(campaignId) {
    const products = await prisma.dealProduct.findMany({ where: { campaignId }, orderBy: { displayOrder: "asc" }, include: { product: { include: productInclude } } });
    return products.map((item) => ({ deal: toDealProduct(item), book: toBook(item.product) }));
  },
  createCampaign: async () => { throw new Error("Prisma deal writes are not enabled yet"); },
  updateCampaign: async () => { throw new Error("Prisma deal writes are not enabled yet"); },
  removeCampaign: async () => { throw new Error("Prisma deal writes are not enabled yet"); },
  reorderCampaigns: async () => { throw new Error("Prisma deal writes are not enabled yet"); },
  addProduct: async () => { throw new Error("Prisma deal writes are not enabled yet"); },
  updateProduct: async () => { throw new Error("Prisma deal writes are not enabled yet"); },
  removeProduct: async () => { throw new Error("Prisma deal writes are not enabled yet"); },
};

const homeSectionsRepository: HomeSectionsRepository = {
  async collections(): Promise<CategoryCollection[]> {
    const sections = await prisma.homepageSection.findMany({
      where: { active: true, displayType: "COLLECTION" },
      orderBy: { displayOrder: "asc" },
      include: {
        category: true,
        items: { orderBy: { displayOrder: "asc" }, take: 4, include: { product: { include: { categories: { include: { category: true } } } } } },
      },
    });
    const collections: CategoryCollection[] = [];
    for (const section of sections) {
      const firstCategory = section.category ?? section.items[0]?.product.categories[0]?.category;
      if (!firstCategory) continue;
      const books = await booksRepository.getMany(section.items.map((item) => item.product.id));
      collections.push({
        section: {
          id: section.id,
          title: section.title,
          category_id: firstCategory.id,
          display_order: section.displayOrder,
          is_active: section.active,
        },
        category: { id: firstCategory.id, slug: firstCategory.slug, name: firstCategory.name, parentId: firstCategory.parentId, icon: firstCategory.icon ?? undefined },
        books,
      });
    }
    return collections;
  },
  async list() { return []; },
  create: async () => { throw new Error("Prisma homepage writes are not enabled yet"); },
  update: async () => { throw new Error("Prisma homepage writes are not enabled yet"); },
  remove: async () => { throw new Error("Prisma homepage writes are not enabled yet"); },
  reorder: async () => { throw new Error("Prisma homepage writes are not enabled yet"); },
  setItems: async () => { throw new Error("Prisma homepage writes are not enabled yet"); },
};

export const prismaRepositories = {
  books: booksRepository,
  catalog: catalogRepository,
  deals: dealsRepository,
  homeSections: homeSectionsRepository,
  search: {
    async suggest(term: string) {
      const result = await booksRepository.list({ search: term, pageSize: 5 });
      const [authors, publishers, categories] = await Promise.all([
        catalogRepository.authors(),
        catalogRepository.publishers(),
        catalogRepository.categories(),
      ]);
      const normalized = term.toLowerCase();
      return {
        books: result.items,
        authors: authors.filter((author) => author.name.toLowerCase().includes(normalized)).slice(0, 4),
        publishers: publishers.filter((publisher) => publisher.name.toLowerCase().includes(normalized)).slice(0, 4),
        categories: categories.filter((category) => category.name.toLowerCase().includes(normalized)).slice(0, 4),
      };
    },
    async popular() { return []; },
  } satisfies SearchRepository,
};
