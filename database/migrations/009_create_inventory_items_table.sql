-- PostgreSQL migration: Create inventory_items table

CREATE TABLE IF NOT EXISTS inventory_items (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    item_code VARCHAR(80) NOT NULL,
    size VARCHAR(50) NULL,
    color VARCHAR(50) NULL,
    condition_status VARCHAR(20) NOT NULL DEFAULT 'available'
        CHECK (condition_status IN ('available', 'rented', 'maintenance', 'damaged', 'retired')),
    purchase_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    current_value DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    acquired_at TIMESTAMPTZ NULL DEFAULT NULL,
    last_service_at TIMESTAMPTZ NULL DEFAULT NULL,
    notes TEXT NULL,
    is_deleted SMALLINT NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ NULL DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_inventory_items_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
    CONSTRAINT fk_inventory_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_items_shop_code ON inventory_items (shop_id, item_code);
CREATE INDEX IF NOT EXISTS idx_inventory_items_shop_product ON inventory_items (shop_id, product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_status ON inventory_items (condition_status);
