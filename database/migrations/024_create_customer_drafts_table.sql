-- PostgreSQL migration: Create customer_drafts table

CREATE TABLE IF NOT EXISTS customer_drafts (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT NOT NULL,
    created_by_user_id BIGINT NULL,
    draft_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_customer_drafts_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
    CONSTRAINT fk_customer_drafts_user FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_customer_drafts_shop_updated ON customer_drafts (shop_id, updated_at);
