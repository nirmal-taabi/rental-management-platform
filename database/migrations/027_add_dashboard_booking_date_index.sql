CREATE INDEX IF NOT EXISTS idx_bookings_shop_booking_date
    ON bookings (shop_id, booking_date)
    WHERE is_deleted = 0;