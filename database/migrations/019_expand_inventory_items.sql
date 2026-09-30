ALTER TABLE inventory_items
    ADD COLUMN barcode VARCHAR(100) NULL AFTER item_code,
    ADD COLUMN qr_code VARCHAR(500) NULL AFTER barcode,
    ADD COLUMN status ENUM(
        'AVAILABLE', 'RESERVED', 'RENTED', 'RETURNED', 'INSPECTION',
        'CLEANING', 'ALTERATION', 'REPAIR', 'DAMAGED', 'LOST', 'RETIRED'
    ) NOT NULL DEFAULT 'AVAILABLE' AFTER condition_status,
    ADD COLUMN physical_condition ENUM('EXCELLENT', 'GOOD', 'FAIR', 'DAMAGED') NOT NULL DEFAULT 'GOOD' AFTER status,
    ADD COLUMN purchase_date DATE NULL AFTER acquired_at;

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
    purchase_date = DATE(acquired_at);

CREATE UNIQUE INDEX uq_inventory_items_shop_barcode
    ON inventory_items (shop_id, barcode);

CREATE INDEX idx_inventory_items_shop_status_created
    ON inventory_items (shop_id, status, created_at);

CREATE INDEX idx_inventory_items_shop_condition
    ON inventory_items (shop_id, physical_condition);

CREATE INDEX idx_inventory_items_shop_acquired
    ON inventory_items (shop_id, acquired_at);

CREATE INDEX idx_audit_logs_shop_entity_created
    ON audit_logs (shop_id, entity_type, entity_id, created_at);