CREATE TABLE IF NOT EXISTS customer_drafts (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    shop_id BIGINT UNSIGNED NOT NULL,
    created_by_user_id BIGINT UNSIGNED NULL,
    draft_data JSON NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_customer_drafts_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_customer_drafts_user FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    KEY idx_customer_drafts_shop_updated (shop_id, updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;