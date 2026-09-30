# Customer Management Architecture

## Overview

Customer management is implemented as a tenant-scoped module within the existing modular monolith. Each shop owns its customers and no customer record is ever shared across tenants.

## Tenant isolation

The authenticated request always includes the shop context via `req.user.shopId`. Every repository method that reads or writes customer data receives the shopId and includes it in SQL filters.

Example:

```js
SELECT * FROM customers
WHERE shop_id = ? AND is_deleted = 0;
```

This prevents cross-tenant access by ID tampering or direct URL manipulation.

## Layers

- Route: request routing and permission checks
- Controller: request parsing and response formatting
- Service: business validation, duplicate detection, status rules
- Repository: MySQL queries, tenant-scoped access
- Validator: request payload validation

## Search and pagination

- Search is performed by the database using `first_name`, `last_name`, `phone`, `alternate_phone`, and `email`
- Pagination is implemented server-side
- Default page is `1` and default limit is `20`
- Maximum allowed limit is `100`

## Duplicate handling

Customer creation checks the current shop for likely duplicates based on phone and email. This avoids accidental duplicates without forcing global phone uniqueness across all shops.

## Status model

Customer status uses `ACTIVE` and `INACTIVE` values. Hard deletes are avoided so historical customer records remain available for future rental bookings and audit needs.

## Role model

- `OWNER`: create, view, update, deactivate
- `ADMIN`: create, view, update, deactivate
- `STAFF`: create, view, update

## Future extension

The response shape and customer detail page include a placeholder rental history section so booking history can be added in a future module without altering the customer foundation.
