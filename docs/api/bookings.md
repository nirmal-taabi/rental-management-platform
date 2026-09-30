# Bookings and Availability API

Base paths: `/api/v1/bookings`, `/api/v1/availability`. All endpoints require authentication and derive `shopId` from the signed-in user. Client-supplied tenant IDs, prices, totals, booking numbers, and creator IDs are not trusted.

## Availability

`GET /api/v1/availability?inventoryItemId=42&startDate=2026-10-10&endDate=2026-10-12` checks one physical item.

`POST /api/v1/availability/check` accepts `inventoryItemIds` (1-100 IDs), `startDate`, and `endDate` and returns one result per item.

`GET /api/v1/availability/products?productId=7&startDate=2026-10-10&endDate=2026-10-12` returns eligible physical items for an active product and their date-based availability. Damaged or non-`AVAILABLE` inventory is not eligible. Conflicts include booking number, dates, and status only; customer details are not exposed.

Rental dates are business dates in `YYYY-MM-DD` format; both endpoints are inclusive. The system defaults are zero preparation days and one cleanup day. A booking from October 10 through October 12 blocks the item through October 13. The availability query accounts for these buffers on both sides of an overlap. Edit workspaces may pass `excludeBookingId` to availability checks; only editable bookings in the same shop are accepted. Booking writes always recheck availability in their transaction.

## Bookings

`GET /api/v1/bookings` supports `page`, `limit` (default 20, maximum 100), `search` (booking number, customer name or phone), `status`, `customerId`, `bookingDate`, `startDate`, `endDate`, `sortBy` (`bookingDate`, `rentalStartDate`, `createdAt`, `totalAmount`), and `sortOrder`. Rental date filters select bookings whose rental period intersects the requested range. The response contains `data`, `summary`, and `pagination`.

`GET /api/v1/bookings/:id` returns tenant-owned booking, customer, physical items, pricing/payment summary, and audit activity. Another shop's ID returns `404 BOOKING_NOT_FOUND`.

`POST /api/v1/bookings` creates a `PENDING` booking. OWNER, ADMIN, and STAFF may create bookings.

```json
{
  "customerId": 18,
  "rentalStartDate": "2026-10-10",
  "rentalEndDate": "2026-10-12",
  "discountAmount": "500.00",
  "taxAmount": "0.00",
  "notes": "Pickup after 10 AM",
  "items": [
    {
      "productId": 7,
      "inventoryItemId": 42,
      "discountAmount": "0.00",
      "taxAmount": "0.00",
      "notes": "Size M"
    }
  ]
}
```

Each item must belong to the selected active product and authenticated shop. The server snapshots the product daily rental rate and deposit, multiplies rental rate by inclusive rental days, and calculates totals using decimal-safe cents. A supplied discount cannot exceed the rental subtotal. Product price, booking number, and final totals are server-managed.

`PUT /api/v1/bookings/:id` replaces the customer, dates, and selected physical items for `DRAFT`, `PENDING`, or `CONFIRMED` bookings. It rechecks all inventory availability and excludes only the booking being edited. ACTIVE, COMPLETED, and CANCELLED bookings cannot be edited.

`PATCH /api/v1/bookings/:id/status` accepts one controlled forward transition: `DRAFT → PENDING → CONFIRMED → READY → ACTIVE → COMPLETED`. DRAFT, PENDING, CONFIRMED, and READY may transition to CANCELLED. OWNER, ADMIN, and STAFF may change status.

`PATCH /api/v1/bookings/:id/cancel` preserves the booking and releases its inventory from availability checks. OWNER and ADMIN may cancel.

## Concurrency and errors

Creation and edits run in a database transaction, lock inventory rows in ascending ID order, and execute a locking conflict query before writing. Overlapping requests for the same physical item serialize on that inventory row. Any conflict rolls back the entire booking and returns `409 INVENTORY_NOT_AVAILABLE`; ineligible inventory returns `409 INVENTORY_NOT_RENTABLE`. Other common errors are `400 VALIDATION_ERROR`, `400 BOOKING_CUSTOMER_INVALID`, `404 BOOKING_NOT_FOUND`, `409 BOOKING_NOT_EDITABLE`, and `409 BOOKING_STATUS_TRANSITION_INVALID`.

Availability-blocking statuses are `PENDING`, `CONFIRMED`, `READY`, and `ACTIVE`. DRAFT, COMPLETED, and CANCELLED do not block inventory.