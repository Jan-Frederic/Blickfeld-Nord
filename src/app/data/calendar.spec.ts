import { buildIcs } from './calendar';
import { Show } from './band.service';

const timed: Show = { date: '2026-12-04', time: '18:00', venue: 'Weihnachtsmarkt', city: 'Rhede', confirmed: true };
const allDay: Show = { date: '2026-12-05', venue: 'Stadtfest', confirmed: true };

describe('Kalender-Export', () => {
  it('enthält ohne Erinnerung keinen Alarm', () => {
    expect(buildIcs([timed], 'Test')).not.toContain('BEGIN:VALARM');
  });

  it('erinnert am Vortag: 24 h vorher bzw. mittags bei ganztägigen Terminen', () => {
    const ics = buildIcs([timed, allDay], 'Test', false, true);
    expect(ics.match(/BEGIN:VALARM/g)?.length).toBe(2);
    expect(ics).toContain('TRIGGER:-P1D');
    expect(ics).toContain('TRIGGER:-PT12H');
  });
});
