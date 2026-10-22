const ils = new Intl.NumberFormat('en-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 });

export function formatIls(n: number): string {
  return ils.format(Math.round(n));
}

export function formatSignedIls(n: number): string {
  if (Math.round(n) === 0) return '±' + formatIls(0);
  return (n > 0 ? '+' : '−') + formatIls(Math.abs(n));
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function formatDims(d: { widthCm: number; depthCm: number; heightCm: number }): string {
  return `${d.widthCm} W × ${d.depthCm} D × ${d.heightCm} H cm`;
}
