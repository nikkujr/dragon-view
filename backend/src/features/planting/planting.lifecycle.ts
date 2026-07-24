export type GrowthStage = 'NEWLY_GRAFTED' | 'INTERMEDIATE' | 'NEAR_MATURITY';

export function normalizeDateOnly(value: string | Date): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const dateOnly = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
    throw new RangeError('Grafting date must use YYYY-MM-DD format.');
  }
  return dateOnly;
}

export function calculateLifecycle(graftingDate: string | Date, today = new Date()) {
  const dateOnly = normalizeDateOnly(graftingDate);
  const grafted = new Date(`${dateOnly}T00:00:00Z`);
  const current = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const elapsedDays = Math.max(0, Math.floor((current.getTime() - grafted.getTime()) / 86_400_000));
  const stage: GrowthStage = elapsedDays <= 5
    ? 'NEWLY_GRAFTED'
    : elapsedDays <= 30
      ? 'INTERMEDIATE'
      : 'NEAR_MATURITY';
  const maturity = new Date(grafted);
  maturity.setUTCDate(maturity.getUTCDate() + 45);
  return {
    elapsedDays,
    remainingDays: Math.max(0, 45 - elapsedDays),
    stage,
    readyForHarvest: elapsedDays >= 45,
    estimatedMaturityDate: maturity.toISOString().slice(0, 10),
    progressPercent: Math.min(100, (elapsedDays / 45) * 100),
  };
}
