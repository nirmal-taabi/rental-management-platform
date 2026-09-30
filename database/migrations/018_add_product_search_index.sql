-- PostgreSQL migration: Add product full-text search index
-- PostgreSQL uses tsvector/GIN indexes instead of MySQL FULLTEXT indexes.
-- A generated tsvector column is added for efficient full-text search.

ALTER TABLE products
    ADD COLUMN IF NOT EXISTS search_vector tsvector
        GENERATED ALWAYS AS (
            to_tsvector('english',
                coalesce(name, '') || ' ' ||
                coalesce(sku, '') || ' ' ||
                coalesce(description, '')
            )
        ) STORED;

CREATE INDEX IF NOT EXISTS idx_products_catalog_search
    ON products USING GIN (search_vector);
