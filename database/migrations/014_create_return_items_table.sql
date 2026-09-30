-- PostgreSQL migration: Create return_items table

CREATE TABLE IF NOT EXISTS return_items (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT NOT NULL,
    return_id BIGINT NOT NULL,
    booking_item_id BIGINT NOT NULL,
    inventory_item_id BIGINT NOT NULL,
    condition_status VARCHAR(20) NOT NULL DEFAULT 'good'
        CHECK (condition_status IN ('good', 'minor_damage', 'major_damage', 'lost')),
    damage_fee DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    late_fee DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    actual_returned_at TIMESTAMPTZ NULL DEFAULT NULL,
    notes TEXT NULL,
    is_deleted SMALLINT NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ NULL DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_return_items_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
    CONSTRAINT fk_return_items_return FOREIGN KEY (return_id) REFERENCES returns(id) ON DELETE CASCADE,
    CONSTRAINT fk_return_items_booking_item FOREIGN KEY (booking_item_id) REFERENCES booking_items(id) ON DELETE RESTRICT,
    CONSTRAINT fk_return_items_inventory FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_return_items_return ON return_items (return_id);
CREATE INDEX IF NOT EXISTS idx_return_items_inventory ON return_items (inventory_item_id);
