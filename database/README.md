# Database Foundation

This folder contains the initial database setup for the rental management platform.

## Structure
- `migrations/` for schema migration files
- `seeds/` for seed data scripts
- `schema/` for design documents and SQL schema drafts

## Current state
The backend uses PostgreSQL, with Supabase as the hosted database. Migration `023_create_location_lookup_tables.sql` creates and seeds the India state and city lookup data used during registration. Migration `024_create_customer_drafts_table.sql` stores incomplete customer profiles separately from active customer records. Migration `025_create_user_shop_memberships_table.sql` introduces active user-to-shop memberships, shop-scoped roles, and default-shop selection while preserving the legacy `users.shop_id` column and `user_roles` records. Migration `027_add_dashboard_booking_date_index.sql` supports tenant-scoped booking-date analytics.

## Apply migrations
Apply every SQL file in `migrations/` in numeric order when creating a database. For an existing database, apply only migrations that have not yet been run. Migrations `019` through `025` add inventory, booking, payment, pickup/return, location, customer-draft, and membership fields; migration `026` enables public read-only access to registration location lookups; migration `027` adds the dashboard booking-date index. Apply pending migrations to the same database used by the backend before deploying code that depends on them.

## Apply through Supabase
Use the Supabase SQL Editor to apply each pending migration in numeric order. For an existing database, do not rerun migrations that have already been applied.

## Connection values
Set the same PostgreSQL `DATABASE_URL` in local `.env` and the backend deployment environment:

```env
DATABASE_URL=postgresql://postgres:URL_ENCODED_PASSWORD@your-supabase-host:5432/postgres?sslmode=require
DB_SSL=true
```
