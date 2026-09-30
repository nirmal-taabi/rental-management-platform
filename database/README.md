# Database Foundation

This folder contains the initial database setup for the rental management platform.

## Structure
- `migrations/` for schema migration files
- `seeds/` for seed data scripts
- `schema/` for design documents and SQL schema drafts

## Current state
The database foundation is intentionally minimal. The project is configured for MySQL and uses environment variables for all connection details. Full schema design will be developed later by feature module. Migration `023_create_location_lookup_tables.sql` creates and seeds the India state and city lookup data used during registration. Migration `024_create_customer_drafts_table.sql` stores incomplete customer profiles separately from active customer records.

## Apply migrations
Apply every SQL file in `migrations/` in numeric order when creating a database. For an existing database, apply any migrations that have not yet been run. Migration `019_expand_inventory_items.sql` adds fields required by inventory APIs, `020_expand_bookings_for_availability.sql` adds booking workflow/pricing fields, `021_expand_payments_ledger.sql` upgrades the existing payments table, `022_expand_pickup_return_workflow.sql` adds pickup/return lifecycle fields to existing tables, `023_create_location_lookup_tables.sql` adds state and city lookups, and `024_create_customer_drafts_table.sql` adds shop-scoped customer drafts. Apply pending migrations to the same database used by the backend.

## Import into phpMyAdmin
1. Open phpMyAdmin.
2. Select the `rental_management` database.
3. For a new database, open each migration file in `migrations/` in numeric order and run its SQL before moving to the next file.
4. For an existing database, run only the migration files that have not already been applied. Do not rerun migrations that create or add existing tables, columns, or indexes.

## Connection values
Use the same credentials in your local `.env` file as the database you created in phpMyAdmin:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=rental_management
DB_USER=root
DB_PASSWORD=your_local_mysql_password
```
