-- PostgreSQL migration: Create roles table

CREATE TABLE IF NOT EXISTS roles (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description VARCHAR(255) NULL,
    is_system SMALLINT NOT NULL DEFAULT 0,
    is_deleted SMALLINT NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ NULL DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_roles_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_roles_shop_slug ON roles (shop_id, slug);
CREATE INDEX IF NOT EXISTS idx_roles_shop_name ON roles (shop_id, name);
