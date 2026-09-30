# Customer API

All customer requests require an authenticated shop session and follow the standard API response format.

## Base path

`/api/v1/customers`

## Authentication

- Requires JWT via the existing auth middleware
- Tenant context is derived from the authenticated user's `shopId`
- All customer operations are restricted to the current shop

## GET /api/v1/customers

Returns customer records for the current shop with server-side pagination and filtering.

### Query parameters

- `page` (default: `1`)
- `limit` (default: `20`, max: `100`)
- `search` (name, phone, email)
- `status` (`ACTIVE` or `INACTIVE`)
- `rentalFilter` (`ACTIVE` or `UPCOMING`); matches customers with an active rental or a future pending, confirmed, or ready booking
- `sortBy` (`created_at`, `updated_at`, `first_name`, `last_name`, `status`)
- `sortOrder` (`asc` or `desc`)

### Example

```http
GET /api/v1/customers?page=1&limit=20&search=arun&rentalFilter=ACTIVE&sortBy=created_at&sortOrder=desc
```

### Response

```json
{
  "success": true,
  "message": "Customers retrieved successfully.",
  "data": [
    {
      "id": 1,
      "shopId": 2,
      "firstName": "Arun",
      "lastName": "Kumar",
      "phone": "9876543210",
      "alternatePhone": null,
      "email": "arun@example.com",
      "address": "12 Main Road",
      "city": "Chennai",
      "state": "Tamil Nadu",
      "pincode": "600001",
      "notes": "Preferred customer",
      "status": "ACTIVE",
      "createdAt": "2026-09-29T00:00:00.000Z",
      "updatedAt": "2026-09-29T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalItems": 1,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPreviousPage": false
  },
  "summary": {
    "totalCustomers": 348,
    "activeCustomers": 324,
    "inactiveCustomers": 24,
    "activeRentals": 24,
    "upcomingRentals": 18
  }
}
```

## GET /api/v1/customers/:id

Returns a single customer for the current shop.

## POST /api/v1/customers

Creates a new customer under the authenticated shop.

### Request body

```json
{
  "firstName": "Arun",
  "lastName": "Kumar",
  "phone": "9876543210",
  "alternatePhone": "",
  "email": "arun@example.com",
  "address": "12 Main Road",
  "city": "Chennai",
  "state": "Tamil Nadu",
  "pincode": "600001",
  "notes": "Preferred customer"
}
```

## PUT /api/v1/customers/:id

Updates the customer if it belongs to the current shop.

## PATCH /api/v1/customers/:id/status

Changes customer status.

### Request body

```json
{
  "status": "INACTIVE"
}
```

Allowed values:

- `ACTIVE`
- `INACTIVE`

## Customer drafts

Drafts are incomplete customer forms stored separately from customers. All draft operations are scoped to the authenticated user's shop. Draft fields are optional while saving; full customer validation runs when the draft is submitted through `POST /api/v1/customers`.

### GET /api/v1/customers/drafts

Returns the current shop's drafts, ordered by most recently updated.

### POST /api/v1/customers/drafts

Creates a draft. The request body accepts the same customer fields as the create endpoint, but permits incomplete values.

### GET /api/v1/customers/drafts/:id

Returns one draft belonging to the current shop.

### PUT /api/v1/customers/drafts/:id

Replaces the saved form data for a draft belonging to the current shop.

### DELETE /api/v1/customers/drafts/:id

Deletes a draft belonging to the current shop.

Apply database migration `024_create_customer_drafts_table.sql` before using these endpoints.

## Error codes

- `VALIDATION_ERROR`
- `AUTHENTICATION_ERROR`
- `AUTHORIZATION_ERROR`
- `CUSTOMER_NOT_FOUND`
- `CUSTOMER_DRAFT_NOT_FOUND`
- `DUPLICATE_CUSTOMER`
- `INTERNAL_SERVER_ERROR`
