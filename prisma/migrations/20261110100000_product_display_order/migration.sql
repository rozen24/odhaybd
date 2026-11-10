ALTER TABLE "public"."Product"
ADD COLUMN "displayOrder" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "Product_sellerId_displayOrder_idx"
ON "public"."Product"("sellerId", "displayOrder");
