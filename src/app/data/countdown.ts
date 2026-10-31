// Countdown für Plakat/Story in der Woche vor dem Auftritt: „NOCH 5 TAGE“, „MORGEN“, „HEUTE“ – sonst „LIVE“
export function countdownKopf(datum: string, heute: string): string {
  const tage = tageZwischen(heute, datum);
  if (tage === 0) return 'HEUTE';
  if (tage === 1) return 'MORGEN';
  if (tage > 1 && tage <= 7) return `NOCH ${tage} TAGE`;
  return 'LIVE';
}import { tageZwischen } from './datum';

