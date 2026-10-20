// Häufige Fragen von Veranstaltern auf Deutsch, Englisch und Niederländisch.
// Erscheinen auf /booking, /en/booking und /nl/booking und als strukturierte Daten (FAQPage) für Suchmaschinen (scripts/seo.mjs).
// Angaben auch im Technik-Rider (scripts/build-rider.py) und auf /technik gleich halten.
export type FaqItem = { q: string; a: string; link?: { label: string; to: string } };

export const FAQ: Record<'de' | 'en' | 'nl', { title: string; items: FaqItem[] }> = {
  de: {
    title: 'Häufige Fragen',
    items: [
      {
        q: 'Welche Technik bringt ihr mit?',
        a: 'PA, Licht und Instrumente bringen wir komplett selbst mit – ihr müsst euch um nichts kümmern. Was genau dazugehört, was wir vor Ort brauchen und den Technik-Rider zum Download findet ihr auf unserer Technik-Seite.',
        link: { label: 'Zur Technik-Seite', to: '/technik' },
      },
      { q: 'Wie weit fahrt ihr?', a: 'Wir spielen im Umkreis von bis zu 50 km rund um Hamminkeln.' },
      { q: 'Wie viel Platz braucht ihr?', a: 'Eine Fläche von etwa 4 × 3 Metern.' },
      { q: 'Wie viel Strom braucht ihr?', a: 'Zwei Steckdosen in der Nähe der Spielfläche. PA und Licht bringen wir selbst mit.' },
      { q: 'Wie früh sollte man buchen?', a: 'Am besten mindestens 4 Wochen im Voraus – je früher, desto besser die Chancen auf euren Wunschtermin.' },
      { q: 'Wie lange dauern Auf- und Abbau?', a: 'Für den Aufbau brauchen wir rund 3 Stunden, für den Abbau etwa 1 Stunde. Plant bitte ein, dass wir entsprechend früher vor Ort sind.' },
      { q: 'Wie läuft der Abend ab?', a: 'Wir spielen 3 bis 4 Stunden in Sets à 1 Stunde. Pausen legen wir nach Absprache oder spontan ein – ganz wie es zur Stimmung passt.' },
    ],
  },
  en: {
    title: 'Frequently asked questions',
    items: [
      {
        q: 'What equipment do you bring?',
        a: 'We bring our own PA, lights and instruments – you don’t need to take care of anything. What exactly is included, what we need on site and the technical rider (in German) for download can be found on our technical page.',
        link: { label: 'Technical page', to: '/technik' },
      },
      { q: 'How far do you travel?', a: 'We play within a radius of up to 50 km around Hamminkeln (Germany).' },
      { q: 'How much space do you need?', a: 'An area of about 4 × 3 metres.' },
      { q: 'How much power do you need?', a: 'Two power sockets close to the stage area. We bring our own PA and lights.' },
      { q: 'How early should we book?', a: 'Ideally at least 4 weeks in advance – the earlier, the better the chances for your preferred date.' },
      { q: 'How long do set-up and teardown take?', a: 'Set-up takes about 3 hours, teardown about 1 hour. Please plan for us to arrive accordingly early.' },
      { q: 'How does the evening work?', a: 'We play 3 to 4 hours in sets of 1 hour. Breaks are taken as agreed or spontaneously – whatever suits the mood.' },
    ],
  },
  nl: {
    title: 'Veelgestelde vragen',
    items: [
      {
        q: 'Welke techniek nemen jullie mee?',
        a: 'PA, licht en instrumenten nemen we helemaal zelf mee – jullie hoeven nergens voor te zorgen. Wat er precies bij hoort, wat we ter plaatse nodig hebben en de techniek-rider (in het Duits) om te downloaden vinden jullie op onze techniekpagina.',
        link: { label: 'Naar de techniekpagina', to: '/technik' },
      },
      { q: 'Hoe ver reizen jullie?', a: 'We spelen in een straal van maximaal 50 km rond Hamminkeln (Duitsland).' },
      { q: 'Hoeveel ruimte hebben jullie nodig?', a: 'Een oppervlakte van ongeveer 4 × 3 meter.' },
      { q: 'Hoeveel stroom hebben jullie nodig?', a: 'Twee stopcontacten in de buurt van het podium. PA en licht nemen we zelf mee.' },
      { q: 'Hoe vroeg moeten we boeken?', a: 'Het liefst minimaal 4 weken van tevoren – hoe eerder, hoe groter de kans op jullie gewenste datum.' },
      { q: 'Hoe lang duren op- en afbouw?', a: 'De opbouw duurt ongeveer 3 uur, de afbouw ongeveer 1 uur. Houd er rekening mee dat we daarom eerder ter plaatse zijn.' },
      { q: 'Hoe verloopt de avond?', a: 'We spelen 3 tot 4 uur in sets van 1 uur. Pauzes nemen we in overleg of spontaan – net hoe het bij de sfeer past.' },
    ],
  },
};
