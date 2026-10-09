# TrackinHub Platform Administration

## Super Admin provisioning

Super Admin access is stored separately from shop memberships in
`platform_user_roles`. New registration never grants platform privileges.
Provision only a specifically reviewed, active existing user account.

1. Apply database migration `029_create_platform_user_roles_table.sql` (or
   recreate the database using `database/schema/supabase_schema.sql`).
2. Find and verify the intended account and its active shop membership:

   ```sql
   SELECT u.id, u.first_name, u.last_name, u.email, u.status,
          m.shop_id, m.role, m.status AS membership_status
   FROM users u
   JOIN user_shop_memberships m ON m.user_id = u.id
   WHERE u.email = 'verified-admin@example.com'
     AND u.is_deleted = 0
     AND m.status = 'active'
     AND m.deleted_at IS NULL;
   ```

   Email can be associated with more than one account across shops; verify the
   account ID and shop with the operator before granting access.
3. Grant the role by replacing `123` with the verified user ID. Use the same
   user as grantor when performing the initial trusted database bootstrap:

   ```sql
   INSERT INTO platform_user_roles (user_id, role, granted_by_user_id, reason)
   VALUES (123, 'SUPER_ADMIN', 123, 'Initial platform administrator bootstrap')
   ON CONFLICT (user_id, role) DO NOTHING;
   ```

4. The user signs in through the normal TrackinHub login page. The backend
   resolves platform roles from the database on every authenticated request;
   frontend state or a client-supplied tenant ID cannot grant Super Admin
   access.

The existing account must remain active and retain an active shop membership,
because the current authentication system requires a shop context. Removing
the row from `platform_user_roles` revokes platform access immediately. Admin
APIs are read-only for accounts, customers, and bookings; shop status changes
are limited to statuses already supported by the schema and are audited.

## Shop staff accounts

Owners can open **Settings → Team members** to create a `STAFF` account for
their current shop. The owner supplies the staff member's email and a temporary
password. The email must not already belong to a TrackinHub account. Share the
credentials securely; the staff member must change the temporary password
before using the workspace. Staff can change only their own password through
the forced first-login flow.

Owners can suspend and reactivate staff membership access. Suspension is
shop-specific and does not delete the account or its history. Staff account
creation and access changes are written to that shop's audit log. Apply
`030_add_password_reset_required.sql` before enabling this feature (or recreate
the database from `database/schema/supabase_schema.sql`).

## Data boundaries

Platform account users (owners and staff) are records in `users`; rental end
customers are separate records in `customers`. The admin screens keep those
lists distinct. Booking monitoring is read-only. Global activity history is
not available because existing audit records are scoped to a shop; the
overview shows recent shop registrations and bookings instead.
