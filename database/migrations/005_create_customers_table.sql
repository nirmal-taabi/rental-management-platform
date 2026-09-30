-- PostgreSQL migration: Create customers table

CREATE TABLE IF NOT EXISTS customers (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NULL,
    phone VARCHAR(30) NULL,
    alternate_phone VARCHAR(30) NULL,
    email VARCHAR(150) NULL,
    address_line1 VARCHAR(255) NULL,
    address_line2 VARCHAR(255) NULL,
    city VARCHAR(100) NULL,
    state VARCHAR(100) NULL,
    postal_code VARCHAR(20) NULL,
    gstin VARCHAR(50) NULL,
    id_proof_type VARCHAR(50) NULL,
    id_proof_number VARCHAR(100) NULL,
    preferred_language VARCHAR(50) NULL,
    notes TEXT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive', 'blacklisted')),
    is_deleted SMALLINT NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ NULL DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_customers_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_customers_shop_phone ON customers (shop_id, phone);
CREATE INDEX IF NOT EXISTS idx_customers_shop_status ON customers (shop_id, status);
CREATE INDEX IF NOT EXISTS idx_customers_shop_name ON customers (shop_id, first_name, last_name);
