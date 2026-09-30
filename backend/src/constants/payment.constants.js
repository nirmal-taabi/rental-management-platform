export const PAYMENT_TYPES = ['RENTAL', 'DEPOSIT', 'LATE_FEE', 'DAMAGE_CHARGE', 'OTHER'];

export const PAYMENT_METHODS = ['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'ONLINE', 'OTHER'];

export const PAYMENT_STATUSES = ['PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED'];

export const PAYMENT_STATUS_TRANSITIONS = {
  PENDING: ['SUCCESS', 'FAILED', 'CANCELLED'],
  SUCCESS: [],
  FAILED: [],
  CANCELLED: [],
  REFUNDED: [],
  PARTIALLY_REFUNDED: [],
};

export const PAYMENT_SORT_COLUMNS = {
  transactionDate: 'p.transaction_date',
  amount: 'p.amount',
  createdAt: 'p.created_at',
};