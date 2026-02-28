import { format } from 'date-fns';

export function parseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

export function formatDateToString(date: Date | null): string | undefined {
  if (!date) return undefined;
  return format(date, 'yyyy-MM-dd');
}
