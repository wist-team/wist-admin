/** MariaDB DECIMAL columns are serialised as strings; coerce for maths and sorting. */
export function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function roundOrDash(value: string | number | null | undefined): string {
  const n = toNumber(value);
  return n === null ? '–' : String(Math.round(n));
}
