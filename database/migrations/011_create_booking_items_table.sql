-- PostgreSQL migration: Create booking_items table

CREATE TABLE IF NOT EXISTS booking_items (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT NOT NULL,
    booking_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    inventory_item_id BIGINT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_rental_rate DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    deposit_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'assigned', 'active', 'returned', 'cancelled')),
    notes TEXT NULL,
    is_deleted SMALLINT NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ NULL DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_booking_items_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
    CONSTRAINT fk_booking_items_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    CONSTRAINT fk_booking_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    CONSTRAINT fk_booking_items_inventory FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_booking_items_booking ON booking_items (booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_items_product ON booking_items (product_id);
CREATE INDEX IF NOT EXISTS idx_booking_items_shop_status ON booking_items (shop_id, status);
