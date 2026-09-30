ALTER TABLE bookings
    MODIFY status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    ADD COLUMN subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER rental_amount,
    ADD COLUMN tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER discount_amount,
    ADD COLUMN total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER tax_amount,
    ADD COLUMN paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER total_amount,
    ADD COLUMN balance_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER paid_amount;

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
    MODIFY status ENUM('DRAFT', 'PENDING', 'CONFIRMED', 'READY', 'ACTIVE', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PENDING';

ALTER TABLE booking_items
    ADD COLUMN rental_price DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER unit_rental_rate,
    ADD COLUMN discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER deposit_amount,
    ADD COLUMN tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER discount_amount,
    ADD COLUMN total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER tax_amount;

UPDATE booking_items
SET rental_price = subtotal,
    total_amount = subtotal;

CREATE INDEX idx_booking_items_shop_inventory_booking
    ON booking_items (shop_id, inventory_item_id, booking_id, is_deleted);