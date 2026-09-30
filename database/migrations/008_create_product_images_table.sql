CREATE TABLE IF NOT EXISTS product_images (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    shop_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    is_primary TINYINT(1) NOT NULL DEFAULT 0,
    sort_order INT UNSIGNED NOT NULL DEFAULT 0,
    is_deleted TINYINT(1) NOT NULL DEFAULT 0,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_product_images_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_product_images_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE,
    KEY idx_product_images_product (product_id),
    KEY idx_product_images_shop_primary (shop_id, is_primary)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
