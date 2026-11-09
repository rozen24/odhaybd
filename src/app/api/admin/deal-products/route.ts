import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/guards";
import { toDealProduct } from "@/lib/deals";
import { fail, handle, isUuid, ok, readJson, str } from "@/lib/api-route";

export const POST = handle(async (request: Request) => {
  const auth = await requireRole("ADMIN", "EDITOR");
  if (auth.error) return auth.error;
  const b = await readJson(request);

  const campaignId = str(b.campaign_id, 40);
  const productId = str(b.product_id, 40);
  if (!isUuid(campaignId) || !isUuid(productId)) return fail("Choose a campaign and a book", 400);
  const stockLimit = b.stock_limit === null || b.stock_limit === undefined || b.stock_limit === "" ? null : Number(b.stock_limit);
  if (stockLimit !== null && (!Number.isInteger(stockLimit) || stockLimit < 0)) return fail("Enter a valid stock limit", 400);

  const [campaign, product] = await Promise.all([
    prisma.dealCampaign.findUnique({ where: { id: campaignId }, select: { id: true, type: true } }),
    prisma.product.findUnique({
      where: { id: productId },
      select: {
        regularPrice: true,
        salePrice: true,
        flashSaleEndsAt: true,
        variants: { select: { salePrice: true } },
      },
    }),
  ]);
  if (!campaign) return fail("Campaign not found", 404);
  if (!product) return fail("Book not found", 404);
  const isNonPriceDeal = campaign.type === "FREE_SHIPPING" || campaign.type === "BUY_ONE_GET_ONE";
  const dealPrice = isNonPriceDeal ? Number(product.regularPrice) : Number(b.deal_price);
  if (!Number.isFinite(dealPrice) || dealPrice <= 0) return fail("Enter a valid deal price", 400);
  if (campaign.type === "TODAYS_DEAL") {
    const hasActiveFlashSale = !!product.flashSaleEndsAt &&
      product.flashSaleEndsAt > new Date() &&
      (product.salePrice !== null || product.variants.some((variant) => variant.salePrice !== null));
    if (hasActiveFlashSale) return fail("This product is already in the flash sale", 409);
  }
  // The original price always comes from the book itself, not from the browser.
  const originalPrice = Number(product.regularPrice);
  if (dealPrice > originalPrice) return fail("The deal price can't be higher than the book's price", 400);

  const duplicate = await prisma.dealProduct.findUnique({ where: { campaignId_productId: { campaignId, productId } } });
  if (duplicate) return fail("This book is already in the campaign", 409);

  const last = await prisma.dealProduct.aggregate({ where: { campaignId }, _max: { displayOrder: true } });
  const row = await prisma.dealProduct.create({
    data: {
      campaignId,
      productId,
      originalPrice,
      dealPrice,
      stockLimit,
      displayOrder: Number.isInteger(b.display_order) ? (b.display_order as number) : (last._max.displayOrder ?? -1) + 1,
      active: b.is_active !== false,
    },
  });
  return ok(toDealProduct(row), { status: 201 });
});
