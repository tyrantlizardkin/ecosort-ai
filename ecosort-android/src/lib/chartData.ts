import { ScanRecord } from '../types';

type Metric = 'kwh' | 'co2' | 'weight';

const getMetricValue = (scan: ScanRecord, metric: Metric): number => {
  if (metric === 'kwh') return scan.kwhSaved;
  if (metric === 'co2') return scan.co2Saved;
  return scan.weightDiverted;
};

export const computeChartData = (scans: ScanRecord[], metric: Metric): number[] => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();

  const monthScans = scans.filter(s => {
    const d = new Date(s.timestamp);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  const dailyTotals: Record<number, number> = {};
  for (const scan of monthScans) {
    const day = new Date(scan.timestamp).getDate();
    dailyTotals[day] = (dailyTotals[day] ?? 0) + getMetricValue(scan, metric);
  }

  const result: number[] = [];
  let cumulative = 0;
  for (let day = 1; day <= today; day++) {
    cumulative += dailyTotals[day] ?? 0;
    result.push(parseFloat(cumulative.toFixed(3)));
  }

  if (result.length === 0) return [0, 0];
  if (result.length === 1) return [0, result[0]];
  return result;
};
