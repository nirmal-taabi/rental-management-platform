-- PostgreSQL migration: Create bookings table

CREATE TABLE IF NOT EXISTS bookings (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT NOT NULL,
    customer_id BIGINT NOT NULL,
    created_by_user_id BIGINT NULL,
    booking_number VARCHAR(50) NOT NULL,
    booking_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    rental_start_date DATE NOT NULL,
    rental_end_date DATE NOT NULL,
    expected_return_date DATE NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'confirmed', 'active', 'completed', 'cancelled', 'overdue', 'returned')),
    rental_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    deposit_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    notes TEXT NULL,
    is_deleted SMALLINT NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ NULL DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_bookings_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
    CONSTRAINT fk_bookings_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_bookings_user FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_bookings_shop_number ON bookings (shop_id, booking_number);
CREATE INDEX IF NOT EXISTS idx_bookings_shop_customer ON bookings (shop_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status_date ON bookings (shop_id, status, rental_start_date, rental_end_date);
