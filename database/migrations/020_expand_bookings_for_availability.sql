-- PostgreSQL migration: Expand bookings and booking_items for availability

-- Drop old status constraint and widen column
ALTER TABLE bookings
    DROP CONSTRAINT IF EXISTS bookings_status_check,
    ALTER COLUMN status TYPE VARCHAR(30),
    ALTER COLUMN status SET DEFAULT 'PENDING',
    ADD COLUMN IF NOT EXISTS subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS balance_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00;

UPDATE bookings
SET status = CASE UPPER(status)
        WHEN 'DRAFT' THEN 'DRAFT'
        WHEN 'CONFIRMED' THEN 'CONFIRMED'
        WHEN 'ACTIVE' THEN 'ACTIVE'
        WHEN 'OVERDUE' THEN 'ACTIVE'
        WHEN 'COMPLETED' THEN 'COMPLETED'
        WHEN 'RETURNED' THEN 'COMPLETED'
        WHEN 'CANCELLED' THEN 'CANCELLED'
        ELSE 'PENDING'
    END,
    subtotal = rental_amount,
    total_amount = GREATEST(rental_amount - discount_amount, 0),
    balance_amount = GREATEST(rental_amount - discount_amount, 0) + deposit_amount;

ALTER TABLE bookings
    ADD CONSTRAINT chk_bookings_status CHECK (status IN (
        'DRAFT', 'PENDING', 'CONFIRMED', 'READY', 'ACTIVE', 'COMPLETED', 'CANCELLED'
    ));

-- Expand booking_items
ALTER TABLE booking_items
    ADD COLUMN IF NOT EXISTS rental_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00;

UPDATE booking_items
SET rental_price = subtotal,
    total_amount = subtotal;

CREATE INDEX IF NOT EXISTS idx_booking_items_shop_inventory_booking
    ON booking_items (shop_id, inventory_item_id, booking_id, is_deleted);
