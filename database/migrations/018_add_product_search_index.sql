CREATE FULLTEXT INDEX idx_products_catalog_search
    ON products (name, sku, description);