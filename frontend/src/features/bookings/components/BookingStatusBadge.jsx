import PropTypes from 'prop-types';
import { bookingStatusTone } from '../utils/bookingStatus';

function BookingStatusBadge({ status }) {
  const normalized = String(status || 'UNKNOWN').toUpperCase();
  return <span className={`inline-flex min-h-6 items-center border px-2 text-[11px] font-bold uppercase tracking-wide ${bookingStatusTone(normalized)}`}>{normalized}</span>;
}

export default BookingStatusBadge;

BookingStatusBadge.propTypes = {
  status: PropTypes.string,
};