// Aufbau-Zeitplan (Backstage „Vor Ort“ und Laufzettel): vom Beginn rückwärts gerechnet. Richtwerte nach dem
// Technik-Rider („Aufbau ca. 3 Stunden vor Beginn“); mit Fahrzeit kommt die Abfahrt dazu.
export const AUFBAU = [
  { vor: 180, was: 'Ankunft und ausladen' },
  { vor: 150, was: 'PA, Licht und Strom aufbauen' },
  { vor: 105, was: 'Instrumente, Mikros und Monitore verkabeln' },
  { vor: 60, was: 'Soundcheck' },
  { vor: 20, was: 'Bühne fertig – umziehen, durchatmen' },
  { vor: 0, was: 'Beginn' },
];

const minuten = (hhmm: string) => +hhmm.slice(0, 2) * 60 + +hhmm.slice(3, 5);
const uhrzeit = (min: number) => {
  const t = ((min % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
};

/** Schritte mit Uhrzeit; ohne gültigen Beginn (HH:MM) leer */
export function aufbauPlan(beginn: string | undefined, fahrzeit?: number, puffer = 15): { zeit: string; was: string }[] {
  if (!beginn || !/^\d{2}:\d{2}$/.test(beginn)) return [];
  const b = minuten(beginn);
  const plan = AUFBAU.map((s) => ({ zeit: uhrzeit(b - s.vor), was: s.was }));
  if (fahrzeit && fahrzeit > 0) plan.unshift({ zeit: uhrzeit(b - AUFBAU[0].vor - fahrzeit - puffer), was: `Abfahrt (${fahrzeit} min Fahrt + ${puffer} min Puffer)` });
  return plan;
}

/** true, wenn die vereinbarte Ankunft später liegt als der Zeitplan vorsieht */
export function zuKnapp(beginn: string | undefined, ankunft: string | null): boolean {
  if (!beginn || !ankunft || !/^\d{2}:\d{2}$/.test(beginn)) return false;
  return minuten(beginn) - minuten(ankunft) < AUFBAU[0].vor;
}
