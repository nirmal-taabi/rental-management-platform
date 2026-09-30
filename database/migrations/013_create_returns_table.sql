-- PostgreSQL migration: Create returns table

CREATE TABLE IF NOT EXISTS returns (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT NOT NULL,
    booking_id BIGINT NOT NULL,
    customer_id BIGINT NOT NULL,
    return_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'partial', 'completed', 'late')),
    total_late_fee DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    notes TEXT NULL,
    is_deleted SMALLINT NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ NULL DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_returns_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
    CONSTRAINT fk_returns_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE RESTRICT,
    CONSTRAINT fk_returns_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_returns_booking ON returns (booking_id);
CREATE INDEX IF NOT EXISTS idx_returns_shop_status ON returns (shop_id, status);
