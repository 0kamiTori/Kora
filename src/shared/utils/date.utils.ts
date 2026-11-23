import type { ISODateString } from '../types/common.types';

const DATE_TIME = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
const TIME = new Intl.DateTimeFormat('es-CO', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});
const DATE = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' });

function parse(value: ISODateString | number | null | undefined): Date | null {
  if (value === null || value === undefined) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateTime(value: ISODateString | number | null | undefined): string {
  const date = parse(value);
  return date ? DATE_TIME.format(date) : '—';
}

/** Hora con segundos: se usa para la "hora del último dato". */
export function formatTime(value: ISODateString | number | null | undefined): string {
  const date = parse(value);
  return date ? TIME.format(date) : '—';
}

export function formatDate(value: ISODateString | number | null | undefined): string {
  const date = parse(value);
  return date ? DATE.format(date) : '—';
}

/** "hace 12 s", "hace 3 min", "hace 2 h". */
export function formatElapsed(elapsedMs: number): string {
  const seconds = Math.max(0, Math.round(elapsedMs / 1000));
  if (seconds < 60) return `hace ${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `hace ${hours} h`;
  return `hace ${Math.floor(hours / 24)} días`;
}

/** Diferencia b - a en milisegundos; null si alguna fecha no es válida. */
export function diffMs(a: ISODateString | number, b: ISODateString | number): number | null {
  const start = parse(a);
  const end = parse(b);
  if (!start || !end) return null;
  return end.getTime() - start.getTime();
}

export function formatLatency(ms: number | null): string {
  if (ms === null) return '—';
  if (Math.abs(ms) < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}
