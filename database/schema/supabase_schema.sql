-- ============================================================
-- Rental Management Platform — PostgreSQL / Supabase Schema
-- Run this entire file in Supabase SQL Editor to bootstrap the DB.
-- ============================================================

-- ─── Trigger function: auto-update updated_at ───────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ─── shops ───────────────────────────────────────────────────
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
    deleted_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_shops_slug ON shops (slug);
CREATE INDEX IF NOT EXISTS idx_shops_status ON shops (status);
CREATE TRIGGER trg_shops_updated_at BEFORE UPDATE ON shops
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── users ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NULL,
    email VARCHAR(150) NOT NULL,
    phone VARCHAR(30) NULL,
    password_hash VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('active', 'inactive', 'pending', 'locked')),
    is_owner SMALLINT NOT NULL DEFAULT 0,
    last_login_at TIMESTAMPTZ NULL,
    is_deleted SMALLINT NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_shop_email ON users (shop_id, email);
CREATE INDEX IF NOT EXISTS idx_users_shop_status ON users (shop_id, status);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── roles ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description VARCHAR(255) NULL,
    is_system SMALLINT NOT NULL DEFAULT 0,
    is_deleted SMALLINT NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_roles_shop_slug ON roles (shop_id, slug);
CREATE INDEX IF NOT EXISTS idx_roles_shop_name ON roles (shop_id, name);
CREATE TRIGGER trg_roles_updated_at BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── user_roles ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_roles (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_roles_unique ON user_roles (shop_id, user_id, role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_shop_user ON user_roles (shop_id, user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_shop_role ON user_roles (shop_id, role_id);

-- ─── user_shop_memberships ───────────────────────────────────
CREATE TABLE IF NOT EXISTS user_shop_memberships (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shop_id BIGINT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    role VARCHAR(100) NOT NULL DEFAULT 'STAFF',
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'invited', 'suspended', 'removed')),
    is_default SMALLINT NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_shop_memberships_user_shop
    ON user_shop_memberships (user_id, shop_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_shop_memberships_default_user
    ON user_shop_memberships (user_id)
    WHERE is_default = 1 AND status = 'active' AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_user_shop_memberships_user_status
    ON user_shop_memberships (user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_shop_memberships_shop_status
    ON user_shop_memberships (shop_id, status);
CREATE TRIGGER trg_user_shop_memberships_updated_at BEFORE UPDATE ON user_shop_memberships
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── customers ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
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
    deleted_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_customers_shop_phone ON customers (shop_id, phone)
    WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_shop_status ON customers (shop_id, status);
CREATE INDEX IF NOT EXISTS idx_customers_shop_name ON customers (shop_id, first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_customers_shop_phone_active ON customers (shop_id, phone, status);
CREATE INDEX IF NOT EXISTS idx_customers_shop_email ON customers (shop_id, email);
CREATE INDEX IF NOT EXISTS idx_customers_shop_created_at ON customers (shop_id, created_at);
CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── customer_drafts ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customer_drafts (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    created_by_user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
    draft_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_customer_drafts_shop_updated ON customer_drafts (shop_id, updated_at);
CREATE TRIGGER trg_customer_drafts_updated_at BEFORE UPDATE ON customer_drafts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── categories ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    parent_category_id BIGINT NULL REFERENCES categories(id) ON DELETE SET NULL,
    name VARCHAR(120) NOT NULL,
    slug VARCHAR(120) NOT NULL,
    description VARCHAR(500) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive')),
    is_deleted SMALLINT NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_shop_slug ON categories (shop_id, slug);
CREATE INDEX IF NOT EXISTS idx_categories_shop_parent ON categories (shop_id, parent_category_id);
CREATE INDEX IF NOT EXISTS idx_categories_status ON categories (status);
CREATE INDEX IF NOT EXISTS idx_categories_shop_status_name ON categories (shop_id, status, name);
CREATE TRIGGER trg_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── products ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    category_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    sku VARCHAR(100) NOT NULL,
    name VARCHAR(180) NOT NULL,
    slug VARCHAR(180) NOT NULL,
    brand VARCHAR(120) NULL,
    description TEXT NULL,
    product_type VARCHAR(20) NOT NULL DEFAULT 'other'
        CHECK (product_type IN ('garment', 'equipment', 'accessory', 'other')),
    daily_rental_rate DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    weekly_rental_rate DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    monthly_rental_rate DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    security_deposit DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('active', 'inactive', 'draft')),
    -- Full-text search vector (replaces MySQL FULLTEXT index)
    search_vector tsvector GENERATED ALWAYS AS (
        to_tsvector('english',
            coalesce(name, '') || ' ' ||
            coalesce(sku, '') || ' ' ||
            coalesce(description, '')
        )
    ) STORED,
    is_deleted SMALLINT NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_products_shop_sku ON products (shop_id, sku);
CREATE UNIQUE INDEX IF NOT EXISTS uq_products_shop_slug ON products (shop_id, slug);
CREATE INDEX IF NOT EXISTS idx_products_shop_category ON products (shop_id, category_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products (status);
CREATE INDEX IF NOT EXISTS idx_products_shop_status_created ON products (shop_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_products_shop_created ON products (shop_id, created_at);
CREATE INDEX IF NOT EXISTS idx_products_catalog_search ON products USING GIN (search_vector);
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── product_images ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_images (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    image_url VARCHAR(500) NOT NULL,
    is_primary SMALLINT NOT NULL DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0,
    is_deleted SMALLINT NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images (product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_shop_primary ON product_images (shop_id, is_primary);
CREATE INDEX IF NOT EXISTS idx_product_images_shop_product
    ON product_images (shop_id, product_id, is_deleted, sort_order);
CREATE TRIGGER trg_product_images_updated_at BEFORE UPDATE ON product_images
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── inventory_items ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_items (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    item_code VARCHAR(80) NOT NULL,
    barcode VARCHAR(100) NULL,
    qr_code VARCHAR(500) NULL,
    size VARCHAR(50) NULL,
    color VARCHAR(50) NULL,
    condition_status VARCHAR(20) NOT NULL DEFAULT 'available'
        CHECK (condition_status IN ('available', 'rented', 'maintenance', 'damaged', 'retired')),
    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE'
        CHECK (status IN (
            'AVAILABLE', 'RESERVED', 'RENTED', 'RETURNED', 'INSPECTION',
            'CLEANING', 'ALTERATION', 'REPAIR', 'DAMAGED', 'LOST', 'RETIRED'
        )),
    physical_condition VARCHAR(20) NOT NULL DEFAULT 'GOOD'
        CHECK (physical_condition IN ('EXCELLENT', 'GOOD', 'FAIR', 'DAMAGED')),
    purchase_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    current_value DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    acquired_at TIMESTAMPTZ NULL,
    purchase_date DATE NULL,
    last_service_at TIMESTAMPTZ NULL,
    notes TEXT NULL,
    is_deleted SMALLINT NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_items_shop_code ON inventory_items (shop_id, item_code);
CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_items_shop_barcode
    ON inventory_items (shop_id, barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_items_shop_product ON inventory_items (shop_id, product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_status ON inventory_items (condition_status);
CREATE INDEX IF NOT EXISTS idx_inventory_items_shop_status_created
    ON inventory_items (shop_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_inventory_items_shop_condition
    ON inventory_items (shop_id, physical_condition);
CREATE INDEX IF NOT EXISTS idx_inventory_items_shop_acquired
    ON inventory_items (shop_id, acquired_at);
CREATE TRIGGER trg_inventory_items_updated_at BEFORE UPDATE ON inventory_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── bookings ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    created_by_user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
    booking_number VARCHAR(50) NOT NULL,
    booking_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    rental_start_date DATE NOT NULL,
    rental_end_date DATE NOT NULL,
    expected_return_date DATE NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('DRAFT', 'PENDING', 'CONFIRMED', 'READY', 'ACTIVE', 'COMPLETED', 'CANCELLED')),
    picked_up_at TIMESTAMPTZ NULL,
    picked_up_by_user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
    pickup_notes TEXT NULL,
    returned_at TIMESTAMPTZ NULL,
    rental_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    deposit_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    balance_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    notes TEXT NULL,
    is_deleted SMALLINT NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_bookings_shop_number ON bookings (shop_id, booking_number);
CREATE INDEX IF NOT EXISTS idx_bookings_shop_customer ON bookings (shop_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status_date
    ON bookings (shop_id, status, rental_start_date, rental_end_date);
CREATE TRIGGER trg_bookings_updated_at BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── booking_items ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS booking_items (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    booking_id BIGINT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    inventory_item_id BIGINT NULL REFERENCES inventory_items(id) ON DELETE SET NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_rental_rate DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    rental_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    deposit_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'assigned', 'active', 'returned', 'cancelled')),
    picked_up_at TIMESTAMPTZ NULL,
    notes TEXT NULL,
    is_deleted SMALLINT NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_booking_items_booking ON booking_items (booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_items_product ON booking_items (product_id);
CREATE INDEX IF NOT EXISTS idx_booking_items_shop_status ON booking_items (shop_id, status);
CREATE INDEX IF NOT EXISTS idx_booking_items_shop_inventory_booking
    ON booking_items (shop_id, inventory_item_id, booking_id, is_deleted);
CREATE TRIGGER trg_booking_items_updated_at BEFORE UPDATE ON booking_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── payments ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    booking_id BIGINT NULL REFERENCES bookings(id) ON DELETE SET NULL,
    customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    payment_number VARCHAR(50) NOT NULL,
    payment_method VARCHAR(32) NOT NULL DEFAULT 'OTHER'
        CHECK (payment_method IN ('CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'ONLINE', 'OTHER')),
    amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    refunded_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    payment_type VARCHAR(24) NOT NULL DEFAULT 'OTHER',
    gst_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED')),
    transaction_reference VARCHAR(150) NULL,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    paid_at TIMESTAMPTZ NULL,
    created_by_user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
    cancelled_by_user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
    cancelled_at TIMESTAMPTZ NULL,
    cancellation_reason VARCHAR(500) NULL,
    notes TEXT NULL,
    is_deleted SMALLINT NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_shop_number ON payments (shop_id, payment_number);
CREATE INDEX IF NOT EXISTS idx_payments_shop_booking ON payments (shop_id, booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments (status);
CREATE INDEX IF NOT EXISTS idx_payments_shop_transaction_date ON payments (shop_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_payments_shop_status_date ON payments (shop_id, status, transaction_date);
CREATE INDEX IF NOT EXISTS idx_payments_shop_method_date
    ON payments (shop_id, payment_method, transaction_date);
CREATE INDEX IF NOT EXISTS idx_payments_shop_type_date ON payments (shop_id, payment_type, transaction_date);
CREATE INDEX IF NOT EXISTS idx_payments_shop_customer_date
    ON payments (shop_id, customer_id, transaction_date);
CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── returns ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS returns (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    booking_id BIGINT NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
    customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    received_by_user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
    return_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'partial', 'completed', 'late')),
    total_late_fee DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    damage_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    notes TEXT NULL,
    is_deleted SMALLINT NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_returns_booking ON returns (booking_id);
CREATE INDEX IF NOT EXISTS idx_returns_shop_status ON returns (shop_id, status);
CREATE INDEX IF NOT EXISTS idx_returns_shop_date ON returns (shop_id, return_date);
CREATE TRIGGER trg_returns_updated_at BEFORE UPDATE ON returns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── return_items ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS return_items (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    return_id BIGINT NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
    booking_item_id BIGINT NOT NULL REFERENCES booking_items(id) ON DELETE RESTRICT,
    inventory_item_id BIGINT NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
    condition_status VARCHAR(20) NOT NULL DEFAULT 'good'
        CHECK (condition_status IN ('good', 'minor_damage', 'major_damage', 'lost')),
    return_condition VARCHAR(20) NOT NULL DEFAULT 'GOOD'
        CHECK (return_condition IN ('EXCELLENT', 'GOOD', 'FAIR', 'DAMAGED')),
    damage_status VARCHAR(10) NOT NULL DEFAULT 'NONE'
        CHECK (damage_status IN ('NONE', 'MINOR', 'MAJOR', 'LOST')),
    damage_fee DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    late_fee DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    actual_returned_at TIMESTAMPTZ NULL,
    notes TEXT NULL,
    is_deleted SMALLINT NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_return_items_return ON return_items (return_id);
CREATE INDEX IF NOT EXISTS idx_return_items_inventory ON return_items (inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_return_items_shop_booking_item
    ON return_items (shop_id, booking_item_id, is_deleted);
CREATE INDEX IF NOT EXISTS idx_return_items_shop_inventory
    ON return_items (shop_id, inventory_item_id, is_deleted);
CREATE TRIGGER trg_return_items_updated_at BEFORE UPDATE ON return_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── alterations ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alterations (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    booking_item_id BIGINT NULL REFERENCES booking_items(id) ON DELETE SET NULL,
    inventory_item_id BIGINT NULL REFERENCES inventory_items(id) ON DELETE SET NULL,
    alteration_type VARCHAR(20) NOT NULL DEFAULT 'other'
        CHECK (alteration_type IN ('tailoring', 'repair', 'cleaning', 'stitching', 'other')),
    status VARCHAR(20) NOT NULL DEFAULT 'requested'
        CHECK (status IN ('requested', 'in_progress', 'completed', 'cancelled')),
    description TEXT NOT NULL,
    labor_cost DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    material_cost DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    completed_at TIMESTAMPTZ NULL,
    is_deleted SMALLINT NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_alterations_shop_status ON alterations (shop_id, status);
CREATE INDEX IF NOT EXISTS idx_alterations_type ON alterations (alteration_type);
CREATE TRIGGER trg_alterations_updated_at BEFORE UPDATE ON alterations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── audit_logs ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    entity_type VARCHAR(100) NOT NULL,
    entity_id BIGINT NOT NULL,
    action VARCHAR(50) NOT NULL,
    user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
    old_values JSONB NULL,
    new_values JSONB NULL,
    ip_address VARCHAR(45) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_shop_entity ON audit_logs (shop_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_shop_entity_created
    ON audit_logs (shop_id, entity_type, entity_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at);

-- ─── location lookup tables ──────────────────────────────────
CREATE TABLE IF NOT EXISTS location_states (
    id SMALLSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_location_states_name ON location_states (name);

CREATE TABLE IF NOT EXISTS location_cities (
    id SERIAL PRIMARY KEY,
    state_id SMALLINT NOT NULL REFERENCES location_states(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_location_cities_state_name ON location_cities (state_id, name);
CREATE INDEX IF NOT EXISTS idx_location_cities_name ON location_cities (name);

-- ─── Seed: Indian states ─────────────────────────────────────
INSERT INTO location_states (name) VALUES
    ('Andhra Pradesh'), ('Arunachal Pradesh'), ('Assam'), ('Bihar'),
    ('Chhattisgarh'), ('Goa'), ('Gujarat'), ('Haryana'),
    ('Himachal Pradesh'), ('Jharkhand'), ('Karnataka'), ('Kerala'),
    ('Madhya Pradesh'), ('Maharashtra'), ('Manipur'), ('Meghalaya'),
    ('Mizoram'), ('Nagaland'), ('Odisha'), ('Punjab'), ('Rajasthan'),
    ('Sikkim'), ('Tamil Nadu'), ('Telangana'), ('Tripura'),
    ('Uttar Pradesh'), ('Uttarakhand'), ('West Bengal'),
    ('Andaman and Nicobar Islands'), ('Chandigarh'),
    ('Dadra and Nagar Haveli and Daman and Diu'), ('Delhi'),
    ('Jammu and Kashmir'), ('Ladakh'), ('Lakshadweep'), ('Puducherry')
ON CONFLICT (name) DO NOTHING;

-- ─── Seed: Major Indian cities ────────────────────────────────
INSERT INTO location_cities (state_id, name)
SELECT s.id, c.city FROM location_states s
JOIN (VALUES
    ('Andhra Pradesh','Amaravati'), ('Andhra Pradesh','Guntur'),
    ('Andhra Pradesh','Tirupati'), ('Andhra Pradesh','Vijayawada'),
    ('Andhra Pradesh','Visakhapatnam'), ('Arunachal Pradesh','Itanagar'),
    ('Arunachal Pradesh','Naharlagun'), ('Arunachal Pradesh','Pasighat'),
    ('Assam','Dibrugarh'), ('Assam','Guwahati'), ('Assam','Jorhat'), ('Assam','Silchar'),
    ('Bihar','Bhagalpur'), ('Bihar','Gaya'), ('Bihar','Muzaffarpur'), ('Bihar','Patna'),
    ('Chhattisgarh','Bhilai'), ('Chhattisgarh','Bilaspur'), ('Chhattisgarh','Raipur'),
    ('Goa','Mapusa'), ('Goa','Margao'), ('Goa','Panaji'),
    ('Gujarat','Ahmedabad'), ('Gujarat','Gandhinagar'), ('Gujarat','Rajkot'), ('Gujarat','Surat'),
    ('Haryana','Faridabad'), ('Haryana','Gurugram'), ('Haryana','Hisar'), ('Haryana','Panipat'),
    ('Himachal Pradesh','Dharamshala'), ('Himachal Pradesh','Mandi'),
    ('Himachal Pradesh','Shimla'), ('Himachal Pradesh','Solan'),
    ('Jharkhand','Bokaro'), ('Jharkhand','Dhanbad'), ('Jharkhand','Jamshedpur'), ('Jharkhand','Ranchi'),
    ('Karnataka','Bengaluru'), ('Karnataka','Hubballi'), ('Karnataka','Mangaluru'), ('Karnataka','Mysuru'),
    ('Kerala','Kochi'), ('Kerala','Kozhikode'), ('Kerala','Thiruvananthapuram'), ('Kerala','Thrissur'),
    ('Madhya Pradesh','Bhopal'), ('Madhya Pradesh','Gwalior'),
    ('Madhya Pradesh','Indore'), ('Madhya Pradesh','Jabalpur'),
    ('Maharashtra','Chhatrapati Sambhajinagar'), ('Maharashtra','Mumbai'),
    ('Maharashtra','Nagpur'), ('Maharashtra','Nashik'), ('Maharashtra','Pune'),
    ('Manipur','Imphal'), ('Meghalaya','Shillong'), ('Mizoram','Aizawl'),
    ('Nagaland','Dimapur'), ('Nagaland','Kohima'),
    ('Odisha','Bhubaneswar'), ('Odisha','Cuttack'), ('Odisha','Rourkela'),
    ('Punjab','Amritsar'), ('Punjab','Jalandhar'), ('Punjab','Ludhiana'), ('Punjab','Mohali'),
    ('Rajasthan','Ajmer'), ('Rajasthan','Jaipur'), ('Rajasthan','Jodhpur'), ('Rajasthan','Udaipur'),
    ('Sikkim','Gangtok'),
    ('Tamil Nadu','Chennai'), ('Tamil Nadu','Coimbatore'),
    ('Tamil Nadu','Madurai'), ('Tamil Nadu','Tiruchirappalli'), ('Tamil Nadu','Tirunelveli'),
    ('Telangana','Hyderabad'), ('Telangana','Karimnagar'), ('Telangana','Warangal'),
    ('Tripura','Agartala'),
    ('Uttar Pradesh','Agra'), ('Uttar Pradesh','Ghaziabad'),
    ('Uttar Pradesh','Kanpur'), ('Uttar Pradesh','Lucknow'), ('Uttar Pradesh','Varanasi'),
    ('Uttarakhand','Dehradun'), ('Uttarakhand','Haridwar'), ('Uttarakhand','Nainital'),
    ('West Bengal','Asansol'), ('West Bengal','Durgapur'),
    ('West Bengal','Howrah'), ('West Bengal','Kolkata'),
    ('Andaman and Nicobar Islands','Port Blair'), ('Chandigarh','Chandigarh'),
    ('Dadra and Nagar Haveli and Daman and Diu','Daman'),
    ('Dadra and Nagar Haveli and Daman and Diu','Silvassa'),
    ('Delhi','Delhi'), ('Jammu and Kashmir','Jammu'), ('Jammu and Kashmir','Srinagar'),
    ('Ladakh','Leh'), ('Ladakh','Kargil'), ('Lakshadweep','Kavaratti'),
    ('Puducherry','Karaikal'), ('Puducherry','Puducherry')
) AS c(state, city) ON c.state = s.name
ON CONFLICT (state_id, name) DO NOTHING;
