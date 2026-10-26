import { weihnachtenZuerst } from './weihnachten';

const liste = [{ title: 'Angels' }, { title: 'In der Weihnachtsbäckerei' }, { title: 'Wonderwall' }, { title: 'Kleine Kinder, große Kinder (Das Adventskalenderlied)' }];

describe('weihnachtenZuerst', () => {
  it('stellt Weihnachtslieder vom 1. bis 24. Dezember nach oben, sonst bleibt alles', () => {
    expect(weihnachtenZuerst(liste, new Date(2026, 11, 1)).map((s) => s.title)).toEqual([
      'In der Weihnachtsbäckerei',
      'Kleine Kinder, große Kinder (Das Adventskalenderlied)',
      'Angels',
      'Wonderwall',
    ]);
    expect(weihnachtenZuerst(liste, new Date(2026, 11, 24))[0].title).toBe('In der Weihnachtsbäckerei');
    expect(weihnachtenZuerst(liste, new Date(2026, 11, 25))).toBe(liste);
    expect(weihnachtenZuerst(liste, new Date(2026, 10, 30))).toBe(liste);
  });
});
