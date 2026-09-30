-- PostgreSQL migration: Create categories table

CREATE TABLE IF NOT EXISTS categories (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT NOT NULL,
    parent_category_id BIGINT NULL,
    name VARCHAR(120) NOT NULL,
    slug VARCHAR(120) NOT NULL,
    description VARCHAR(500) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive')),
    is_deleted SMALLINT NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ NULL DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_categories_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
    CONSTRAINT fk_categories_parent FOREIGN KEY (parent_category_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_shop_slug ON categories (shop_id, slug);
CREATE INDEX IF NOT EXISTS idx_categories_shop_parent ON categories (shop_id, parent_category_id);
CREATE INDEX IF NOT EXISTS idx_categories_status ON categories (status);
