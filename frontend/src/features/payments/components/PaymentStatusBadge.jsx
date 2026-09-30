import PropTypes from 'prop-types';
import { paymentStatusLabel, paymentStatusTone } from '../utils/paymentStatus';

function PaymentStatusBadge({ status }) {
  const normalized = String(status || 'UNKNOWN').toUpperCase();
  return <span className={`inline-flex min-h-6 items-center border px-2 text-[11px] font-bold uppercase tracking-wide ${paymentStatusTone(normalized)}`}>{paymentStatusLabel(normalized)}</span>;
}

export default PaymentStatusBadge;

PaymentStatusBadge.propTypes = {
  status: PropTypes.string,
};