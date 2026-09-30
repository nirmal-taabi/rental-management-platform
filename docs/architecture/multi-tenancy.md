# Multi-Tenancy Architecture

## Tenant isolation
This platform is designed for multiple rental businesses operating as separate tenants. Each business (shop) should maintain separate records for users, customers, catalog items, inventory, bookings, and other operational data.

## shop_id strategy
Most core business tables should include a `shop_id` column. This enables tenant-scoped data access and helps enforce logical separation between shops in the same shared database.

## Authentication relationship
A user should belong to a single shop, or to a parent admin context that can manage one or more shops. The authenticated session should determine the current tenant context, not data sent from the frontend.

## Authorization expectations
Authorization rules should check the current authenticated identity and the resolved shop context before allowing access to data. The same API endpoints must enforce tenant-consistent filters.

## Preventing cross-shop queries
All future queries must enforce tenant boundaries. The app should always join or filter on the authenticated user's shop context and reject requests that attempt to operate outside that tenant scope.

> Important: Never trust `shop_id` provided directly by the frontend for authorization. The tenant identity must eventually come from the authenticated user or session context.

## Future implementation notes
- Add shop-aware middleware for request context.
- Use scoped repository methods like `findByShopId` or `findByTenantContext`.
- Validate every user action against the current tenant and role.
- Keep shared infrastructure and tenant metadata separate from domain data where possible.
