import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { adminService } from '../services/admin.service';

const series = [
  { key: 'shops', label: 'Shop registrations', color: 'bg-[#6132DA]' },
  { key: 'users', label: 'Account registrations', color: 'bg-[#16877B]' },
  { key: 'bookings', label: 'Bookings created', color: 'bg-[#D18431]' },
];

const downloadReport = (data, days) => {
  const escapeCsv = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const rows = [
    ['Date', 'Shop registrations', 'Account registrations', 'Bookings'],
    ...(data?.trend || []).map((row) => [row.date, row.shops, row.users, row.bookings]),
  ];
  const csv = rows.map((row) => row.map(escapeCsv).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `trackinhub-platform-report-${days}-days.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};

function AdminReportsPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    adminService.getOverview({ days })
      .then((response) => {
        if (active) {
          setData(response?.data?.data || null);
          setError('');
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Unable to load platform reports.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [days]);

  if (loading && !data) return <p className="py-10 text-sm text-[#59615e]">Loading platform reports…</p>;

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><h2 className="text-xl font-semibold text-[#26252c]">Platform activity reports</h2><p className="mt-1 text-sm text-[#74747e]">Registration and booking activity from existing platform records.</p></div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs font-medium text-[#53535d]">Date range
            <select value={days} onChange={(event) => setDays(Number(event.target.value))} className="ml-2 min-h-10 border border-[#dedee6] bg-white px-3 text-sm">
              <option value={7}>7 days</option><option value={30}>30 days</option><option value={90}>90 days</option>
            </select>
          </label>
          <button type="button" onClick={() => downloadReport(data, days)} disabled={!data?.trend?.length} className="inline-flex min-h-10 items-center gap-2 border border-[#dedee6] bg-white px-3 text-xs font-semibold text-[#53535d] hover:bg-[#f8f8fa] disabled:cursor-not-allowed disabled:opacity-50">
            <Download size={14} aria-hidden="true" /> Export CSV
          </button>
        </div>
      </header>
      {error && <div role="alert" className="border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}
      <div className="space-y-4">
        {series.map(({ key, label, color }) => {
          const rows = data?.trend || [];
          const max = Math.max(1, ...rows.map((row) => Number(row[key] || 0)));
          const total = rows.reduce((sum, row) => sum + Number(row[key] || 0), 0);
          return (
            <article key={key} className="border border-[#e7e6ec] bg-white">
              <header className="flex items-center justify-between border-b border-[#eeedf1] px-5 py-4">
                <div><h3 className="text-sm font-semibold text-[#26252c]">{label}</h3><p className="mt-1 text-xs text-[#74747e]">Selected period total: {total}</p></div>
                <span className={`size-2.5 rounded-full ${color}`} aria-hidden="true" />
              </header>
              {rows.length ? <div className="overflow-x-auto p-5">
                <div className="flex h-36 min-w-[560px] items-end gap-1 border-b border-l border-[#e7e6ec] px-2">
                  {rows.map((row) => {
                    const value = Number(row[key] || 0);
                    return <div key={row.date} className="group relative flex h-full min-w-1 flex-1 items-end justify-center" title={`${row.date}: ${value}`}><span className={`w-full max-w-3 rounded-t-sm ${color}`} style={{ height: `${Math.max((value / max) * 100, 3)}%` }} /></div>;
                  })}
                </div>
                <div className="mt-2 flex justify-between text-[10px] text-[#898e94]"><span>{rows[0]?.date}</span><span>{rows[rows.length - 1]?.date}</span></div>
              </div> : <p className="p-5 text-sm text-[#74747e]">No activity in this period.</p>}
            </article>
          );
        })}
      </div>
      <p className="border border-[#e7e6ec] bg-white p-4 text-xs leading-5 text-[#74747e]">Booking value is not reported as platform revenue. Global audit history is not available because existing audit records are scoped to individual shops.</p>
    </section>
  );
}

export default AdminReportsPage;
