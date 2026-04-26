import { computeChartData } from '../src/lib/chartData';
import { ScanRecord } from '../src/types';

const makeRecord = (dayOfMonth: number, kwh: number, co2: number, weight: number): ScanRecord => {
  const d = new Date();
  d.setDate(dayOfMonth);
  d.setHours(12, 0, 0, 0);
  return {
    id: String(dayOfMonth),
    timestamp: d.getTime(),
    item: 'test',
    category: 'recycling',
    kwhSaved: kwh,
    co2Saved: co2,
    weightDiverted: weight,
  };
};

test('returns at least 2 data points when no scans', () => {
  const data = computeChartData([], 'kwh');
  expect(data.length).toBeGreaterThanOrEqual(2);
  expect(data.every(v => v === 0)).toBe(true);
});

test('accumulates kwh correctly across days', () => {
  const today = new Date().getDate();
  const scans = [makeRecord(1, 0.1, 0.2, 0.3), makeRecord(1, 0.2, 0.1, 0.1)];
  const data = computeChartData(scans, 'kwh');
  expect(data.length).toBe(Math.max(2, today));
  expect(data[0]).toBeCloseTo(0.3);
});

test('accumulates co2 correctly', () => {
  const scans = [makeRecord(1, 0.1, 0.5, 0.2)];
  const data = computeChartData(scans, 'co2');
  expect(data[0]).toBeCloseTo(0.5);
});

test('excludes scans from previous months', () => {
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  const oldRecord: ScanRecord = {
    id: 'old',
    timestamp: lastMonth.getTime(),
    item: 'test',
    category: 'recycling',
    kwhSaved: 100,
    co2Saved: 100,
    weightDiverted: 100,
  };
  const data = computeChartData([oldRecord], 'kwh');
  expect(data.every(v => v === 0)).toBe(true);
});
