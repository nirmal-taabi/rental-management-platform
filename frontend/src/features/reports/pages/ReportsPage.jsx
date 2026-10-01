import { useEffect, useState } from 'react';
import { BarChart3, Download, RotateCcw } from 'lucide-react';
import PropTypes from 'prop-types';
import { useAuth } from '../../auth/context/AuthContext';
import { reportService } from '../services/report.service';

const reports = [
  { id: 'bookings', label: 'Bookings', description: 'Booking volume and status distribution.' },
  { id: 'payments', label: 'Payments', description: 'Successful net collections by type and method.' },
  { id: 'inventory', label: 'Inventory', description: 'Physical stock status and utilization.' },
  { id: 'products', label: 'Products', description: 'Most rented products by booking items.' },
  { id: 'categories', label: 'Categories', description: 'Rental activity by product category.' },
  { id: 'customers', label: 'Customers', description: 'New, returning, and repeat customers.' },
  { id: 'returns', label: 'Returns', description: 'Return timeliness and recorded damage.' },
];

const businessToday = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
};

const titleCase = (value) => String(value).replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

function DataTable({ rows, emptyMessage }) {
  if (!rows?.length) return <p className="py-2 text-sm text-[#59615e]">{emptyMessage}</p>;
  const columns = Object.keys(rows[0]);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] border-collapse text-left text-sm">
        <thead><tr className="border-b border-[#e6e8e4]">{columns.map((column) => <th key={column} scope="col" className="px-3 py-2 text-xs font-semibold text-[#59615e]">{titleCase(column)}</th>)}</tr></thead>
        <tbody>{rows.map((row, index) => <tr key={row.id || row.period || row.status || row.payment_method || row.payment_type || index} className="border-b border-[#eef0ed] last:border-0">{columns.map((column) => <td key={column} className="px-3 py-2.5 text-[#252a29]">{row[column] === null || row[column] === undefined ? '—' : String(row[column])}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

DataTable.propTypes = {
  rows: PropTypes.arrayOf(PropTypes.object),
  emptyMessage: PropTypes.string.isRequired,
};

function SummaryGrid({ data, labels }) {
  return (
    <dl className="grid gap-px border border-[#e6e8e4] bg-[#e6e8e4] sm:grid-cols-2 xl:grid-cols-4">
      {Object.entries(labels).map(([key, label]) => <div key={key} className="bg-white px-4 py-3"><dt className="text-xs text-[#59615e]">{label}</dt><dd className="mt-1 text-lg font-semibold tabular-nums text-[#252a29]">{data?.[key] ?? 0}</dd></div>)}
    </dl>
  );
}

SummaryGrid.propTypes = {
  data: PropTypes.object,
  labels: PropTypes.objectOf(PropTypes.string).isRequired,
};

function ReportsPage() {
  const { roles } = useAuth();
  const [activeReport, setActiveReport] = useState('bookings');
  const [startDate, setStartDate] = useState(() => `${businessToday().slice(0, 8)}01`);
  const [endDate, setEndDate] = useState(businessToday);
  const [reportResult, setReportResult] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [exporting, setExporting] = useState(false);
  const canViewFinancials = roles.includes('OWNER') || roles.includes('ADMIN');
  const invalidRange = !startDate || !endDate || startDate > endDate;
  const rangeError = invalidRange && activeReport !== 'inventory' ? 'Choose a valid date range.' : '';
  const permissionError = activeReport === 'payments' && !canViewFinancials
    ? 'You do not have permission to view financial reports.'
    : '';
  const reportKey = `${activeReport}:${startDate}:${endDate}:${refresh}`;
  const currentResult = reportResult?.key === reportKey ? reportResult : null;
  const data = currentResult?.data;
  const error = permissionError || rangeError || currentResult?.error || '';
  const requestBlocked = Boolean(permissionError || rangeError);
  const loading = !requestBlocked && !currentResult;

  useEffect(() => {
    if (requestBlocked) return undefined;

    let active = true;
    const params = { startDate, endDate, groupBy: 'day', limit: 20 };
    const loaders = {
      bookings: () => reportService.getBookings(params),
      payments: () => reportService.getPayments(params),
      inventory: () => reportService.getInventory(),
      products: () => reportService.getProducts(params),
      categories: () => reportService.getCategories(params),
      customers: () => reportService.getCustomers(params),
      returns: () => reportService.getReturns(params),
    };
    loaders[activeReport]().then((result) => {
      if (active) setReportResult({ key: reportKey, data: result, error: '' });
    }).catch((requestError) => {
      if (active) setReportResult({ key: reportKey, data: null, error: requestError.response?.data?.message || 'Unable to load this report.' });
    });
    return () => { active = false; };
  }, [activeReport, startDate, endDate, requestBlocked, reportKey]);

  const exportBookings = async () => {
    setExporting(true);
    try {
      const response = await reportService.exportBookings({ startDate, endDate });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'bookings-report.csv';
      link.click();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setReportResult({
        key: reportKey,
        data: currentResult?.data || null,
        error: requestError.response?.data?.message || 'Unable to export this report.',
      });
    } finally {
      setExporting(false);
    }
  };

  let reportContent;
  if (activeReport === 'bookings') {
    reportContent = <><h2 className="mb-3 text-sm font-semibold">Booking status</h2><DataTable rows={data?.status} emptyMessage="No bookings for this period." /><h2 className="mb-3 mt-7 text-sm font-semibold">Bookings by date</h2><DataTable rows={data?.trend} emptyMessage="No booking activity for this period." /></>;
  } else if (activeReport === 'payments') {
    reportContent = <><SummaryGrid data={data} labels={{ total_collected: 'Payments collected', rental_collected: 'Rental collected', deposit_collected: 'Deposits collected' }} /><h2 className="mb-3 mt-7 text-sm font-semibold">By payment type</h2><DataTable rows={data?.byType} emptyMessage="No successful payments for this period." /><h2 className="mb-3 mt-7 text-sm font-semibold">By payment method</h2><DataTable rows={data?.byMethod} emptyMessage="No successful payments for this period." /><h2 className="mb-3 mt-7 text-sm font-semibold">Collection by date</h2><DataTable rows={data?.trend} emptyMessage="No collections for this period." /></>;
  } else if (activeReport === 'inventory') {
    reportContent = <><SummaryGrid data={data} labels={{ total: 'Physical items', usable: 'Usable items', utilization: 'Utilization %' }} /><h2 className="mb-3 mt-7 text-sm font-semibold">Inventory status</h2><DataTable rows={Object.entries(data?.statuses || {}).map(([status, count]) => ({ status, count }))} emptyMessage="No inventory has been added." /></>;
  } else if (activeReport === 'customers') {
    reportContent = <><SummaryGrid data={data} labels={{ new_customers: 'New customers', returning_customers: 'Returning customers', customers_with_bookings: 'Customers with bookings' }} /><h2 className="mb-3 mt-7 text-sm font-semibold">Top customers by booking count</h2><DataTable rows={data?.topCustomers} emptyMessage="No customer bookings for this period." /></>;
  } else if (activeReport === 'returns') {
    reportContent = <><SummaryGrid data={data?.summary} labels={{ total: 'Returns', on_time: 'On time', late: 'Late', minor_damage: 'Minor damage', major_damage: 'Major damage', lost_items: 'Lost items', average_days_late: 'Average days late' }} /><h2 className="mb-3 mt-7 text-sm font-semibold">Late returns</h2><DataTable rows={data?.late} emptyMessage="No late returns for this period." /><h2 className="mb-3 mt-7 text-sm font-semibold">Recorded damage and loss</h2><DataTable rows={data?.damage} emptyMessage="No damage or loss records for this period." /></>;
  } else {
    reportContent = <DataTable rows={data} emptyMessage={`No ${activeReport} data for this period.`} />;
  }

  return (
    <div className="mx-auto max-w-[1440px] space-y-6 px-4 py-7 text-[#252a29] sm:px-6 sm:py-9 lg:px-10">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#e6e8e4] pb-5"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a5360]">Business intelligence</p><h1 className="mt-1 text-3xl font-semibold">Reports</h1><p className="mt-2 text-sm text-[#59615e]">Tenant-scoped summaries from existing bookings, payments, inventory and returns.</p></div><BarChart3 size={21} className="text-[#68404b]" /></header>
      <section aria-label="Report date range" className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div><label htmlFor="report-start" className="mb-1.5 block text-xs font-semibold text-[#414846]">Start date</label><input id="report-start" type="date" value={startDate} max={endDate || undefined} onChange={(event) => setStartDate(event.target.value)} className="min-h-10 w-full border border-[#dfe3df] bg-white px-3 text-sm" /></div>
        <div><label htmlFor="report-end" className="mb-1.5 block text-xs font-semibold text-[#414846]">End date</label><input id="report-end" type="date" value={endDate} min={startDate || undefined} onChange={(event) => setEndDate(event.target.value)} className="min-h-10 w-full border border-[#dfe3df] bg-white px-3 text-sm" /></div>
        {activeReport === 'bookings' && <button type="button" disabled={exporting || invalidRange} onClick={exportBookings} className="inline-flex min-h-10 items-center justify-center gap-2 border border-[#dfe3df] bg-white px-4 text-sm font-semibold text-[#414846] disabled:cursor-not-allowed disabled:opacity-50"><Download size={15} />{exporting ? 'Exporting…' : 'Export CSV'}</button>}
      </section>
      <nav aria-label="Report categories" className="flex gap-1 overflow-x-auto border-b border-[#e6e8e4]" role="tablist">{reports.filter((report) => report.id !== 'payments' || canViewFinancials).map((report) => <button key={report.id} type="button" role="tab" aria-selected={activeReport === report.id} onClick={() => setActiveReport(report.id)} className={`min-h-10 shrink-0 border-b-2 px-3 text-sm font-semibold ${activeReport === report.id ? 'border-[#68404b] text-[#68404b]' : 'border-transparent text-[#59615e] hover:text-[#252a29]'}`}>{report.label}</button>)}</nav>
      <section role="tabpanel" aria-label={`${activeReport} report`} className="border border-[#e6e8e4] bg-white p-4 sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">{reports.find((report) => report.id === activeReport)?.label}</h2><p className="mt-1 text-sm text-[#59615e]">{reports.find((report) => report.id === activeReport)?.description}</p></div>{(rangeError || error) && <button type="button" onClick={() => setRefresh((value) => value + 1)} className="inline-flex items-center gap-1 text-xs font-semibold text-[#68404b]"><RotateCcw size={13} /> Retry</button>}</div>
        {error ? <p role="alert" className="py-4 text-sm text-rose-800">{error}</p> : loading ? <p className="py-8 text-sm text-[#59615e]">Loading report…</p> : reportContent}
      </section>
    </div>
  );
}

export default ReportsPage;