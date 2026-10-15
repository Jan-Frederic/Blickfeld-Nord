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
  // eigenes Symbol (Trommel, Kaffeetasse, Instagram, Noten, Bierkrug, Flamme, Gruppe, Fußball), sonst ein allgemeines Link-Symbol
  icon?: 'drum' | 'cafe' | 'instagram' | 'choir' | 'pub' | 'fire' | 'community' | 'football';
}

export interface HistoryLink {
  type: 'instagram' | 'web' | 'place';
  label: string;
  url: string;
}

export interface HistoryEntry {
  date: string;
  title: string;
  text: string[];
  images?: { src: string; alt: string }[];
  links?: HistoryLink[];
  // Instagram-Reel-Kennung aus der URL (instagram.com/reel/<id>/), wird per Zwei-Klick-Lösung eingebettet
  reel?: string;
  // markiert erfundene Beispiel-Einträge sichtbar auf der Seite
  example?: boolean;
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
  // optional: Beginn als 'HH:MM' (Ortszeit); ohne Uhrzeit ganztägig
  time?: string;
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

  // Historie (/historie), neueste Einträge zuerst
  readonly history: HistoryEntry[] = [
    {
      date: '2026-09-05',
      title: 'Nachbarschaftsfest bei Matthias',
      text: [
        'Die kürzeste Anreise des Jahres hatte eindeutig Matthias: Am 5. September haben wir auf dem Nachbarschaftsfest in seiner Straße gespielt – Heimspiel im wahrsten Sinne des Wortes, quasi mit Blick auf die eigene Haustür.',
        'Ein Pavillon, lila Licht, ein bisschen Nebel und jede Menge gut gelaunter Nachbarn: Mehr braucht es nicht für einen richtig schönen Abend. Zwischen Grill, Getränken und Gesprächen über den Gartenzaun hinweg wurde mitgesungen, getanzt und gefeiert.',
        'Danke an Matthias’ Nachbarschaft für die Einladung und die tolle Stimmung. Wer solche Nachbarn hat, braucht eigentlich keine Konzerthalle mehr!',
      ],
      images: [
        {
          src: 'historie/2026-09-05-nachbarschaftsfest.webp',
          alt: 'Blickfeld Nord beim Nachbarschaftsfest im Pavillon unter lila Licht: David mit Akustikgitarre, Matthias am Schlagzeug und Fred am Bass',
        },
      ],
    },
    {
      date: '2026-08-22',
      title: 'Legendärer Abend im Gasthof Küpper – mit Joker Mark',
      text: [
        'Manche Abende sind gut, manche werden legendär. Der 22. August im Gasthof Küpper gehört eindeutig zur zweiten Sorte: Kneipe in Feierlaune, Gäste mit Textsicherheit und ein Abend, der eigentlich gar nicht aufhören wollte.',
        'Dabei hatte das Schicksal vorher noch versucht, uns aus dem Takt zu bringen: Matthias hat sich das Sprunggelenk gebrochen und wurde frisch verschraubt. Wir haben dabei gelernt: Ein Schlagzeug braucht Schrauben – ein Schlagzeuger eigentlich nicht. Statt Fußmaschine hieß es für ihn also erst einmal: Fuß hoch.',
        'Zum Glück gibt es Freunde wie Mark. Unser Musiker-Kollege ist ohne zu zögern eingesprungen und hat gespielt, als wäre er schon immer dabei gewesen. Danke, Mark – du hast was gut bei uns! Und Matthias: Gute Besserung, die Sticks warten schon.',
        'Danke an das Küpper-Team und an alle, die mitgefeiert haben. Einen kleinen Eindruck gibt es im Reel.',
      ],
      reel: 'DcWl7qDO7gp',
      links: [
        { type: 'instagram', label: 'Reel auf Instagram', url: 'https://www.instagram.com/reel/DcWl7qDO7gp/' },
        { type: 'web', label: 'gasthof-kuepper.de', url: 'https://www.gasthof-kuepper.de/' },
      ],
    },
    {
      date: '2026-04-30',
      title: 'Heimspiel im Café Lotti – mit Pro Campesinos',
      text: [
        'Es gibt Auftritte – und es gibt Heimspiele. Am 30. April waren wir bei unserer Home-Base, dem Café Lotti in Dingden, und diesmal nicht allein: Gemeinsam mit dem Dingdener Chor Pro Campesinos haben wir den Abend gestaltet.',
        'Draußen vor der Backsteinmauer, unter lila Scheinwerfern, trafen Gitarre, Bass und Schlagzeug auf einen ganzen Chor voller Stimmen. Für Matthias und Fred war es sogar ein doppeltes Heimspiel – beide unterstützen Pro Campesinos sonst selbst am Bass.',
        'Danke an das Lotti-Team für die Gastfreundschaft, an Pro Campesinos für das gemeinsame Musizieren und an alle, die mit uns gesungen, getanzt und gefeiert haben. Bis zum nächsten Mal!',
      ],
      images: [
        {
          src: 'historie/2026-04-30-cafe-lotti.webp',
          alt: 'Blickfeld Nord live im Café Lotti: David mit Akustikgitarre, Matthias am Schlagzeug und Fred am Bass unter lila Scheinwerfern',
        },
      ],
      links: [
        { type: 'web', label: 'cafelotti.de', url: 'https://cafelotti.de/' },
        { type: 'web', label: 'pro-campesinos.de', url: 'https://www.pro-campesinos.de/' },
        { type: 'place', label: 'Café Lotti, Dingden', url: 'https://www.google.com/maps/search/?api=1&query=Caf%C3%A9%20Lotti%2C%20Dingden%2C%20Hamminkeln%2C%20NRW' },
      ],
    },
    {
      date: '2026-01-16',
      title: 'Gemütlicher Abend mit den Bokeltsen Blagen',
      text: [
        'Mitte Januar, draußen kalt und dunkel – drinnen warm, gemütlich und voller netter Leute: Am 16. Januar durften wir den Abend des Lauftreffs Bokeltsen Blagen musikalisch untermalen.',
        'Akustikgitarre, Bass, Schlagzeug und zwischendurch ein Shaker – genau die richtige Mischung, damit sich die Gespräche nicht übertönt, sondern begleitet fühlen. Wer sonst Kilometer sammelt, darf zwischendurch auch mal einfach sitzen bleiben und zuhören.',
        'Danke an die Bokeltsen Blagen für die Einladung und den schönen Abend. Wir laufen zwar nicht mit – na gut, bis auf David, der sich tatsächlich schon mal frühmorgens mit dem Lauftreff auf die Strecke macht. Für die Musik sind wir aber alle drei jederzeit wieder am Start!',
      ],
      images: [
        {
          src: 'historie/2026-01-16-bokeltsen-blagen.webp',
          alt: 'Blickfeld Nord beim Lauftreff Bokeltsen Blagen: David mit Akustikgitarre, Matthias am Schlagzeug mit Shaker und Fred am Bass, im Hintergrund feiernde Gäste',
        },
      ],
      links: [{ type: 'web', label: 'bokeltsen-blagen.de', url: 'https://www.bokeltsen-blagen.de/' }],
    },
    {
      date: '2025-10-02',
      title: 'Der Anfang als Trio – im Café Lotti',
      text: [
        'Jede Geschichte hat einen Anfang – unsere als Trio beginnt am 2. Oktober 2025 im Café Lotti. Mit Fred am Bass wurde aus dem Duo eine Dreier-Kombo, und wo ginge so ein erster Abend besser als bei unserer Home-Base?',
        'Rotes Licht auf der Backsteinwand, eine Feuerschale in der Mitte, Decken auf den Knien und ein Publikum, das sich vom frischen Oktoberabend nicht im Geringsten abschrecken ließ. Gitarre, Schlagzeug und zum ersten Mal Bass – es hat sich vom ersten Song an richtig angefühlt.',
        'Danke an alle, die an diesem Abend dabei waren und uns mit so viel Wärme empfangen haben – nicht nur wegen des Feuers. Hier hat alles angefangen.',
      ],
      images: [
        {
          src: 'historie/2025-10-02-cafe-lotti.webp',
          alt: 'Blickfeld Nord zum ersten Mal als Trio im Café Lotti: Gitarre, Schlagzeug und Bass unter rotem Licht, davor Gäste mit Decken um eine Feuerschale',
        },
      ],
      links: [
        { type: 'web', label: 'cafelotti.de', url: 'https://cafelotti.de/' },
        { type: 'place', label: 'Café Lotti, Dingden', url: 'https://www.google.com/maps/search/?api=1&query=Caf%C3%A9%20Lotti%2C%20Dingden%2C%20Hamminkeln%2C%20NRW' },
      ],
    },
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
    {
      name: 'F.C. Grün Weiß Lankern 1975 e.V.',
      description: 'Der Familienverein – hier wird Gemeinschaft gelebt und Zusammenhalt zwischen Jung & Alt großgeschrieben. Grün-weißer Herzensverein unseres Gitarristen.',
      url: 'https://lankern.de/',
      icon: 'football',
    },
  ];

  // Neue Fotos nach public/galerie/ legen (Original + verkleinerte -thumb-Version) und hier eintragen
  readonly photos: Photo[] = [
    { src: 'historie/2026-04-30-cafe-lotti.webp', thumb: 'galerie/live-cafe-lotti-thumb.webp', alt: 'Blickfeld Nord live im Café Lotti unter lila Scheinwerfern – Akustikgitarre, Schlagzeug und Bass', caption: 'Live im Café Lotti, 30.04.2026' },
    { src: 'historie/2026-09-05-nachbarschaftsfest.webp', thumb: 'galerie/live-nachbarschaftsfest-thumb.webp', alt: 'Blickfeld Nord beim Nachbarschaftsfest im Pavillon unter lila Licht – Akustikgitarre, Schlagzeug und Bass', caption: 'Nachbarschaftsfest, 05.09.2026' },
    { src: 'historie/2026-01-16-bokeltsen-blagen.webp', thumb: 'galerie/live-bokeltsen-blagen-thumb.webp', alt: 'Blickfeld Nord beim Lauftreff Bokeltsen Blagen – Akustikgitarre, Schlagzeug und Bass', caption: 'Bei den Bokeltsen Blagen, 16.01.2026' },
    { src: 'historie/2025-10-02-cafe-lotti.webp', thumb: 'galerie/live-cafe-lotti-2025-thumb.webp', alt: 'Erster Auftritt als Trio im Café Lotti unter rotem Licht, Gäste um eine Feuerschale', caption: 'Erster Auftritt als Trio, Café Lotti, 02.10.2025' },
    { src: 'galerie/band-2.webp', thumb: 'galerie/band-2-thumb.webp', alt: 'Die drei Musiker von Blickfeld Nord lachen gut gelaunt vor Backsteinwand, Gitarren und Schlagzeug', caption: 'Blickfeld Nord' },
    { src: 'galerie/band-1.webp', thumb: 'galerie/band-1-thumb.webp', alt: 'Die drei Musiker von Blickfeld Nord knien lachend zwischen Mikrofonständern und Schlagzeug', caption: 'Blickfeld Nord' },
    { src: 'hero.webp', thumb: 'galerie/logo-thumb.webp', alt: 'Blickfeld-Nord-Logo mit Kompass über einem nebligen See', caption: 'Blickfeld Nord' },
    { src: 'galerie/platzhalter-1.webp', thumb: 'galerie/platzhalter-1-thumb.webp', alt: 'Platzhalter – Foto folgt' },
    { src: 'galerie/platzhalter-2.webp', thumb: 'galerie/platzhalter-2-thumb.webp', alt: 'Platzhalter – Foto folgt' },
  ];

  // Alle Auftritte; öffentlich gelistet werden nur nicht-private UND geklärte (siehe publicShows)
  readonly shows: Show[] = [
    { date: '2026-12-04', time: '18:00', city: 'Rhede', venue: 'Weihnachtsmarkt', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Rhede%2C%20NRW', confirmed: true },
    { date: '2027-04-03', time: '18:00', city: 'Rhede', venue: 'Latöchte', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Lat%C3%B6chte%2C%20Rhede%2C%20NRW', confirmed: true },
    { date: '2027-04-30', time: '18:00', city: 'Hamminkeln-Dingden', venue: 'Café Lotti – Tanz in den Mai', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Caf%C3%A9%20Lotti%2C%20Dingden%2C%20Hamminkeln%2C%20NRW', confirmed: true },
    { date: '2027-05-02', time: '10:00', city: 'Hamminkeln-Dingden', venue: 'Queens Pub', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Queens%20Pub%2C%20Dingden%2C%20Hamminkeln%2C%20NRW', confirmed: true },
    { date: '2027-05-07', venue: 'Scheperswiese', private: true, confirmed: false },
    { date: '2027-06-12', venue: 'Ronny S.', private: true, confirmed: true },
    { date: '2027-08-29', city: 'Rhede', venue: 'Kirmes Rhede', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Rhede%2C%20NRW', confirmed: false },
    { date: '2027-09-03', endDate: '2027-09-05', venue: 'Bandwochenende', private: true, confirmed: false },
    { date: '2028-06-24', venue: 'Wolfgang S. 61', private: true, confirmed: false, comment: 'Option – einer von fünf möglichen Terminen (24.06., 01.07., 08.07., 19.08., 26.08.2028)' },
    { date: '2028-07-01', venue: 'Wolfgang S. 61', private: true, confirmed: false, comment: 'Option – einer von fünf möglichen Terminen (24.06., 01.07., 08.07., 19.08., 26.08.2028)' },
    { date: '2028-07-08', venue: 'Wolfgang S. 61', private: true, confirmed: false, comment: 'Option – einer von fünf möglichen Terminen (24.06., 01.07., 08.07., 19.08., 26.08.2028)' },
    { date: '2028-08-19', venue: 'Wolfgang S. 61', private: true, confirmed: false, comment: '⭐ Favorit unter den Optionen – einer von fünf möglichen Terminen (24.06., 01.07., 08.07., 19.08., 26.08.2028)' },
    { date: '2028-08-26', venue: 'Wolfgang S. 61', private: true, confirmed: false, comment: 'Option – einer von fünf möglichen Terminen (24.06., 01.07., 08.07., 19.08., 26.08.2028)' },
  ];
}
