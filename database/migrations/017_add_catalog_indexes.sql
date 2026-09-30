CREATE INDEX idx_categories_shop_status_name
    ON categories (shop_id, status, name);

CREATE INDEX idx_products_shop_status_created
    ON products (shop_id, status, created_at);

CREATE INDEX idx_products_shop_created
    ON products (shop_id, created_at);

CREATE INDEX idx_product_images_shop_product
    ON product_images (shop_id, product_id, is_deleted, sort_order);