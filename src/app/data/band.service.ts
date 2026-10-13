import { Injectable } from '@angular/core';

export interface Member {
  slug: string;
  name: string;
  role: string;
  bio: string;
  initials: string;
  // Ausführliche Bio für die Unterseite /band/<slug>
  tagline?: string;
  story?: string[];
  link?: { label: string; url: string };
}

export interface Friend {
  name: string;
  description: string;
  url: string;
  // eigenes Symbol (Trommel, Kaffeetasse, Instagram, Noten, Bierkrug, Flamme, Gruppe), sonst ein allgemeines Link-Symbol
  icon?: 'drum' | 'cafe' | 'instagram' | 'choir' | 'pub' | 'fire' | 'community';
}

export interface Photo {
  src: string;
  thumb: string;
  alt: string;
  caption?: string;
}

export interface Show {
  date: string;
  // optional: letzter Tag bei mehrtägigen Terminen
  endDate?: string;
  venue: string;
  city?: string;
  mapsUrl?: string;
  // Private Termine erscheinen nur auf der Backstage-Seite, nicht öffentlich
  private?: boolean;
  // Ist der Auftritt fest zugesagt und alles geklärt?
  confirmed: boolean;
  comment?: string;
}

@Injectable({ providedIn: 'root' })
export class BandService {
  // Öffentlich gelistet wird nur, was öffentlich UND geklärt ist – chronologisch
  get publicShows(): Show[] {
    return this.shows.filter((s) => !s.private && s.confirmed).sort((a, b) => a.date.localeCompare(b.date));
  }

  readonly members: Member[] = [
    { slug: 'david-broeker', name: 'David Bröker', role: 'Gesang & Gitarre', initials: 'DB', bio: 'Seit 2019 an Bord und vorne am Mikro: Mit Stimme und Gitarre holt David das Publikum vom ersten Ton an ab.' },
    {
      slug: 'matthias-wigger',
      name: 'Matthias Wigger',
      role: 'Schlagzeug & Gesang',
      initials: 'MW',
      bio: 'Der Puls der Band seit 2019: Matthias sorgt hinterm Drumset für den Groove – und singt dabei auch noch mit.',
      tagline: 'Schlagzeuger aus Leidenschaft',
      story: [
        'Ich heiße Matthias Wigger und spiele seit meinem fünften Lebensjahr mit großer Leidenschaft Schlagzeug und Percussion. Bereits im Alter von sechs Jahren sammelte ich erste Live- und Bühnenerfahrungen in der damaligen Band Sunrise. Schon damals wurde mir klar, dass mich besonders das Zusammenspiel im Ensemble sowie das Auftreten vor Publikum am Schlagzeug fasziniert.',
        'Über einen Zeitraum von neun Jahren erhielt ich fundierten Unterricht an der Bocholt Rheder Musikschule, wo ich mir solide technische Grundlagen, ein ausgeprägtes rhythmisches Verständnis sowie musikalisches Gehör erarbeiten konnte. Mit 14 Jahren wurde ich Mitglied des Percussion Ensembles Bocholt, in dem ich intensive Erfahrungen mit Polyrhythmik, Dynamik und unterschiedlichsten perkussiven Klangfarben sammelte.',
        'Auch das Musizieren im Dingdener Chor Pro-Campesinos hat meine Spielweise und mein musikalisches Verständnis nachhaltig geprägt. Das aufmerksame Zuhören, das Anpassen an einen Chor und das sensible Begleiten mit dem Schlagzeug waren für mich eine besonders lehrreiche und wertvolle Erfahrung, die mich bis heute begleitet. Inzwischen unterstütze ich den Chor zudem regelmäßig an der Bassgitarre, wodurch ich mein musikalisches Zusammenspiel weiter vertiefen konnte.',
        'Ergänzender Unterricht an den Musikschulen Ringenberg, Wesel und Rhede eröffnete mir weitere pädagogische und stilistische Perspektiven im modernen Schlagzeugunterricht. Besonders prägend war meine Ausbildung an der Schlagzeugschule Frank Bruns, bei der ich mein Spiel in den Bereichen Groove, Timing, Technik, Stilistik und musikalischer Ausdruck kontinuierlich weiterentwickeln konnte.',
        'Neben meiner Unterrichtstätigkeit war und bin ich als Schlagzeuger in verschiedenen Bands und Stilrichtungen aktiv. Dazu zählen Sunrise (Kirchenband), Break Nemesis (Pop-Band der 1990er Jahre), Bedazzled (Progressive Metal der 2000er), Arriving Somewhere (British Pop, 2000–2010), Joda (Grunge, 2020er) sowie aktuell Blickfeld Nord, eine Band mit einem vielseitigen Repertoire aus Pop, Rock, Schlager, Dance und Disco.',
        'Hauptberuflich arbeite ich als Vorgesetzter der Werkzeugvoreinstellung bei der Flender GmbH und trage Verantwortung für Organisation, Abläufe und Mitarbeitende. Die tägliche Arbeit mit Menschen, das Anleiten von Teams sowie das Begleiten individueller Entwicklungen bereiten mir große Freude. Durch meine Ausbildung zum Ausbilder (AdA) konnte ich vielfältige didaktische Lehrmethoden erlernen, die ich im Rahmen meines Industriemeisters und meiner beruflichen Erfahrung weiter vertiefen konnte.',
        'Besonders wichtig sind mir ein handlungsorientierter Unterricht, das Stärken unterschiedlicher Kompetenzen sowie das Erkennen und gezielte Fördern persönlicher Potenziale.',
        'Seit über zehn Jahren gebe ich meine vielfältigen musikalischen und pädagogischen Erfahrungen mit großer Begeisterung – zunächst als Hobby und inzwischen gewerblich – an meine Schülerinnen und Schüler weiter.',
      ],
      link: { label: 'Zur Drum School Matthias Wigger', url: 'https://www.drumschool-wigger.de/' },
    },
    { slug: 'jan-frederic-overbeck', name: 'Jan-Frederic Overbeck', role: 'Bass & Gesang', initials: 'JO', bio: 'Fred ist seit Oktober 2025 dabei und hat aus dem Duo ein Trio gemacht – mit Bass, Stimme und jeder Menge Druck.' },
  ];

  // Befreundete Seiten für /freunde
  readonly friends: Friend[] = [
    {
      name: 'Drum School Matthias Wigger',
      description: 'Schlagzeugunterricht in Hamminkeln – von unserem Drummer Matthias, für Einsteiger und Fortgeschrittene.',
      url: 'https://www.drumschool-wigger.de/',
      icon: 'drum',
    },
    {
      name: 'Café Lotti',
      description: 'Dein Café in Dingden für guten Kaffee, Kuchen, Frühstück, Live-Musik, Workshops und besondere Abende.',
      url: 'https://cafelotti.de/',
      icon: 'cafe',
    },
    {
      name: 'markusdproduktion',
      description: 'Produktion für Kunst und Kultur.',
      url: 'https://www.instagram.com/markusdproduktion/',
      icon: 'instagram',
    },
    {
      name: 'Pro Campesinos 1977 e.V.',
      description: 'Der Chor aus Dingden, der seit mehr als 40 Jahren notleidenden Menschen in der Dritten Welt mit musikalischen Veranstaltungen und Spendengeldern hilft.',
      url: 'https://www.pro-campesinos.de/',
      icon: 'choir',
    },
    {
      name: 'Gasthof Küpper',
      description: 'Gasthof & Kneipe – beides unter einem Dach, wo gutes Essen & lockeres Trinken seit fast 150 Jahren so nah beieinander liegen.',
      url: 'https://www.gasthof-kuepper.de/',
      icon: 'pub',
    },
    {
      name: 'Freiwillige Feuerwehr Hamminkeln – Löscheinheit Dingden',
      description: 'Ehrenamtlich im Einsatz für Dingden und Umgebung – rund um die Uhr, wenn es darauf ankommt.',
      url: 'https://www.feuerwehr-dingden.de/l%C3%B6scheinheit-dingden/',
      icon: 'fire',
    },
    {
      name: 'Bokeltsen Blagen',
      description: 'Wo Gemeinschaft läuft und der Kaffee niemals kalt wird!',
      url: 'https://www.bokeltsen-blagen.de/',
      icon: 'community',
    },
  ];

  // Neue Fotos nach public/galerie/ legen (Original + verkleinerte -thumb-Version) und hier eintragen
  readonly photos: Photo[] = [
    { src: 'galerie/band-1.webp', thumb: 'galerie/band-1-thumb.webp', alt: 'Die drei Musiker von Blickfeld Nord knien lachend zwischen Mikrofonständern und Schlagzeug', caption: 'Blickfeld Nord' },
    { src: 'galerie/band-2.webp', thumb: 'galerie/band-2-thumb.webp', alt: 'Die drei Musiker von Blickfeld Nord lachen gut gelaunt vor Backsteinwand, Gitarren und Schlagzeug', caption: 'Blickfeld Nord' },
    { src: 'hero.webp', thumb: 'galerie/logo-thumb.webp', alt: 'Blickfeld-Nord-Logo mit Kompass über einem nebligen See', caption: 'Blickfeld Nord' },
    { src: 'galerie/platzhalter-1.webp', thumb: 'galerie/platzhalter-1-thumb.webp', alt: 'Platzhalter – Foto folgt' },
    { src: 'galerie/platzhalter-2.webp', thumb: 'galerie/platzhalter-2-thumb.webp', alt: 'Platzhalter – Foto folgt' },
    { src: 'galerie/platzhalter-3.webp', thumb: 'galerie/platzhalter-3-thumb.webp', alt: 'Platzhalter – Foto folgt' },
  ];

  // Alle Auftritte; öffentlich gelistet werden nur nicht-private UND geklärte (siehe publicShows)
  readonly shows: Show[] = [
    { date: '2026-12-04', city: 'Rhede', venue: 'Weihnachtsmarkt', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Rhede%2C%20NRW', confirmed: true },
    { date: '2027-04-03', city: 'Rhede', venue: 'Latöchte', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Lat%C3%B6chte%2C%20Rhede%2C%20NRW', confirmed: true },
    { date: '2027-04-30', city: 'Hamminkeln-Dingden', venue: 'Café Lotti – Tanz in den Mai', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Caf%C3%A9%20Lotti%2C%20Dingden%2C%20Hamminkeln%2C%20NRW', confirmed: true },
    { date: '2027-05-02', city: 'Hamminkeln-Dingden', venue: 'Queens Pub', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Queens%20Pub%2C%20Dingden%2C%20Hamminkeln%2C%20NRW', confirmed: true },
    { date: '2027-05-07', venue: 'Scheperswiese', private: true, confirmed: false },
    { date: '2027-06-12', venue: 'Ronny S.', private: true, confirmed: false },
    { date: '2027-08-29', city: 'Rhede', venue: 'Kirmes Rhede', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Rhede%2C%20NRW', confirmed: false },
    { date: '2027-09-03', endDate: '2027-09-05', venue: 'Bandwochenende', private: true, confirmed: false },
    { date: '2028-06-24', venue: 'Wolfgang S. 61', private: true, confirmed: false, comment: 'Option – einer von fünf möglichen Terminen (24.06., 01.07., 08.07., 19.08., 26.08.2028)' },
    { date: '2028-07-01', venue: 'Wolfgang S. 61', private: true, confirmed: false, comment: 'Option – einer von fünf möglichen Terminen (24.06., 01.07., 08.07., 19.08., 26.08.2028)' },
    { date: '2028-07-08', venue: 'Wolfgang S. 61', private: true, confirmed: false, comment: 'Option – einer von fünf möglichen Terminen (24.06., 01.07., 08.07., 19.08., 26.08.2028)' },
    { date: '2028-08-19', venue: 'Wolfgang S. 61', private: true, confirmed: false, comment: 'Option – einer von fünf möglichen Terminen (24.06., 01.07., 08.07., 19.08., 26.08.2028)' },
    { date: '2028-08-26', venue: 'Wolfgang S. 61', private: true, confirmed: false, comment: 'Option – einer von fünf möglichen Terminen (24.06., 01.07., 08.07., 19.08., 26.08.2028)' },
  ];
}
