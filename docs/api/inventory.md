# Physical Inventory API

Base path: `/api/v1/inventory`

Inventory rows represent physical pieces, not catalog designs. Every read and write derives tenant scope from the authenticated user's `shopId`; request `shopId` values are ignored.

## GET /api/v1/inventory

Supports `page` (default 1), `limit` (default 20, maximum 100), `search` (inventory SKU, barcode, product name/SKU, color), `productId`, `categoryId`, `status`, `condition`, `size`, `color`, `sortBy` (`createdAt`, `updatedAt`, `sku`, `product`, `status`, `size`), and `sortOrder` (`asc` or `desc`). All filters apply server-side and are tenant-scoped.

The response includes `data`, `summary`, and `pagination` (`page`, `limit`, `totalItems`, `totalPages`, `hasNextPage`, `hasPreviousPage`). Summary counts are informational and are not date-based availability.

## GET /api/v1/inventory/summary

Returns shop counts for total, available, reserved, rented, returned, inspection, cleaning, alteration, repair, maintenance, damaged, lost, and retired. Optional `productId` limits the summary to that product within the current shop.

## GET /api/v1/inventory/:id

Returns one tenant-owned item with product name/SKU/category/image and up to 50 audit activity records. Another shop's ID returns `404 INVENTORY_ITEM_NOT_FOUND`.

## POST /api/v1/inventory

OWNER/ADMIN only. Status is always initialized to `AVAILABLE`; the client cannot set it.

```json
{
  "productId": 42,
  "sku": "BRL-RED-001-02",
  "barcode": "890123456789",
  "qrCode": "inventory/BRL-RED-001-02",
  "size": "M",
  "color": "Red",
  "condition": "GOOD",
  "purchaseDate": "2026-09-28",
  "notes": "New stock"
}
```

The product must be active and belong to the authenticated shop. SKU and non-empty barcode are unique within that shop. `sku` maps to the existing `item_code` column.

## PUT /api/v1/inventory/:id

Updates SKU, barcode, QR reference, size, color, condition, purchase date, and notes. The linked product cannot be changed. OWNER/ADMIN/STAFF can edit metadata; tenant and uniqueness checks still apply.

## PATCH /api/v1/inventory/:id/status

OWNER/ADMIN only. Accepts a controlled status and validates the transition.

```json
{ "status": "CLEANING" }
```

## PATCH /api/v1/inventory/:id/condition

OWNER/ADMIN/STAFF can set `EXCELLENT`, `GOOD`, `FAIR`, or `DAMAGED`. Condition is separate from operational status.

## PATCH /api/v1/inventory/:id/retire

OWNER/ADMIN only. Moves an item to `RETIRED`; no physical deletion occurs. Retired items have no outgoing status transitions.

## Controlled values

Statuses: `AVAILABLE`, `RESERVED`, `RENTED`, `RETURNED`, `INSPECTION`, `CLEANING`, `ALTERATION`, `REPAIR`, `DAMAGED`, `LOST`, `RETIRED`.

Conditions: `EXCELLENT`, `GOOD`, `FAIR`, `DAMAGED`.

## Errors

`400 VALIDATION_ERROR`, `400 INVENTORY_PRODUCT_MISMATCH`, `401 AUTHENTICATION_ERROR`, `403 AUTHORIZATION_ERROR`, `404 INVENTORY_ITEM_NOT_FOUND`, `409 INVENTORY_SKU_EXISTS`, `409 INVENTORY_BARCODE_EXISTS`, and `409 INVENTORY_STATUS_TRANSITION_INVALID` use the centralized response envelope. Field validation includes `error.details`.