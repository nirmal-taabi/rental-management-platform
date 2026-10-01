import test from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../src/config/database.js';
import { getDashboardSummary } from '../src/repositories/dashboard.repository.js';
import { getDashboardSummaryForShop } from '../src/services/dashboard.service.js';
import { validateReportLimit, validateReportRange } from '../src/validators/report.validator.js';

test('report range validation defaults to current month and rejects invalid or excessive dates', () => {
  const now = new Date('2026-10-01T05:00:00.000Z');
  const defaultRange = validateReportRange({}, now);
  assert.deepEqual([defaultRange.startDate, defaultRange.endDate], ['2026-10-01', '2026-10-01']);
  assert.equal(validateReportRange({ startDate: '2026-02-30', endDate: '2026-03-01' }, now).errors.length, 1);
  assert.ok(validateReportRange({ startDate: '2025-01-01', endDate: '2026-10-01' }, now).errors.length > 0);
  assert.equal(validateReportRange({ startDate: '2026-10-02', endDate: '2026-10-01' }, now).errors[0].field, 'dateRange');
});

test('report limits are bounded to protect export and top-product queries', () => {
  assert.deepEqual(validateReportLimit('100'), { value: 100, error: null });
  assert.equal(validateReportLimit('101').error.field, 'limit');
  assert.equal(validateReportLimit('0').error.field, 'limit');
});

test('dashboard summary always scopes each aggregate to the authenticated shop', async () => {
  const originalQuery = pool.query;
  const captured = [];
  pool.query = async (sql, values = []) => {
    captured.push({ sql, values });
    return [[], []];
  };

  try {
    await getDashboardSummary(73, {
      startDate: '2026-10-01', endDate: '2026-10-01',
      previousStartDate: '2026-09-30', previousEndDate: '2026-09-30', includeFinancials: true,
    });
    assert.ok(captured.length >= 5);
    assert.ok(captured.every(({ values }) => values.includes(73)));
    assert.ok(captured.every(({ sql }) => /shop_id\s*=\s*\?/.test(sql)));
  } finally {
    pool.query = originalQuery;
  }
});

test('staff dashboard summary omits financial totals and financial queries', async () => {
  const originalQuery = pool.query;
  const captured = [];
  pool.query = async (sql, values = []) => {
    captured.push({ sql, values });
    return [[], []];
  };

  try {
    const result = await getDashboardSummaryForShop(73, {
      startDate: '2026-10-01', endDate: '2026-10-01',
    }, 'STAFF');
    assert.equal(Object.hasOwn(result, 'payments'), false);
    assert.equal(captured.length, 4);
    assert.ok(captured.every(({ sql }) => !/FROM payments/.test(sql)));
    assert.ok(captured.every(({ values }) => values.includes(73)));
  } finally {
    pool.query = originalQuery;
  }
});