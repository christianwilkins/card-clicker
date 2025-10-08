export function formatDisplayNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return '0';
  }

  if (value === 0) {
    return '0';
  }

  const absValue = Math.abs(value);

  if (absValue >= 1_000_000) {
    const exponential = value.toExponential(2);
    const [mantissa, exponent] = exponential.split('e');
    const cleanExponent = exponent.startsWith('+') ? exponent.slice(1) : exponent;
    return `${mantissa}E${cleanExponent}`;
  }

  if (absValue >= 1_000) {
    return Math.round(value).toLocaleString();
  }

  if (absValue >= 1) {
    return Math.round(value).toString();
  }

  return value.toPrecision(2);
}

export function formatSignedDisplayNumber(value: number): string {
  const formatted = formatDisplayNumber(Math.abs(value));
  if (value > 0) {
    return `+${formatted}`;
  }
  if (value < 0) {
    return `-${formatted}`;
  }
  return formatted;
}
