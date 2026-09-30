# Shops and Memberships API

Base path: `/api/v1/shops`. All routes require authentication. A selected shop ID is a client preference, not authorization: authenticated business requests resolve `X-Shop-Id` only after verifying an active `user_shop_memberships` row and an active shop. If the header is omitted, legacy token shop context or the user's active default membership is used. The API never accepts an owner/user ID to assign shop ownership.

## List accessible shops

`GET /api/v1/shops` returns shops with active memberships for the authenticated user. Each lightweight record includes `id`, `name`, `code`, `city`, `state`, `role`, `status`, and `isDefault`. The response does not include operational data from other shops.

## Create a shop

`POST /api/v1/shops` accepts `name` and `businessName` (both required), plus optional `phone`, `email`, `address`, `city`, `state`, `pincode`, and `gstNumber`. The internal shop code is generated from the shop name. Optional fields are validated when provided. The authenticated user is added as an active `OWNER` in the same database transaction as shop creation; a new shop does not silently become the default or active shop.

```json
{
  "name": "Classic Bridal Studio",
  "businessName": "Classic Bridal Studio Private Limited",
  "phone": "9876543210",
  "email": "studio@example.com",
  "address": "12 Market Road",
  "city": "Chennai",
  "state": "Tamil Nadu",
  "pincode": "600001"
}
```

The response contains the new shop context, including `role: "OWNER"` and `isDefault: false`. Shop creation is audited as `SHOP_CREATED`.

## Switch shops

`POST /api/v1/shops/:shopId/switch` verifies an active membership and active shop, then returns `{ "currentShop": { ... } }`. The frontend stores the returned ID as a preference and sends it as `X-Shop-Id` on later requests. Every request revalidates membership server-side. Unrelated or inactive shops receive a generic `403 SHOP_ACCESS_DENIED` response.

`PATCH /api/v1/shops/:shopId/status` accepts `{ "status": "ACTIVE" }` or `{ "status": "INACTIVE" }`. The target membership must be OWNER or ADMIN. Deactivation preserves the shop and all historical data, writes `SHOP_DEACTIVATED`/`SHOP_REACTIVATED` audit events, and is rejected with `409 LAST_ACTIVE_SHOP` if it would leave the acting user without another active shop membership.

## Existing shop profile routes

The existing `GET /api/v1/shop` and `PUT /api/v1/shop` remain available and operate on the validated active shop. OWNER/ADMIN authorization is evaluated against the active membership role.

## Migration and compatibility

Apply database migration `025_create_user_shop_memberships_table.sql` before deploying this API. It backfills each existing user's current `users.shop_id` and shop-scoped `user_roles` role as an active default membership. The legacy column and role tables are retained for compatibility; they are not used to authorize a requested active shop.