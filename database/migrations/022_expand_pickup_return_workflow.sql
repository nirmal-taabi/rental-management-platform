ALTER TABLE bookings
    ADD COLUMN picked_up_at TIMESTAMP NULL DEFAULT NULL AFTER status,
    ADD COLUMN picked_up_by_user_id BIGINT UNSIGNED NULL AFTER picked_up_at,
    ADD COLUMN pickup_notes TEXT NULL AFTER picked_up_by_user_id,
    ADD COLUMN returned_at TIMESTAMP NULL DEFAULT NULL AFTER pickup_notes,
    ADD CONSTRAINT fk_bookings_picked_up_by_user FOREIGN KEY (picked_up_by_user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE booking_items
    ADD COLUMN picked_up_at TIMESTAMP NULL DEFAULT NULL AFTER status;

ALTER TABLE returns
    ADD COLUMN received_by_user_id BIGINT UNSIGNED NULL AFTER customer_id,
    ADD COLUMN damage_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER total_late_fee,
    ADD CONSTRAINT fk_returns_received_by_user FOREIGN KEY (received_by_user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE return_items
    ADD COLUMN return_condition ENUM('EXCELLENT', 'GOOD', 'FAIR', 'DAMAGED') NOT NULL DEFAULT 'GOOD' AFTER condition_status,
    ADD COLUMN damage_status ENUM('NONE', 'MINOR', 'MAJOR', 'LOST') NOT NULL DEFAULT 'NONE' AFTER return_condition;

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

CREATE INDEX idx_returns_shop_date ON returns (shop_id, return_date);
CREATE INDEX idx_return_items_shop_booking_item ON return_items (shop_id, booking_item_id, is_deleted);
CREATE INDEX idx_return_items_shop_inventory ON return_items (shop_id, inventory_item_id, is_deleted);