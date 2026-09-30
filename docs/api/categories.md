# Category API

Base path: `/api/v1/categories`

Every endpoint requires authentication. The authenticated user's `shopId` is the tenant authority; clients cannot select a shop. OWNER and ADMIN can create, update, and change status. STAFF can list and view only.

## GET /api/v1/categories

Returns categories for the current shop. Supports `page` (default 1), `limit` (default 100, maximum 100), `search`, `status` (`ACTIVE` or `INACTIVE`), `sortBy` (`name`, `created_at`, `updated_at`, `status`), and `sortOrder` (`asc` or `desc`).

## GET /api/v1/categories/:id

Returns a category belonging to the current shop; other-shop IDs return `404 CATEGORY_NOT_FOUND`.

## POST /api/v1/categories

Creates an active category. Category names are trimmed and case-insensitive duplicates are rejected within the shop with `409 CATEGORY_NAME_EXISTS`.

```json
{
  "name": "Bridal Lehenga",
  "description": "Bridal lehenga designs"
}
```

## PUT /api/v1/categories/:id

Updates `name` and `description`; tenant ownership and duplicate-name checks are enforced.

## PATCH /api/v1/categories/:id/status

Sets `ACTIVE` or `INACTIVE`.

```json
{ "status": "INACTIVE" }
```

There is no delete endpoint. Deactivation preserves products linked to the category. An inactive category cannot be selected for a new product or category change, but existing products remain readable and editable when their category is unchanged.

## Errors

`400 VALIDATION_ERROR`, `401 AUTHENTICATION_ERROR`, `403 AUTHORIZATION_ERROR`, `404 CATEGORY_NOT_FOUND`, and `409 CATEGORY_NAME_EXISTS` use the shared API error envelope. Validation responses include `error.details` with field names and messages.