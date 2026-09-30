# Product API

Base path: `/api/v1/products`

Products represent catalog designs/models, not physical pieces. Each endpoint uses the authenticated user's shop context. OWNER and ADMIN can create, edit, and change status. STAFF can list and view only.

## GET /api/v1/products

Server-side filters can be combined: `page` (default 1), `limit` (default 20, maximum 100), `search` (name, SKU, description), `categoryId`, `status` (`ACTIVE` or `INACTIVE`), `sortBy` (`created_at`, `updated_at`, `name`, `sku`, `rental_price`, `status`), and `sortOrder` (`asc` or `desc`).

The response includes `data` and pagination fields: `page`, `limit`, `totalItems`, `totalPages`, `hasNextPage`, and `hasPreviousPage`.

## GET /api/v1/products/:id

Returns the tenant-owned product, category name, URL references for images, prices, status, and timestamps. It contains no inventory data.

## GET /api/v1/products/sku-suggestion

Returns the next available SKU using the selected category name as its normalized prefix (for example, `BRIDAL-WEAR-0001`). The lookup is scoped to the authenticated shop.

### Query parameters

- `categoryId` (required)
- `excludeId` (optional product ID when editing; the product's own SKU is excluded from the duplicate check)

When editing without changing category, the current SKU is returned after checking it while excluding that product. Product create/update still enforces SKU uniqueness when saving.

## POST /api/v1/products

Create is `multipart/form-data` to support optional `images` files. Text fields are `categoryId`, `name`, `sku`, optional `brand`, `productType` (`GARMENT`, `EQUIPMENT`, `ACCESSORY`, or `OTHER`, default `GARMENT`), `description`, `rentalPrice`, and `depositAmount` (defaults to `0`). Optional `imageManifest` is a JSON array of `new:<file-index>` tokens in display order; `primaryImageToken` selects one token.

```json
{
  "categoryId": 12,
  "name": "Designer Red Bridal Lehenga",
  "sku": "BRL-RED-001",
  "description": "Heavy bridal lehenga with embroidery",
  "rentalPrice": "3500.00",
  "depositAmount": "5000.00"
}
```

The category must be active and belong to the current shop. SKU is trimmed, uppercased, and unique within the shop. Prices are non-negative decimal values with at most two fractional digits.

## PUT /api/v1/products/:id

Updates category, name, SKU, description, prices, and images. Send multipart data using the same fields. The image manifest can contain retained `existing:<image-id>` entries and `new:<file-index>` entries. Omitted existing images are removed from the active image set; image order and the primary marker are persisted.

## PATCH /api/v1/products/:id/status

Sets `ACTIVE` or `INACTIVE`.

```json
{ "status": "INACTIVE" }
```

## Image constraints

At most 8 images, maximum 5 MB each. JPEG, PNG, and WEBP are accepted. Upload MIME type and file signatures are checked. The local adapter writes generated filenames under `backend/storage/catalog/<shopId>/` and saves URL references only in MySQL.
Image retrieval uses authenticated `GET /api/v1/products/images/:shopId/:filename` and verifies both the caller's shop and the active product-image record.

## Errors

`400 VALIDATION_ERROR`, `400 PRODUCT_CATEGORY_MISMATCH`, `400 CATEGORY_INACTIVE`, `401 AUTHENTICATION_ERROR`, `403 AUTHORIZATION_ERROR`, `404 PRODUCT_NOT_FOUND`, `409 PRODUCT_SKU_EXISTS`, and `400 INVALID_PRODUCT_IMAGE` use the shared API error envelope. Validation responses include `error.details`.