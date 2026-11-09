ALTER TABLE "Product"
  ADD COLUMN "flashSaleEndsAt" TIMESTAMP(3);

UPDATE "Product" p
SET "flashSaleEndsAt" = CURRENT_TIMESTAMP + INTERVAL '3 days'
WHERE "flashSaleEndsAt" IS NULL
  AND EXISTS (
    SELECT 1
    FROM "ProductVariant" v
    WHERE v."productId" = p.id AND v."salePrice" IS NOT NULL
  );
