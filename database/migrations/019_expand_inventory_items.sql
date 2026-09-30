-- PostgreSQL migration: Expand inventory_items with new status columns

ALTER TABLE inventory_items
    ADD COLUMN IF NOT EXISTS barcode VARCHAR(100) NULL,
    ADD COLUMN IF NOT EXISTS qr_code VARCHAR(500) NULL,
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
    ADD COLUMN IF NOT EXISTS physical_condition VARCHAR(20) NOT NULL DEFAULT 'GOOD',
    ADD COLUMN IF NOT EXISTS purchase_date DATE NULL;

-- Add CHECK constraints separately (safer in PG migrations)
ALTER TABLE inventory_items
    ADD CONSTRAINT chk_inventory_status CHECK (status IN (
        'AVAILABLE', 'RESERVED', 'RENTED', 'RETURNED', 'INSPECTION',
        'CLEANING', 'ALTERATION', 'REPAIR', 'DAMAGED', 'LOST', 'RETIRED'
    )),
    ADD CONSTRAINT chk_inventory_physical_condition CHECK (physical_condition IN (
        'EXCELLENT', 'GOOD', 'FAIR', 'DAMAGED'
    ));

UPDATE inventory_items
SET status = CASE condition_status
        WHEN 'rented' THEN 'RENTED'
        WHEN 'maintenance' THEN 'INSPECTION'
        WHEN 'damaged' THEN 'DAMAGED'
        WHEN 'retired' THEN 'RETIRED'
        ELSE 'AVAILABLE'
    END,
    physical_condition = CASE condition_status
        WHEN 'damaged' THEN 'DAMAGED'
        ELSE 'GOOD'
    END,
    purchase_date = acquired_at::DATE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_items_shop_barcode
    ON inventory_items (shop_id, barcode)
    WHERE barcode IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_items_shop_status_created
    ON inventory_items (shop_id, status, created_at);

CREATE INDEX IF NOT EXISTS idx_inventory_items_shop_condition
    ON inventory_items (shop_id, physical_condition);

CREATE INDEX IF NOT EXISTS idx_inventory_items_shop_acquired
    ON inventory_items (shop_id, acquired_at);

CREATE INDEX IF NOT EXISTS idx_audit_logs_shop_entity_created
    ON audit_logs (shop_id, entity_type, entity_id, created_at);
