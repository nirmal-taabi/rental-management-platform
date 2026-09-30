CREATE TABLE IF NOT EXISTS user_shop_memberships (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    shop_id BIGINT UNSIGNED NOT NULL,
    role VARCHAR(100) NOT NULL DEFAULT 'STAFF',
    status ENUM('active', 'invited', 'suspended', 'removed') NOT NULL DEFAULT 'active',
    is_default TINYINT(1) NOT NULL DEFAULT 0,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    default_membership_user_id BIGINT UNSIGNED GENERATED ALWAYS AS (
        CASE WHEN is_default = 1 AND status = 'active' AND deleted_at IS NULL THEN user_id ELSE NULL END
    ) STORED,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_user_shop_memberships_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_user_shop_memberships_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE KEY uq_user_shop_memberships_user_shop (user_id, shop_id),
    UNIQUE KEY uq_user_shop_memberships_default_user (default_membership_user_id),
    KEY idx_user_shop_memberships_user_status (user_id, status),
    KEY idx_user_shop_memberships_shop_status (shop_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO user_shop_memberships (user_id, shop_id, role, status, is_default)
SELECT
    u.id,
    u.shop_id,
    COALESCE(
        (
            SELECT UPPER(r.name)
            FROM user_roles ur
            INNER JOIN roles r ON r.id = ur.role_id AND r.shop_id = ur.shop_id
            WHERE ur.user_id = u.id AND ur.shop_id = u.shop_id AND r.is_deleted = 0
            ORDER BY CASE UPPER(r.name)
                WHEN 'OWNER' THEN 1
                WHEN 'ADMIN' THEN 2
                WHEN 'STAFF' THEN 3
                ELSE 4
            END, r.id
            LIMIT 1
        ),
        IF(u.is_owner = 1, 'OWNER', 'STAFF')
    ),
    IF(u.status = 'active' AND u.is_deleted = 0, 'active', 'suspended'),
    1
FROM users u
INNER JOIN shops s ON s.id = u.shop_id;