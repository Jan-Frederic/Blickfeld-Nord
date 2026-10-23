import { aufbauPlan, zuKnapp } from './zeitplan';

describe('aufbauPlan', () => {
  it('rechnet vom Beginn rückwärts, mit Abfahrt bei bekannter Fahrzeit', () => {
    const plan = aufbauPlan('18:00', 30, 15);
    expect(plan[0]).toEqual({ zeit: '14:15', was: 'Abfahrt (30 min Fahrt + 15 min Puffer)' });
    expect(plan[1]).toEqual({ zeit: '15:00', was: 'Ankunft und ausladen' });
    expect(plan.at(-1)).toEqual({ zeit: '18:00', was: 'Beginn' });
  });

  it('geht über Mitternacht und bleibt ohne Beginn leer', () => {
    expect(aufbauPlan('01:00')[0].zeit).toBe('22:00');
    expect(aufbauPlan(undefined)).toEqual([]);
  });

  it('warnt, wenn die Ankunft zu spät ist', () => {
    expect(zuKnapp('18:00', '16:00')).toBe(true);
    expect(zuKnapp('18:00', '15:00')).toBe(false);
    expect(zuKnapp('18:00', null)).toBe(false);
  });
});
