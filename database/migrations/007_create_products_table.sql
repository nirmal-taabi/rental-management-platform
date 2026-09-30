-- PostgreSQL migration: Create products table

CREATE TABLE IF NOT EXISTS products (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT NOT NULL,
    category_id BIGINT NOT NULL,
    sku VARCHAR(100) NOT NULL,
    name VARCHAR(180) NOT NULL,
    slug VARCHAR(180) NOT NULL,
    brand VARCHAR(120) NULL,
    description TEXT NULL,
    product_type VARCHAR(20) NOT NULL DEFAULT 'other'
        CHECK (product_type IN ('garment', 'equipment', 'accessory', 'other')),
    daily_rental_rate DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    weekly_rental_rate DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    monthly_rental_rate DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    security_deposit DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('active', 'inactive', 'draft')),
    is_deleted SMALLINT NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ NULL DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_products_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
    CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_products_shop_sku ON products (shop_id, sku);
CREATE UNIQUE INDEX IF NOT EXISTS uq_products_shop_slug ON products (shop_id, slug);
CREATE INDEX IF NOT EXISTS idx_products_shop_category ON products (shop_id, category_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products (status);
