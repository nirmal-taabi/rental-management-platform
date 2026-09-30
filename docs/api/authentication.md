# Authentication API

## POST /api/v1/auth/register
Creates a new shop and owner account.

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
      "businessName": "Amit Rentals Private Limited",
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
Authenticates a user and creates an HttpOnly auth cookie.

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
      "businessName": "Amit Rentals Private Limited"
    }
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
Loads the current authenticated user and their tenant shop.

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
      "businessName": "Amit Rentals Private Limited"
    }
  }
}
```

## GET /api/v1/shop
Returns the authenticated user’s shop profile.

### Auth requirement
Requires an authenticated session.

## PUT /api/v1/shop
Updates the authenticated shop profile.

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
