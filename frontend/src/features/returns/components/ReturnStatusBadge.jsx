import PropTypes from 'prop-types';
import { returnStatusTone } from '../utils/returnStatus';

function ReturnStatusBadge({ status }) {
  const normalized = String(status || 'UNKNOWN').replaceAll('_', ' ').toUpperCase();
  return <span className={`inline-flex min-h-6 items-center border px-2 text-[11px] font-bold uppercase tracking-wide ${returnStatusTone(normalized)}`}>{normalized}</span>;
}

export default ReturnStatusBadge;

ReturnStatusBadge.propTypes = {
  status: PropTypes.string,
};