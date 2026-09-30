# Authentication and Tenant Authorization

## Token strategy
This application uses JWTs issued after successful login. The token is stored in an HttpOnly cookie named `auth_token` to avoid exposing raw tokens to JavaScript on the frontend. This keeps the token out of localStorage and reduces the risk of XSS-based token theft.

## JWT payload
The JWT payload contains only minimal identity information required for authorization and route access:

```json
{
  "id": 12,
  "shopId": 3,
  "roles": ["OWNER"]
}
```

Sensitive account and business details remain in the database and are returned only when required by the authenticated user context.

## Registration flow
1. Validate input on the backend.
2. Check for an existing user by email.
3. Create the tenant shop record.
4. Find or create the OWNER role for that shop.
5. Hash the password.
6. Create the owner user.
7. Assign the OWNER role.
8. Commit the transaction.

## Login flow
1. Validate the email and password.
2. Fetch the user by email.
3. Verify the password hash.
4. Confirm the user is active.
5. Load their shop and role set.
6. Issue a JWT and set the auth cookie.
7. Return non-sensitive user and shop data.

## Auth middleware
The authentication middleware reads the bearer token or auth cookie, validates the JWT, loads the current user, and attaches the request user context.

The middleware uses the signed JWT as the source of truth and ignores any client-supplied `shop_id` or other tenant values from the request.

## Role authorization
Authorization is enforced by an `authorizeRoles(...roles)` middleware. Routes such as `/api/v1/shop` can allow OWNER and ADMIN access while blocking lower-privilege accounts.

## Tenant isolation
Requests are always scoped to the current authenticated user’s `shopId`. If a user belongs to Shop A, they cannot operate as Shop B. The backend must never trust user input for tenant scoping.

## Logout flow
The logout endpoint clears the auth cookie and returns success. The flow is idempotent and safe to call repeatedly.

## Security considerations
- Passwords are hashed with bcrypt.
- JWT secrets come from `JWT_SECRET` and never from code.
- The token lifetime is configurable via `JWT_EXPIRES_IN`.
- Cookies are configured with `HttpOnly`, `SameSite=Lax`, and `Secure` in production.
- No password hashes or JWT secrets are exposed to the frontend.
