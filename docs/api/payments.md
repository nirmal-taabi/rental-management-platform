# Payments API

Base path: `/api/v1/payments`. All routes require authentication and derive tenant scope from the signed-in user's `shopId`. Payment creation derives its customer from the booking; clients cannot supply payment references or booking payment totals.

## Payment list and summary

`GET /api/v1/payments` supports `page` (default 1), `limit` (default 20, maximum 100), `search` (reference, booking number, customer name/phone), `status`, `paymentMethod`, `paymentType`, `bookingId`, `customerId`, `startDate`, `endDate`, `sortBy` (`transactionDate`, `amount`, `createdAt`), and `sortOrder`. It returns `data`, server-calculated `summary`, and `pagination`.

`GET /api/v1/payments/summary` accepts optional `startDate`, `endDate`, `paymentMethod`, and `paymentType`. OWNER/ADMIN only. Today's collection, collected, refunded, net, and transaction counts are aggregated in MySQL.

## Record and retrieve payments

`POST /api/v1/payments` accepts a booking ID, positive amount, controlled payment type and method, business transaction date, and optional notes. OWNER, ADMIN, and STAFF may record a payment. Offline entries default to `SUCCESS`.

```json
{
  "bookingId": 125,
  "amount": "5000.00",
  "paymentType": "DEPOSIT",
  "paymentMethod": "UPI",
  "transactionDate": "2026-09-29",
  "notes": "Advance payment"
}
```

The backend validates booking/customer tenant relationships, locks the booking row, reads the payment ledger, rejects amounts above the remaining rental-plus-deposit balance, creates a unique `PAY-YYYY-NNNNN` reference, recalculates successful/net paid totals, updates the booking snapshot, and writes audit entries in one transaction.

`GET /api/v1/payments/:id` returns payment, booking/customer identity, status, transaction date, creator, cancellation reason, and the current booking payment summary. It does not expose gateway credentials or card data.

## Booking and customer history

`GET /api/v1/bookings/:bookingId/payments` returns tenant-scoped payment history, payment summary, and pagination.

`GET /api/v1/customers/:customerId/payments` returns tenant-scoped recent payments, total paid, outstanding balance, booking count, and pagination. It accepts `page`, `limit`, `startDate`, `endDate`, `paymentMethod`, and `status`.

## Status and cancellation

`PATCH /api/v1/payments/:id/status` only supports controlled pending-payment transitions to `SUCCESS` or `FAILED`; success changes recalculate booking paid/balance amounts transactionally. SUCCESS payments cannot be edited to another status.

`POST /api/v1/payments/:id/cancel` requires OWNER/ADMIN and a cancellation `reason`. It preserves the transaction row, stores who/when/why, recalculates the booking snapshot, and audits the reversal.

## Financial rules

Payment methods: `CASH`, `UPI`, `CARD`, `BANK_TRANSFER`, `ONLINE`, `OTHER`. Payment types: `RENTAL`, `DEPOSIT`, `LATE_FEE`, `DAMAGE_CHARGE`, `OTHER`. Statuses: `PENDING`, `SUCCESS`, `FAILED`, `CANCELLED`, `REFUNDED`, `PARTIALLY_REFUNDED`.

Only SUCCESS and partially refunded transactions contribute to net paid; cancelled, pending, failed, and fully refunded entries do not. Booking total payable is `total_amount + deposit_amount`; deposit stays separate from rental charges. Amounts are `DECIMAL(12,2)` in MySQL and integer cents in service calculations. Overpayment returns `409 PAYMENT_AMOUNT_EXCEEDS_BALANCE` with `error.details.remainingBalance`.

Manual SUCCESS payment creation and cancellation are booking-row locked and transactional. Two concurrent attempts against the same remaining balance serialize; only the first fitting payment can commit. Full refunds and payment gateway integrations are intentionally not implemented.