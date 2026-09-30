# Pickup and Returns API

All endpoints require authentication and derive `shopId` from the authenticated user. OWNER, ADMIN, and STAFF can view, process pickup, and process returns. Booking, customer, booking-item, and inventory relationships are validated inside the current shop.

## Pickup

`GET /api/v1/bookings/:bookingId/pickup` returns the pickup record for a booking after handover.

`POST /api/v1/bookings/:bookingId/pickup` accepts the complete set of booking items and optional notes. Only READY bookings can be picked up; CONFIRMED bookings must first transition to READY.

```json
{
  "items": [
    { "bookingItemId": 51, "inventoryItemId": 87 },
    { "bookingItemId": 52, "inventoryItemId": 93 }
  ],
  "pickupNotes": "Customer collected all items"
}
```

Pickup locks the booking, booking items, and inventory in one transaction. Every booking item must be included and match its physical inventory row. AVAILABLE or RESERVED items become RENTED, booking items become active, and the booking becomes ACTIVE. Any invalid item rolls back the complete pickup.

## Returns

`POST /api/v1/bookings/:bookingId/return` records one or more outstanding items. Partial returns are supported; a booking remains ACTIVE until all its booking items have a return record. `returnedAt` is optional and defaults to the current UTC timestamp.

```json
{
  "returnedAt": "2026-10-12T18:30:00Z",
  "notes": "Two pieces received",
  "items": [
    {
      "bookingItemId": 51,
      "inventoryItemId": 87,
      "condition": "GOOD",
      "damageStatus": "NONE",
      "notes": ""
    }
  ]
}
```

Conditions: `EXCELLENT`, `GOOD`, `FAIR`, `DAMAGED`. Damage statuses: `NONE`, `MINOR`, `MAJOR`, `LOST`. The server derives `ON_TIME`/`LATE` and `daysLate` from the rental end date and actual return timestamp; client-supplied timing status is ignored. No late fee or damage charge is calculated: both amounts remain zero.

Returned physical items move to INSPECTION. Items recorded as LOST move to LOST. A partial return leaves the booking ACTIVE; completion occurs only after all items are returned or recorded lost. Deposits and payments are not changed or refunded.

## History

`GET /api/v1/returns` supports pagination (maximum 100), search (return ID, booking number, customer name/phone), workflow/timing status, damage status, customer, booking, date range, and sorting by return date or creation date.

`GET /api/v1/returns/:id` returns the return receipt details and derived lateness.

`GET /api/v1/bookings/:bookingId/returns` returns all partial/full return records for one tenant-owned booking.

`GET /api/v1/inventory/:inventoryItemId/returns` returns the return history for one tenant-owned physical item. A valid item with no return history returns an empty page.

## State changes and audit

Pickup and return use database transactions and row-level locks. Concurrent pickup attempts serialize on the booking; concurrent returns serialize on the booking and booking-item rows. Pickup/return records are retained as history and are not hard-deleted. Audit events include BOOKING_READY, PICKUP_COMPLETED, PARTIAL_RETURN, RETURN_COMPLETED, condition/damage records, and inventory status changes.