import { dankeText } from './danke';

describe('dankeText', () => {
  it('verlinkt bei öffentlichen Auftritten die Konzertseite', () => {
    const t = dankeText({ date: '2026-08-22', venue: 'Gasthof Küpper', city: 'Hamminkeln-Dingden', confirmed: true }, '2026-08-22', true);
    expect(t).toContain('am 22. August 2026 bei Gasthof Küpper in Hamminkeln-Dingden');
    expect(t).toContain('https://blickfeld-nord.de/konzerte/2026-08-22/');
  });

  it('nennt bei privaten Feiern weder internen Namen noch Konzertseite', () => {
    const t = dankeText({ date: '2026-09-05', venue: 'Familie Muster', private: true, confirmed: true }, '2026-09-05', true);
    expect(t).not.toContain('Muster');
    expect(t).not.toContain('/konzerte/');
    expect(t).toContain('bei eurer Feier');
  });
});
