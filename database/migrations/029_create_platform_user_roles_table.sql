-- PostgreSQL migration: Add platform-wide administrator roles.
-- To roll back, first remove this table with:
-- DROP TABLE IF EXISTS platform_user_roles;

CREATE TABLE IF NOT EXISTS platform_user_roles (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(32) NOT NULL CHECK (role IN ('SUPER_ADMIN')),
    granted_by_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    reason VARCHAR(500) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_platform_user_roles_role
    ON platform_user_roles (role);
