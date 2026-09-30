# Entity Relationship Diagram

```mermaid
erDiagram
    SHOPS ||--o{ USERS : owns
    SHOPS ||--o{ ROLES : defines
    SHOPS ||--o{ CUSTOMERS : serves
    SHOPS ||--o{ CATEGORIES : organizes
    SHOPS ||--o{ PRODUCTS : catalogs
    SHOPS ||--o{ INVENTORY_ITEMS : stocks
    SHOPS ||--o{ BOOKINGS : records
    SHOPS ||--o{ PAYMENTS : tracks
    SHOPS ||--o{ RETURNS : records
    SHOPS ||--o{ AUDIT_LOGS : logs

    USERS ||--o{ USER_ROLES : has
    ROLES ||--o{ USER_ROLES : grants
    CUSTOMERS ||--o{ BOOKINGS : books
    USERS ||--o{ BOOKINGS : creates
    CATEGORIES ||--o{ PRODUCTS : contains
    CATEGORIES ||--o{ CATEGORIES : nested
    PRODUCTS ||--o{ PRODUCT_IMAGES : has
    PRODUCTS ||--o{ INVENTORY_ITEMS : includes
    PRODUCTS ||--o{ BOOKING_ITEMS : included_in
    BOOKINGS ||--o{ BOOKING_ITEMS : contains
    INVENTORY_ITEMS ||--o{ BOOKING_ITEMS : assigned
    BOOKINGS ||--o{ PAYMENTS : receives
    BOOKINGS ||--o{ RETURNS : returns
    BOOKINGS ||--o{ ALTERATIONS : may_need
    INVENTORY_ITEMS ||--o{ RETURNS : inspected
    INVENTORY_ITEMS ||--o{ ALTERATIONS : repaired
    BOOKING_ITEMS ||--o{ RETURN_ITEMS : returned
    RETURNS ||--o{ RETURN_ITEMS : evaluates

    SHOPS {
        bigint id PK
        varchar name
        varchar slug
        varchar currency_code
        enum status
    }

    USERS {
        bigint id PK
        bigint shop_id FK
        varchar email
        varchar password_hash
        enum status
    }

    ROLES {
        bigint id PK
        bigint shop_id FK
        varchar name
        varchar slug
    }

    CUSTOMERS {
        bigint id PK
        bigint shop_id FK
        varchar first_name
        varchar phone
        varchar email
    }

    PRODUCTS {
        bigint id PK
        bigint shop_id FK
        bigint category_id FK
        varchar sku
        varchar name
        decimal daily_rental_rate
    }

    INVENTORY_ITEMS {
        bigint id PK
        bigint shop_id FK
        bigint product_id FK
        varchar item_code
        varchar barcode
        varchar qr_code
        enum status
        enum physical_condition
        date purchase_date
        enum condition_status "legacy compatibility"
    }

    BOOKINGS {
        bigint id PK
        bigint shop_id FK
        bigint customer_id FK
        varchar booking_number
        date rental_start_date
        date rental_end_date
        decimal rental_amount
    }

    PAYMENTS {
        bigint id PK
        bigint booking_id FK
        decimal amount
        enum status
    }

    RETURNS {
        bigint id PK
        bigint booking_id FK
        decimal total_late_fee
        enum status
    }

    AUDIT_LOGS {
        bigint id PK
        bigint shop_id FK
        varchar entity_type
        bigint entity_id
        varchar action
    }
```

## Relationship notes
- A single `shop` owns all operational records for its tenant domain.
- `customers`, `products`, `bookings`, and related tables remain isolated by `shop_id`.
- `inventory_items` connect to a specific product and represent physical units. Current status and physical condition are independent; availability by dates belongs to booking workflows.
- `booking_items` provide the line-item record needed for rental calculations and return processing.
- `audit_logs` track all material changes to business entities for traceability.
