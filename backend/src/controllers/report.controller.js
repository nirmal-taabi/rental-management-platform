import { sendSuccess } from '../utils/apiResponse.js';
import { OK } from '../constants/httpStatus.js';
import {
  getBookingExportForShop,
  getBookingStatusesForShop,
  getBookingTrendForShop,
  getCategoryReportForShop,
  getCustomerReportForShop,
  getInventoryDamageForShop,
  getInventoryReportForShop,
  getLateReturnsForShop,
  getPaymentReportForShop,
  getReturnReportForShop,
  getTopProductsForShop,
} from '../services/report.service.js';

const reportHandler = (message, service) => async (req, res, next) => {
  try {
    return sendSuccess(res, message, await service(req.user.shopId, req.query, req.user.shopRole), OK);
  } catch (error) {
    return next(error);
  }
};

export const getBookingTrend = reportHandler('Booking report retrieved.', getBookingTrendForShop);
export const getBookingStatuses = reportHandler('Booking status report retrieved.', getBookingStatusesForShop);
export const getPaymentReport = reportHandler('Payment report retrieved.', getPaymentReportForShop);
export const getInventoryReport = reportHandler('Inventory report retrieved.', getInventoryReportForShop);
export const getTopProducts = reportHandler('Top products report retrieved.', getTopProductsForShop);
export const getCategoryReport = reportHandler('Category report retrieved.', getCategoryReportForShop);
export const getCustomerReport = reportHandler('Customer report retrieved.', getCustomerReportForShop);
export const getReturnReport = reportHandler('Return report retrieved.', getReturnReportForShop);
export const getLateReturns = reportHandler('Late returns report retrieved.', getLateReturnsForShop);
export const getInventoryDamage = reportHandler('Inventory damage report retrieved.', getInventoryDamageForShop);

export const exportBookings = async (req, res, next) => {
  try {
    const rows = await getBookingExportForShop(req.user.shopId, req.query, req.user.shopRole);
    const headers = Object.keys(rows[0] || {
      booking_number: '', booking_date: '', rental_start_date: '', rental_end_date: '', status: '', customer: '',
      total_amount: '', paid_amount: '', balance_amount: '',
    });
    const escapeCsv = (value) => {
      const text = String(value ?? '');
      const safeText = /^[\s]*[=+@-]/.test(text) ? `'${text}` : text;
      return `"${safeText.replaceAll('"', '""')}"`;
    };
    const csv = [headers.map(escapeCsv).join(','), ...rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(','))].join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="bookings-report.csv"');
    return res.status(OK).send(csv);
  } catch (error) {
    return next(error);
  }
};