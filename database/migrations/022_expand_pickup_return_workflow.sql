-- PostgreSQL migration: Expand pickup and return workflow

ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMPTZ NULL DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS picked_up_by_user_id BIGINT NULL,
    ADD COLUMN IF NOT EXISTS pickup_notes TEXT NULL,
    ADD COLUMN IF NOT EXISTS returned_at TIMESTAMPTZ NULL DEFAULT NULL;

ALTER TABLE bookings
    ADD CONSTRAINT fk_bookings_picked_up_by_user
        FOREIGN KEY (picked_up_by_user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE booking_items
    ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMPTZ NULL DEFAULT NULL;

ALTER TABLE returns
    ADD COLUMN IF NOT EXISTS received_by_user_id BIGINT NULL,
    ADD COLUMN IF NOT EXISTS damage_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00;

ALTER TABLE returns
    ADD CONSTRAINT fk_returns_received_by_user
        FOREIGN KEY (received_by_user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE return_items
    ADD COLUMN IF NOT EXISTS return_condition VARCHAR(20) NOT NULL DEFAULT 'GOOD',
    ADD COLUMN IF NOT EXISTS damage_status VARCHAR(10) NOT NULL DEFAULT 'NONE';

ALTER TABLE return_items
    ADD CONSTRAINT chk_return_items_condition CHECK (return_condition IN ('EXCELLENT', 'GOOD', 'FAIR', 'DAMAGED')),
    ADD CONSTRAINT chk_return_items_damage_status CHECK (damage_status IN ('NONE', 'MINOR', 'MAJOR', 'LOST'));

UPDATE return_items
SET return_condition = CASE condition_status
        WHEN 'good' THEN 'GOOD'
        WHEN 'minor_damage' THEN 'FAIR'
        WHEN 'major_damage' THEN 'DAMAGED'
        WHEN 'lost' THEN 'DAMAGED'
        ELSE 'GOOD'
    END,
    damage_status = CASE condition_status
        WHEN 'minor_damage' THEN 'MINOR'
        WHEN 'major_damage' THEN 'MAJOR'
        WHEN 'lost' THEN 'LOST'
        ELSE 'NONE'
    END;

CREATE INDEX IF NOT EXISTS idx_returns_shop_date ON returns (shop_id, return_date);
CREATE INDEX IF NOT EXISTS idx_return_items_shop_booking_item
    ON return_items (shop_id, booking_item_id, is_deleted);
CREATE INDEX IF NOT EXISTS idx_return_items_shop_inventory
    ON return_items (shop_id, inventory_item_id, is_deleted);
