-- Sample tenant data for the initial V1 schema.
-- Replace hashes and real business data with production values before use.

INSERT INTO shops (id, name, slug, legal_name, email, phone, address_line1, city, state, postal_code, country, gst_number, currency_code, timezone, status)
VALUES
    (1, 'Nirmal Rentals', 'nirmal-rentals', 'Nirmal Rentals Private Limited', 'hello@nirmalrentals.in', '+91-98765-43210', '12 Market Road', 'Delhi', 'Delhi', '110001', 'India', '07ABCDE1234F1Z5', 'INR', 'Asia/Kolkata', 'active')
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    legal_name = VALUES(legal_name),
    email = VALUES(email),
    phone = VALUES(phone),
    city = VALUES(city),
    state = VALUES(state),
    postal_code = VALUES(postal_code),
    gst_number = VALUES(gst_number),
    status = VALUES(status);

INSERT INTO roles (id, shop_id, name, slug, description, is_system)
VALUES
    (1, 1, 'Owner', 'owner', 'Primary business owner with full access', 1),
    (2, 1, 'Admin', 'admin', 'Operational admin for shop configuration', 1),
    (3, 1, 'Manager', 'manager', 'Handles bookings and scheduling', 0),
    (4, 1, 'Staff', 'staff', 'Front desk and inventory support', 0)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    description = VALUES(description),
    is_system = VALUES(is_system);

INSERT INTO users (id, shop_id, first_name, last_name, email, phone, password_hash, status, is_owner)
VALUES
    (1, 1, 'Nirmal', 'Owner', 'owner@nirmalrentals.in', '+91-99999-00001', '$2b$10$replace.with.bcrypt.hash', 'active', 1),
    (2, 1, 'Aditi', 'Manager', 'manager@nirmalrentals.in', '+91-99999-00002', '$2b$10$replace.with.bcrypt.hash', 'active', 0),
    (3, 1, 'Rohit', 'Staff', 'staff@nirmalrentals.in', '+91-99999-00003', '$2b$10$replace.with.bcrypt.hash', 'active', 0)
ON DUPLICATE KEY UPDATE
    first_name = VALUES(first_name),
    last_name = VALUES(last_name),
    phone = VALUES(phone),
    status = VALUES(status),
    is_owner = VALUES(is_owner);

INSERT INTO user_roles (id, shop_id, user_id, role_id)
VALUES
    (1, 1, 1, 1),
    (2, 1, 1, 2),
    (3, 1, 2, 3),
    (4, 1, 3, 4)
ON DUPLICATE KEY UPDATE
    role_id = VALUES(role_id);

INSERT INTO customers (id, shop_id, first_name, last_name, phone, email, address_line1, city, state, postal_code, gstin, status)
VALUES
    (1, 1, 'Priya', 'Sharma', '+91-98100-11111', 'priya.sharma@example.com', '22 Gulmohar Lane', 'Noida', 'Uttar Pradesh', '201301', '07ABCDE1234F1Z5', 'active'),
    (2, 1, 'Vikas', 'Kumar', '+91-98100-22222', 'vikas.kumar@example.com', '9 Lotus Avenue', 'Ghaziabad', 'Uttar Pradesh', '201009', NULL, 'active')
ON DUPLICATE KEY UPDATE
    first_name = VALUES(first_name),
    last_name = VALUES(last_name),
    email = VALUES(email),
    city = VALUES(city),
    state = VALUES(state),
    status = VALUES(status);

INSERT INTO categories (id, shop_id, name, slug, description, status)
VALUES
    (1, 1, 'Wedding Wear', 'wedding-wear', 'Bridal and occasion couture', 'active'),
    (2, 1, 'Designer Sarees', 'designer-sarees', 'Premium sarees for events and functions', 'active'),
    (3, 1, 'Accessories', 'accessories', 'Jewelry, bags, and styling accessories', 'active')
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    description = VALUES(description),
    status = VALUES(status);

INSERT INTO products (id, shop_id, category_id, sku, name, slug, brand, description, product_type, daily_rental_rate, weekly_rental_rate, monthly_rental_rate, security_deposit, status)
VALUES
    (1, 1, 2, 'DS-001', 'Royal Silk Saree', 'royal-silk-saree', 'Nirmal Studio', 'Premium silk saree for wedding events', 'garment', 1200.00, 7000.00, 25000.00, 5000.00, 'active'),
    (2, 1, 1, 'WW-010', 'Floral Bridal Lehenga', 'floral-bridal-lehenga', 'Nirmal Studio', 'Wedding lehenga with festive styling', 'garment', 1800.00, 9800.00, 32000.00, 9000.00, 'active'),
    (3, 1, 3, 'AC-120', 'Pearl Jewelry Set', 'pearl-jewelry-set', 'Nirmal Studio', 'Pearl accessory set for occasions', 'accessory', 450.00, 2300.00, 6500.00, 2000.00, 'active')
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    brand = VALUES(brand),
    daily_rental_rate = VALUES(daily_rental_rate),
    weekly_rental_rate = VALUES(weekly_rental_rate),
    monthly_rental_rate = VALUES(monthly_rental_rate),
    security_deposit = VALUES(security_deposit),
    status = VALUES(status);

INSERT INTO inventory_items (id, shop_id, product_id, item_code, size, color, condition_status, purchase_price, current_value)
VALUES
    (1, 1, 1, 'INV-DS-001-A', 'M', 'Red', 'available', 12000.00, 11000.00),
    (2, 1, 2, 'INV-WW-010-B', 'L', 'Ivory', 'available', 18000.00, 16500.00),
    (3, 1, 3, 'INV-AC-120-C', 'One Size', 'Pearl', 'available', 5000.00, 4700.00)
ON DUPLICATE KEY UPDATE
    size = VALUES(size),
    color = VALUES(color),
    condition_status = VALUES(condition_status),
    current_value = VALUES(current_value);

INSERT INTO bookings (id, shop_id, customer_id, created_by_user_id, booking_number, booking_date, rental_start_date, rental_end_date, expected_return_date, status, rental_amount, deposit_amount, discount_amount)
VALUES
    (1, 1, 1, 2, 'BK-1001', '2025-01-10 09:00:00', '2025-01-11', '2025-01-15', '2025-01-15', 'active', 7200.00, 10000.00, 0.00)
ON DUPLICATE KEY UPDATE
    status = VALUES(status),
    rental_amount = VALUES(rental_amount),
    deposit_amount = VALUES(deposit_amount),
    discount_amount = VALUES(discount_amount);

INSERT INTO booking_items (id, shop_id, booking_id, product_id, inventory_item_id, quantity, unit_rental_rate, subtotal, deposit_amount, status)
VALUES
    (1, 1, 1, 1, 1, 1, 1200.00, 4800.00, 5000.00, 'active'),
    (2, 1, 1, 3, 3, 1, 450.00, 1800.00, 2000.00, 'active')
ON DUPLICATE KEY UPDATE
    quantity = VALUES(quantity),
    unit_rental_rate = VALUES(unit_rental_rate),
    subtotal = VALUES(subtotal),
    deposit_amount = VALUES(deposit_amount),
    status = VALUES(status);

INSERT INTO payments (id, shop_id, booking_id, customer_id, payment_number, payment_method, amount, gst_amount, status, transaction_reference)
VALUES
    (1, 1, 1, 1, 'PMT-1001', 'upi', 7200.00, 0.00, 'paid', 'UPI_REF_001')
ON DUPLICATE KEY UPDATE
    payment_method = VALUES(payment_method),
    amount = VALUES(amount),
    gst_amount = VALUES(gst_amount),
    status = VALUES(status),
    transaction_reference = VALUES(transaction_reference);

INSERT INTO returns (id, shop_id, booking_id, customer_id, return_date, status, total_late_fee)
VALUES
    (1, 1, 1, 1, '2025-01-15 18:00:00', 'completed', 0.00)
ON DUPLICATE KEY UPDATE
    status = VALUES(status),
    total_late_fee = VALUES(total_late_fee);

INSERT INTO return_items (id, shop_id, return_id, booking_item_id, inventory_item_id, condition_status, damage_fee, late_fee)
VALUES
    (1, 1, 1, 1, 1, 'good', 0.00, 0.00),
    (2, 1, 1, 2, 3, 'good', 0.00, 0.00)
ON DUPLICATE KEY UPDATE
    condition_status = VALUES(condition_status),
    damage_fee = VALUES(damage_fee),
    late_fee = VALUES(late_fee);
