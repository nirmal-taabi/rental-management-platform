CREATE INDEX IF NOT EXISTS idx_customers_shop_phone_active
    ON customers (shop_id, phone, status);

CREATE INDEX IF NOT EXISTS idx_customers_shop_email
    ON customers (shop_id, email);

CREATE INDEX IF NOT EXISTS idx_customers_shop_created_at
    ON customers (shop_id, created_at);
