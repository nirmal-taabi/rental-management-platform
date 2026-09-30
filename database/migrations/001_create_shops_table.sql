CREATE TABLE IF NOT EXISTS shops (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
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
    status ENUM('active', 'inactive', 'pending', 'suspended') NOT NULL DEFAULT 'pending',
    logo_url VARCHAR(500) NULL,
    settings_json JSON NULL,
    is_deleted TINYINT(1) NOT NULL DEFAULT 0,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_shops_slug (slug),
    KEY idx_shops_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE shops
    ADD COLUMN legal_name VARCHAR(200) NULL AFTER slug,
    ADD COLUMN email VARCHAR(150) NULL AFTER legal_name,
    ADD COLUMN phone VARCHAR(30) NULL AFTER email,
    ADD COLUMN address_line1 VARCHAR(255) NULL AFTER phone,
    ADD COLUMN address_line2 VARCHAR(255) NULL AFTER address_line1,
    ADD COLUMN city VARCHAR(100) NULL AFTER address_line2,
    ADD COLUMN state VARCHAR(100) NULL AFTER city,
    ADD COLUMN postal_code VARCHAR(20) NULL AFTER state,
    ADD COLUMN country VARCHAR(100) NOT NULL DEFAULT 'India' AFTER postal_code,
    ADD COLUMN gst_number VARCHAR(50) NULL AFTER country,
    ADD COLUMN currency_code CHAR(3) NOT NULL DEFAULT 'INR' AFTER gst_number,
    ADD COLUMN timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Kolkata' AFTER currency_code,
    ADD COLUMN logo_url VARCHAR(500) NULL AFTER status,
    ADD COLUMN settings_json JSON NULL AFTER logo_url,
    ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0 AFTER settings_json,
    ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL AFTER is_deleted,
    MODIFY status ENUM('active', 'inactive', 'pending', 'suspended') NOT NULL DEFAULT 'pending';

-- Notes:
-- This table represents each tenant / rental business.
-- All downstream business tables should include a shop_id foreign key.
