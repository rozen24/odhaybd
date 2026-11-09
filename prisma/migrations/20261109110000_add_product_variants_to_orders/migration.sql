-- Add format-specific inventory and preserve the selected format on orders.
ALTER TABLE "OrderItem" ADD COLUMN "variantId" UUID;
ALTER TABLE "OrderItem" ADD COLUMN "variantName" TEXT;

ALTER TABLE "OrderItem"
  ADD CONSTRAINT "OrderItem_variantId_fkey"
  FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "OrderItem_variantId_idx" ON "OrderItem"("variantId");
