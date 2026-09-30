# Physical Inventory Architecture

## Product and item distinction

A catalog product is a design/model. An inventory item is one physical piece belonging to exactly one product. Item identifiers are shop-level unique and are distinct from product SKUs.

## Existing table compatibility

Migration `009_create_inventory_items_table.sql` already created `inventory_items`; it is not recreated. Migration `019_expand_inventory_items.sql` adds barcode, QR reference, date, independent operational status, and physical condition, and backfills existing rows. Public API `sku` maps to the existing tenant-unique `item_code`, preserving its current uniqueness constraint and seeded values. The old combined `condition_status`, purchase values, timestamps, and foreign keys are retained for compatibility. New code treats `status` and `physical_condition` as canonical.

Legacy values map as follows: `available` to `AVAILABLE/GOOD`, `rented` to `RENTED/GOOD`, `maintenance` to `INSPECTION/GOOD`, `damaged` to `DAMAGED/DAMAGED`, and `retired` to `RETIRED/GOOD`.

## Tenant and product integrity

Every inventory repository query is scoped by authenticated `shopId`. Inventory detail and audit history use both item ID and shop ID. Product lookup requires an active, non-deleted product in the same shop. Product reassignment is not supported after item creation. Inventory remains queryable if its catalog product is later soft-deleted so physical stock is not hidden.

`UNIQUE(shop_id, item_code)` enforces inventory SKU uniqueness; migration 019 adds `UNIQUE(shop_id, barcode)`. Empty barcodes are stored as `NULL`, allowing multiple items without a barcode.

## Status and condition

Status transitions are centralized in `inventoryStatus.service.js`. `LOST` can only move to `RETIRED`; `RETIRED` is terminal. Other allowed transitions support manual inspection, cleaning, alteration, and repair flows. OWNER/ADMIN manage status and retirement; STAFF can view, edit metadata, and update condition. Condition and status remain independent.

No booking-driven transitions, date-based availability, payment, return, or scanning/printing workflow is implemented. Summary counts are informational only.

## Audit

Create, metadata update, condition change, status change, and retirement actions use the existing `audit_logs` repository/table. Detail history is tenant- and entity-scoped.

## Indexes

Migration 019 adds shop/status/created, shop/condition, and shop/acquired-date indexes. Existing shop/item-code uniqueness and shop/product lookup indexes are retained.