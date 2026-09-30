# Authentication API

## POST /api/v1/auth/register
Creates a new shop, account, default active membership, and OWNER role in one transaction.

### Request
```json
{
  "owner": {
    "firstName": "Amit",
    "lastName": "Sharma",
    "email": "amit@example.com",
    "phone": "9876543210",
    "password": "Password@123",
    "confirmPassword": "Password@123"
  },
  "shop": {
    "name": "Amit Rentals",
    "businessName": "Amit Rentals Private Limited",
    "phone": "9876543210",
    "email": "shop@example.com",
    "address": "Main Road",
    "city": "Delhi",
    "state": "Delhi",
    "pincode": "110001",
    "gstNumber": "07ABCDE1234F1Z5"
  }
}
```

### Success response
```json
{
  "success": true,
  "message": "Registration successful. Please log in.",
  "data": {
    "user": {
      "id": 1,
      "name": "Amit Sharma",
      "email": "amit@example.com",
      "phone": "9876543210",
      "roles": ["OWNER"]
    },
    "shop": {
      "id": 1,
      "name": "Amit Rentals",
      "code": "amit-rentals",
      "businessName": "Amit Rentals Private Limited",
      "role": "OWNER",
      "isDefault": true,
      "city": "Delhi",
      "state": "Delhi"
    }
  }
}
```

### Errors
- `400` for invalid payload
- `409` if the email already exists
- `500` for unexpected server errors

## POST /api/v1/auth/login
Authenticates a user and creates an HttpOnly identity cookie. The JWT identifies the user; active-shop roles are resolved from memberships on each request.

### Request
```json
{
  "email": "amit@example.com",
  "password": "Password@123"
}
```

### Success response
```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "user": {
      "id": 1,
      "name": "Amit Sharma",
      "email": "amit@example.com",
      "roles": ["OWNER"]
    },
    "shop": {
      "id": 1,
      "name": "Amit Rentals",
      "businessName": "Amit Rentals Private Limited",
      "role": "OWNER",
      "isDefault": true
    },
    "shops": [{
      "id": 1,
      "name": "Amit Rentals",
      "code": "amit-rentals",
      "role": "OWNER",
      "status": "ACTIVE",
      "isDefault": true
    }]
  }
}
```

## POST /api/v1/auth/logout
Clears the user auth cookie.

### Auth requirement
Requires an authenticated session.

### Response
```json
{
  "success": true,
  "message": "Logged out successfully.",
  "data": {}
}
```

## GET /api/v1/auth/me
Loads the authenticated user, currently selected shop, and accessible shop memberships.

### Auth requirement
Requires an authenticated session.

### Response
```json
{
  "success": true,
  "message": "User profile loaded.",
  "data": {
    "user": {
      "id": 1,
      "name": "Amit Sharma",
      "email": "amit@example.com",
      "roles": ["OWNER"]
    },
    "shop": {
      "id": 1,
      "name": "Amit Rentals",
      "businessName": "Amit Rentals Private Limited",
      "role": "OWNER"
    },
    "currentShop": {
      "id": 1,
      "name": "Amit Rentals",
      "role": "OWNER"
    },
    "shops": [{
      "id": 1,
      "name": "Amit Rentals",
      "code": "amit-rentals",
      "role": "OWNER",
      "status": "ACTIVE",
      "isDefault": true
    }]
  }
}
```

## GET /api/v1/shop
Returns the currently selected, membership-validated shop profile.

### Auth requirement
Requires an authenticated session.

## PUT /api/v1/shop
Updates the currently selected shop profile.

### Auth requirement
OWNER or ADMIN only

### Request
```json
{
  "name": "Amit Rentals",
  "businessName": "Amit Rentals Private Limited",
  "phone": "9876543210",
  "email": "shop@example.com",
  "address": "12 Main Market Road",
  "city": "Delhi",
  "state": "Delhi",
  "pincode": "110001",
  "gstNumber": "07ABCDE1234F1Z5"
}
```

## Active shop context

Authenticated business requests may include `X-Shop-Id` to select an active membership. The backend validates that the user has an active membership in an active shop before authorizing the request. The header is a preference only; it does not grant access. If omitted, the server resolves the legacy token shop where valid or the user's active default membership. See [Shops and memberships](shops.md) for listing, creation, switching, and lifecycle APIs.

Apply database migration `025_create_user_shop_memberships_table.sql` before deploying membership-aware authentication. The migration preserves the legacy `users.shop_id` and `user_roles` data.
