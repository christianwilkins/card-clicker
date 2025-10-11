export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

const commaFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});

export function formatDisplayNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return '0';
  }

  const absValue = Math.abs(value);
  if (absValue >= 100_000_000_000) {
    return value.toExponential(2).replace('e', 'E');
  }

  return commaFormatter.format(value);
}

export function formatSignedDisplayNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return '+0';
  }
  const sign = value >= 0 ? '+' : '-';
  return `${sign}${formatDisplayNumber(Math.abs(value))}`;
}
