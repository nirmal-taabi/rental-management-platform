-- PostgreSQL migration: Create payments table

CREATE TABLE IF NOT EXISTS payments (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT NOT NULL,
    booking_id BIGINT NULL,
    customer_id BIGINT NOT NULL,
    payment_number VARCHAR(50) NOT NULL,
    payment_method VARCHAR(30) NOT NULL
        CHECK (payment_method IN ('cash', 'upi', 'card', 'bank_transfer', 'wallet', 'credit')),
    amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    gst_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'paid', 'partial', 'failed', 'refunded')),
    transaction_reference VARCHAR(150) NULL,
    paid_at TIMESTAMPTZ NULL DEFAULT NULL,
    notes TEXT NULL,
    is_deleted SMALLINT NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ NULL DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_payments_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
    CONSTRAINT fk_payments_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
    CONSTRAINT fk_payments_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_shop_number ON payments (shop_id, payment_number);
CREATE INDEX IF NOT EXISTS idx_payments_shop_booking ON payments (shop_id, booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments (status);
