import { Show } from './band.service';

// Anfahrt zu einem Auftritt (Backstage „Vor Ort“ und Laufzettel): Route und späteste Abfahrt.
export const DEFAULT_START = 'Hamminkeln';
export const DEFAULT_BUFFER = 15;

type Values = Record<string, string | undefined>;

export function routeUrl(show: Show | undefined, values: Values): string {
  const destination = show ? [show.venue, show.city].filter(Boolean).join(', ') : '';
  const origin = values['start']?.trim() || DEFAULT_START;
  return `https://www.google.com/maps/dir/?api=1&travelmode=driving&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`;
}

// „15:30 Uhr“, „ca. 15.30“ → „15:30“
export function arrivalTime(values: Values): string | null {
  const m = /(\d{1,2})[:.](\d{2})/.exec(values['ankunft'] ?? '');
  return m && +m[1] < 24 && +m[2] < 60 ? `${m[1].padStart(2, '0')}:${m[2]}` : null;
}

// Abfahrt = Ankunft − Fahrzeit − Puffer
export function departureTime(values: Values): string | null {
  const a = arrivalTime(values);
  const drive = Number(values['fahrzeit']);
  if (!a || !drive) return null;
  const total = +a.slice(0, 2) * 60 + +a.slice(3) - drive - Number(values['puffer'] ?? DEFAULT_BUFFER);
  const t = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}
