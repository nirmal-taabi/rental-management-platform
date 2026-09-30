-- PostgreSQL migration: Create user_shop_memberships table
-- Note: MySQL's GENERATED ALWAYS AS (STORED) for the unique-default constraint
-- is replaced with a partial unique index in PostgreSQL.

CREATE TABLE IF NOT EXISTS user_shop_memberships (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    shop_id BIGINT NOT NULL,
    role VARCHAR(100) NOT NULL DEFAULT 'STAFF',
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'invited', 'suspended', 'removed')),
    is_default SMALLINT NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ NULL DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_shop_memberships_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_shop_memberships_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_shop_memberships_user_shop
    ON user_shop_memberships (user_id, shop_id);

-- Enforce that each user can have at most one default active membership
-- (replaces the MySQL generated column + unique key approach)
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_shop_memberships_default_user
    ON user_shop_memberships (user_id)
    WHERE is_default = 1 AND status = 'active' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_shop_memberships_user_status
    ON user_shop_memberships (user_id, status);

CREATE INDEX IF NOT EXISTS idx_user_shop_memberships_shop_status
    ON user_shop_memberships (shop_id, status);

-- Back-fill memberships from the users table
INSERT INTO user_shop_memberships (user_id, shop_id, role, status, is_default)
SELECT
    u.id,
    u.shop_id,
    COALESCE(
        (
            SELECT UPPER(r.name)
            FROM user_roles ur
            INNER JOIN roles r ON r.id = ur.role_id AND r.shop_id = ur.shop_id
            WHERE ur.user_id = u.id AND ur.shop_id = u.shop_id AND r.is_deleted = 0
            ORDER BY
                CASE UPPER(r.name)
                    WHEN 'OWNER' THEN 1
                    WHEN 'ADMIN' THEN 2
                    WHEN 'STAFF' THEN 3
                    ELSE 4
                END, r.id
            LIMIT 1
        ),
        CASE WHEN u.is_owner = 1 THEN 'OWNER' ELSE 'STAFF' END
    ),
    CASE WHEN u.status = 'active' AND u.is_deleted = 0 THEN 'active' ELSE 'suspended' END,
    1
FROM users u
INNER JOIN shops s ON s.id = u.shop_id
ON CONFLICT (user_id, shop_id) DO NOTHING;
