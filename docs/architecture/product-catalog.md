# Product Catalog Architecture

## Product versus inventory

A product is a shop's design/model (name and catalog SKU). It is not an individual rentable garment. Physical inventory identifiers, quantity, availability, booking, and barcode assignment are intentionally not implemented here.

## Category and product ownership

Categories and products are scoped to `shop_id`. Controllers pass only `req.user.shopId` into services and repositories. Read, update, status, category assignment, and image queries include that tenant context. Cross-shop IDs resolve as not found or as an unavailable category.

Category names are trimmed and compared case-insensitively within a shop. Existing `categories.slug` stores a deterministic hash of the normalized name; the existing shop/slug unique key closes concurrent duplicate-create races without imposing uniqueness on product names.

## SKU and pricing

SKUs are trimmed and stored uppercase. The existing `UNIQUE(shop_id, sku)` constraint provides tenant-scoped uniqueness; identical SKUs in separate shops are allowed. SKU identifies a catalog model and is not a physical inventory barcode.

The existing schema has `daily_rental_rate DECIMAL(12,2)` plus weekly/monthly rate columns. This module maps API `rentalPrice` to the existing daily rate and leaves other periods unchanged. Existing `brand` and `product_type` fields are exposed as optional brand and typed product metadata. API prices are decimal strings and are validated as non-negative with no more than two decimal places. `depositAmount` maps to `security_deposit DECIMAL(12,2)`; no tax or discount calculation is included.

## Images

MySQL stores URLs and ordering/primary metadata in `product_images`; it does not store binary data. Multer uses memory storage with an 8-file and 5 MB-per-file limit. The adapter checks allowed MIME types and JPEG/PNG/WEBP signatures, then writes UUID filenames under the shop's local catalog directory. Image retrieval is authenticated and checks both URL shop ID and the image's tenant-scoped database record. The storage interface (`storeProductImages`, `deleteProductImages`, `getProductImageUrl`) isolates product logic from local filesystem details so a later adapter can replace it. Backups must include the local `backend/storage` directory. There is no cloud storage or image transformation in this module.

## Transactions and audit

Product create/update/status and category create/update/status write audit records using the existing `audit_logs` table. Product and image-row changes are transactional; newly written local files are removed if their database transaction fails. Deactivated or removed image rows are soft-deleted, while corresponding local files are cleaned up after a successful image-set update.

## Deactivation and category changes

Categories are not hard deleted. Deactivation does not change existing product relationships. Inactive categories are excluded from new product assignments and category changes, but existing products remain visible and can still be edited without changing category.

## Authorization

OWNER and ADMIN have full category/product access. STAFF can list and view both resource types; mutation routes are guarded by the existing role middleware.

## Index migration

The existing schema already has unique `(shop_id, slug)` and `(shop_id, sku)` keys, as well as category and image indexes. Migration `017_add_catalog_indexes.sql` adds shop/status/name category filtering, shop/status/created product listing, shop/created sorting, and shop/product/active/order image access. Migration `018_add_product_search_index.sql` adds FULLTEXT over product name/SKU/description. Search detects that index and combines it with substring fallbacks; if 018 is not yet applied, substring search remains functional. Apply migrations once, in order, after confirming earlier migrations are present.