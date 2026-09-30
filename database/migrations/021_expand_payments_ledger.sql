ALTER TABLE payments
    MODIFY payment_method VARCHAR(32) NOT NULL DEFAULT 'OTHER',
    MODIFY status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    ADD COLUMN payment_type VARCHAR(24) NOT NULL DEFAULT 'OTHER' AFTER amount,
    ADD COLUMN refunded_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER amount,
    ADD COLUMN transaction_date DATE NULL AFTER paid_at,
    ADD COLUMN created_by_user_id BIGINT UNSIGNED NULL AFTER transaction_date,
    ADD COLUMN cancelled_by_user_id BIGINT UNSIGNED NULL AFTER created_by_user_id,
    ADD COLUMN cancelled_at TIMESTAMP NULL DEFAULT NULL AFTER cancelled_by_user_id,
    ADD COLUMN cancellation_reason VARCHAR(500) NULL AFTER cancelled_at;

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
    transaction_date = COALESCE(DATE(paid_at), DATE(created_at));

ALTER TABLE payments
    MODIFY payment_method ENUM('CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'ONLINE', 'OTHER') NOT NULL DEFAULT 'OTHER',
    MODIFY status ENUM('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED') NOT NULL DEFAULT 'PENDING',
    MODIFY transaction_date DATE NOT NULL;

ALTER TABLE payments
    ADD CONSTRAINT fk_payments_created_by_user FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT fk_payments_cancelled_by_user FOREIGN KEY (cancelled_by_user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX idx_payments_shop_transaction_date ON payments (shop_id, transaction_date);
CREATE INDEX idx_payments_shop_status_date ON payments (shop_id, status, transaction_date);
CREATE INDEX idx_payments_shop_method_date ON payments (shop_id, payment_method, transaction_date);
CREATE INDEX idx_payments_shop_type_date ON payments (shop_id, payment_type, transaction_date);
CREATE INDEX idx_payments_shop_customer_date ON payments (shop_id, customer_id, transaction_date);