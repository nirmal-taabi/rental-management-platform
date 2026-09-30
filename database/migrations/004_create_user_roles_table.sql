-- PostgreSQL migration: Create user_roles table

CREATE TABLE IF NOT EXISTS user_roles (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_roles_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_roles_unique ON user_roles (shop_id, user_id, role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_shop_user ON user_roles (shop_id, user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_shop_role ON user_roles (shop_id, role_id);
