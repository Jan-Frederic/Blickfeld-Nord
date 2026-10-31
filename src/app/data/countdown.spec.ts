import { countdownKopf } from './countdown';

describe('countdownKopf', () => {
  it('zählt die letzte Woche herunter', () => {
    expect(countdownKopf('2027-02-19', '2027-02-19')).toBe('HEUTE');
    expect(countdownKopf('2027-02-19', '2027-02-18')).toBe('MORGEN');
    expect(countdownKopf('2027-02-19', '2027-02-14')).toBe('NOCH 5 TAGE');
    expect(countdownKopf('2027-02-19', '2027-02-01')).toBe('LIVE');
    expect(countdownKopf('2027-02-19', '2027-02-20')).toBe('LIVE');
  });
});
