-- PostgreSQL migration: Create alterations table

CREATE TABLE IF NOT EXISTS alterations (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT NOT NULL,
    booking_item_id BIGINT NULL,
    inventory_item_id BIGINT NULL,
    alteration_type VARCHAR(20) NOT NULL DEFAULT 'other'
        CHECK (alteration_type IN ('tailoring', 'repair', 'cleaning', 'stitching', 'other')),
    status VARCHAR(20) NOT NULL DEFAULT 'requested'
        CHECK (status IN ('requested', 'in_progress', 'completed', 'cancelled')),
    description TEXT NOT NULL,
    labor_cost DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    material_cost DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    completed_at TIMESTAMPTZ NULL DEFAULT NULL,
    is_deleted SMALLINT NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ NULL DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_alterations_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
    CONSTRAINT fk_alterations_booking_item FOREIGN KEY (booking_item_id) REFERENCES booking_items(id) ON DELETE SET NULL,
    CONSTRAINT fk_alterations_inventory_item FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_alterations_shop_status ON alterations (shop_id, status);
CREATE INDEX IF NOT EXISTS idx_alterations_type ON alterations (alteration_type);
