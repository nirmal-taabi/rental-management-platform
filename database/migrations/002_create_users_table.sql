-- PostgreSQL migration: Create users table

CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NULL,
    email VARCHAR(150) NOT NULL,
    phone VARCHAR(30) NULL,
    password_hash VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('active', 'inactive', 'pending', 'locked')),
    is_owner SMALLINT NOT NULL DEFAULT 0,
    last_login_at TIMESTAMPTZ NULL DEFAULT NULL,
    is_deleted SMALLINT NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ NULL DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_shop_email ON users (shop_id, email);
CREATE INDEX IF NOT EXISTS idx_users_shop_status ON users (shop_id, status);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
