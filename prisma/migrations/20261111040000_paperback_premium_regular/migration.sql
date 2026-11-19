-- Hardcover variants no longer use a "(Regular)" variant label.
UPDATE "ProductVariant"
SET "name" = 'Hardcover'
WHERE "name" = 'Hardcover (Regular)';

-- Existing paperback products get a separate Regular paperback variant.
-- Premium keeps the existing price; Regular starts from the paperback list price.
INSERT INTO "ProductVariant"
    ("id", "productId", "sku", "name", "basePrice", "regularPrice", "salePrice")
SELECT
    gen_random_uuid(),
    premium."productId",
    'PBREG-' || replace(premium."id"::text, '-', ''),
    'Paperback (Regular)',
    premium."regularPrice",
    premium."regularPrice",
    NULL
FROM "ProductVariant" premium
WHERE premium."name" = 'Paperback (Premium)'
  AND NOT EXISTS (
    SELECT 1
    FROM "ProductVariant" regular_variant
    WHERE regular_variant."productId" = premium."productId"
      AND regular_variant."name" = 'Paperback (Regular)'
  );

-- Give each new Regular paperback variant its own inventory record.
INSERT INTO "Inventory" ("id", "variantId", "quantity", "reserved", "updatedAt")
SELECT
    gen_random_uuid(),
    regular_variant."id",
    COALESCE(premium_inventory."quantity", 0),
    COALESCE(premium_inventory."reserved", 0),
    NOW()
FROM "ProductVariant" regular_variant
JOIN "ProductVariant" premium
  ON premium."productId" = regular_variant."productId"
 AND premium."name" = 'Paperback (Premium)'
LEFT JOIN "Inventory" premium_inventory
  ON premium_inventory."variantId" = premium."id"
WHERE regular_variant."name" = 'Paperback (Regular)';
