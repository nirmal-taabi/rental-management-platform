-- PostgreSQL migration: Expand payments table for ledger support

-- Widen enums to VARCHAR for PostgreSQL flexibility
ALTER TABLE payments
    DROP CONSTRAINT IF EXISTS payments_payment_method_check,
    DROP CONSTRAINT IF EXISTS payments_status_check,
    ALTER COLUMN payment_method TYPE VARCHAR(32),
    ALTER COLUMN payment_method SET DEFAULT 'OTHER',
    ALTER COLUMN status TYPE VARCHAR(32),
    ALTER COLUMN status SET DEFAULT 'PENDING',
    ADD COLUMN IF NOT EXISTS payment_type VARCHAR(24) NOT NULL DEFAULT 'OTHER',
    ADD COLUMN IF NOT EXISTS refunded_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS transaction_date DATE NULL,
    ADD COLUMN IF NOT EXISTS created_by_user_id BIGINT NULL,
    ADD COLUMN IF NOT EXISTS cancelled_by_user_id BIGINT NULL,
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ NULL DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS cancellation_reason VARCHAR(500) NULL;

UPDATE payments
SET payment_method = CASE LOWER(payment_method)
        WHEN 'cash' THEN 'CASH'
        WHEN 'upi' THEN 'UPI'
        WHEN 'card' THEN 'CARD'
        WHEN 'bank_transfer' THEN 'BANK_TRANSFER'
        ELSE 'OTHER'
    END,
    status = CASE LOWER(status)
        WHEN 'pending' THEN 'PENDING'
        WHEN 'paid' THEN 'SUCCESS'
        WHEN 'partial' THEN 'SUCCESS'
        WHEN 'failed' THEN 'FAILED'
        WHEN 'refunded' THEN 'REFUNDED'
        ELSE 'PENDING'
    END,
    refunded_amount = CASE WHEN LOWER(status) = 'refunded' THEN amount ELSE 0 END,
    transaction_date = COALESCE(paid_at::DATE, created_at::DATE);

ALTER TABLE payments
    ADD CONSTRAINT chk_payments_method CHECK (payment_method IN (
        'CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'ONLINE', 'OTHER'
    )),
    ADD CONSTRAINT chk_payments_status CHECK (status IN (
        'PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED'
    )),
    ALTER COLUMN transaction_date SET NOT NULL;

ALTER TABLE payments
    ADD CONSTRAINT fk_payments_created_by_user
        FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_payments_cancelled_by_user
        FOREIGN KEY (cancelled_by_user_id) REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_payments_shop_transaction_date ON payments (shop_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_payments_shop_status_date ON payments (shop_id, status, transaction_date);
CREATE INDEX IF NOT EXISTS idx_payments_shop_method_date ON payments (shop_id, payment_method, transaction_date);
CREATE INDEX IF NOT EXISTS idx_payments_shop_type_date ON payments (shop_id, payment_type, transaction_date);
CREATE INDEX IF NOT EXISTS idx_payments_shop_customer_date ON payments (shop_id, customer_id, transaction_date);
