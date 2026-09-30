# Database Architecture

## Goal
This V1 schema establishes a clean multi-tenant foundation for a rental management SaaS used by businesses in India. The design intentionally focuses on core tenant identity, users, catalog, inventory, customer, booking, payment, return, and audit flows without introducing business workflow complexity too early.

## Multi-tenant strategy
- The primary tenant boundary is the `shops` table.
- Most transactional tables include a `shop_id` column and are scoped by the authenticated shop context.
- The application must resolve tenant context from the authenticated user/session, not from a client-supplied `shop_id` value.
- Data isolation is enforced through tenant-aware queries and repository patterns.

## Naming conventions
- Tables use lowercase snake_case names.
- Foreign keys are named as `fk_table_related_table`.
- Unique indexes follow the pattern `uq_<table>_<column>`.
- Indexes follow `idx_<table>_<column>` naming conventions.

## Core tables
- `shops`: tenant identity and configuration
- `users`: staff accounts for each shop
- `roles`: access roles per tenant
- `user_roles`: assignment between users and roles
- `customers`: rental customers per shop
- `categories`: catalog taxonomy and nested categories
- `products`: rental catalog items
- `product_images`: product gallery records
- `inventory_items`: physical stock units associated to a product
- `bookings`: high-level rental orders
- `booking_items`: line items for each booking
- `payments`: payment transactions against bookings
- `returns`: return process for completed rentals
- `return_items`: per-item return evaluation
- `alterations`: repairs or tailoring tasks for rental items
- `audit_logs`: entity change tracking and traceability

## Data type choices
- Money values use `DECIMAL(12,2)` to avoid floating-point issues.
- Dates that represent a business date use `DATE`.
- Timestamp fields are stored in MySQL as `TIMESTAMP` for audit purposes.
- `JSON` is used for tenant settings and raw audit payloads.

## Soft delete strategy
Every business table includes `is_deleted` and `deleted_at` columns to preserve historical integrity without hard-deleting records during operational use.

## Indexing strategy
Primary indexes focus on the tenant key and the entities most likely to be filtered in dashboard queries:
- `shop_id` + `status`
- `shop_id` + `customer_id`
- `shop_id` + `booking_number`
- `shop_id` + `slug` or `sku`
- `product_id` and `inventory_item_id` lookups
- `created_at` for audit log retrieval

Inventory migration 019 retains legacy `item_code` and `condition_status` columns for compatibility while exposing API `sku`, `status`, and independent physical condition fields.

## Constraints and integrity
- Referential integrity uses foreign keys where the relationship is mandatory.
- `ON DELETE CASCADE` is used for tenant-owned records where child rows should disappear with the parent tenant context.
- `ON DELETE SET NULL` is used for optional relationships such as user-owned or inventory assignment references.
- Unique constraints protect against duplicate slugs, SKUs, emails, and booking numbers within a tenant.

## Assumptions
- The system is designed for a rental business that handles garments and accessories as rental inventory.
- Each shop is a logical tenant. A user belongs to a single shop unless multi-shop management is introduced later.
- Payment and return records are created as operational data, not yet as a full accounting module.
- The schema is intentionally V1 and can evolve with additional modules such as coupons, delivery notes, or GST reporting.

## Migration and seed workflow
1. Apply all migration files in numerical order.
2. Run the seed script for a sample tenant and catalog data.
3. Validate schema structure, foreign keys, and index coverage in phpMyAdmin or MySQL Workbench.
4. Add service-layer validation before production deployment.
