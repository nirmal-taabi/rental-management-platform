CREATE TABLE IF NOT EXISTS categories (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    shop_id BIGINT UNSIGNED NOT NULL,
    parent_category_id BIGINT UNSIGNED NULL,
    name VARCHAR(120) NOT NULL,
    slug VARCHAR(120) NOT NULL,
    description VARCHAR(500) NULL,
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    is_deleted TINYINT(1) NOT NULL DEFAULT 0,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_categories_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_categories_parent FOREIGN KEY (parent_category_id) REFERENCES categories(id) ON DELETE SET NULL ON UPDATE CASCADE,
    UNIQUE KEY uq_categories_shop_slug (shop_id, slug),
    KEY idx_categories_shop_parent (shop_id, parent_category_id),
    KEY idx_categories_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
