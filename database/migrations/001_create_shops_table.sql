-- PostgreSQL migration: Create shops table
-- Each row represents one tenant / rental business.

CREATE TABLE IF NOT EXISTS shops (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    legal_name VARCHAR(200) NULL,
    email VARCHAR(150) NULL,
    phone VARCHAR(30) NULL,
    address_line1 VARCHAR(255) NULL,
    address_line2 VARCHAR(255) NULL,
    city VARCHAR(100) NULL,
    state VARCHAR(100) NULL,
    postal_code VARCHAR(20) NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'India',
    gst_number VARCHAR(50) NULL,
    currency_code CHAR(3) NOT NULL DEFAULT 'INR',
    timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Kolkata',
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('active', 'inactive', 'pending', 'suspended')),
    logo_url VARCHAR(500) NULL,
    settings_json JSONB NULL,
    is_deleted SMALLINT NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ NULL DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_shops_slug ON shops (slug);
CREATE INDEX IF NOT EXISTS idx_shops_status ON shops (status);
