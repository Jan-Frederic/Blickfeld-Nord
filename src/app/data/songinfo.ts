// Tonart und Tempo der Songs – nur für die Band (Setlist, Bühnen-Modus, Laufzettel im Backstage).
// Das Repertoire selbst kommt automatisch von Spotify (repertoire.json); Tonart und Tempo liefert Spotify nicht,
// deshalb stehen sie hier. Titel und Interpret müssen genau wie im Repertoire geschrieben sein.
//
// Beispiel: { title: '80 Millionen', artist: 'Max Giesinger', tonart: 'C', spielTonart: 'D', capo: 2, bpm: 120 },
// tonart: Dur als Großbuchstabe (C, F#, Bb), Moll mit kleinem m (Am, C#m); bpm: Schläge pro Minute; takt: nur wenn
// nicht 4/4, z. B. '3/4' oder '6/8' (bpm zählt dann die punktierte Viertel);
// tonart ist die Originalaufnahme, spielTonart/capo die Band-Version (nur eintragen, wenn sie abweicht)
export interface SongInfo {
  title: string;
  artist: string;
  /** Tonart der Originalaufnahme */
  tonart?: string;
  /** Tonart, in der die Band den Song spielt – nur wenn sie vom Original abweicht */
  spielTonart?: string;
  /** Capo-Bund der Gitarre in der Band-Version */
  capo?: number;
  bpm?: number;
  /** Taktart, z. B. '3/4' oder '6/8' – ohne Angabe 4/4 (data/takt.ts: Einzählen und Betonung im Klick) */
  takt?: string;
  /** kurzer Hinweis für die Bühne, z. B. „Intro nur Gitarre“ */
  notiz?: string;
  /** von der Band am Instrument geprüft bzw. selbst eingetragen (Backstage → Songs) */
  geprueft?: boolean;
  /** woher Tonart und Tempo stammen (Recherche) – erscheint unter Backstage → Songs */
  quelle?: string;
}

// Recherchiert im Oktober 2026: Tonart und Tempo der Originalaufnahme (Notenausgaben, Karaoke-Tracks, Akkord-Seiten,
// Analyse-Datenbanken) – nur, wo die Quellen zusammenpassen; Unsicheres bleibt leer, die Quelle steht in „quelle“.
// Ende Oktober 2026 ergänzt für alle Spotify-Listen (Setlist, Probe, Repertoire, Wunschliste, Archiv): „Spotify-Analyse“
// heißt automatisch ermittelte Werte (Tunebat, Songbpm, Musicstax, GetSongBPM – alle auf Basis der Spotify-Aufnahme).
// Doppelt gezähltes Tempo ist auf das gefühlte Tempo halbiert (steht in der Quelle). Analysen verwechseln manchmal Dur
// und parallele Moll-Tonart – vor dem Auftritt kurz am Instrument prüfen.
// Spielt die Band einen Song anders, unter Backstage → Songs „wir spielen in“, Capo bzw. Tempo eintragen.
export const SONGINFO: SongInfo[] = [
  { title: '1/2 Lovesong', artist: 'Die Ärzte', tonart: 'Em', bpm: 105, quelle: 'Akkorde Ultimate Guitar (Em C G D, ohne Capo); Tempo: Tunebat/Songbpm 105 (Tonart dort uneinig Em/G)' },
  { title: '7 Stunden', artist: 'Alexander Eder', tonart: 'B', bpm: 120, quelle: 'Spotify-Analyse: Tunebat/Songbpm/Musicstax B, 120' },
  { title: '80 Millionen', artist: 'Max Giesinger', tonart: 'C', bpm: 115, quelle: 'Akkorde guitartabsexplorer (Originaltonart C); Tempo: Tunebat/Musicstax 115 (Analyse dort A statt C – Akkordseite prüfen)' },
  { title: 'A Horse with No Name', artist: 'America, George Martin', bpm: 123, quelle: 'Spotify-Analyse: Tunebat 123 (Tonart Bm laut Analyse, Remaster D – uneinig, gespielt Em/D)' },
  { title: 'All The Small Things', artist: 'blink-182', tonart: 'C', bpm: 148, quelle: 'AcousticBrainz C; Mixmeister/AcousticBrainz 148' },
  { title: 'Angels', artist: 'Robbie Williams', tonart: 'E', bpm: 76, quelle: 'Musicnotes 76; Analyse E' },
  { title: 'Another Day in Paradise - 2016 Remaster', artist: 'Phil Collins', tonart: 'D#m', bpm: 102, quelle: 'Spotify-Analyse: Tunebat/Songbpm D#m (= Ebm), 102' },
  { title: 'Aufstehn! - feat. CeeLo Green', artist: 'Seeed, CeeLo Green', tonart: 'F#', bpm: 127, quelle: 'Spotify-Analyse: Tunebat/Songbpm/Musicstax F#, 127' },
  { title: 'Banana Pancakes', artist: 'Jack Johnson', tonart: 'G', bpm: 115, quelle: 'Spotify-Analyse: Tunebat/Musicstax G, 115 (Songbpm 114, GetSongBPM 117)' },
  { title: 'Below My Feet', artist: 'Mumford & Sons', tonart: 'B', bpm: 129, quelle: 'Spotify-Analyse: Tunebat/Musicstax B, 129–130' },
  { title: 'Better Together', artist: 'Jack Johnson', tonart: 'F', bpm: 110, quelle: 'Spotify-Analyse: Tunebat/Musicstax F, 110' },
  { title: 'Blackbird', artist: 'Shake Shake Go', tonart: 'A', bpm: 115, quelle: 'Spotify-Analyse: Tunebat A, 115 (nur eine Quelle)' },
  { title: "Blowin' in the Wind", artist: 'Bob Dylan', tonart: 'D', bpm: 89, quelle: 'Karaoke-Version (Originaltonart D, 89); Dylan mit Capo 7' },
  { title: 'Break The Night With Colour', artist: 'Richard Ashcroft', tonart: 'C', bpm: 80, quelle: 'Spotify-Analyse: Tunebat/Musicstax C, 80' },
  { title: "Breakfast At Tiffany's", artist: 'Deep Blue Something', tonart: 'D', bpm: 110, quelle: 'Mixmeister D, 110,5' },
  { title: 'Bruttosozialprodukt', artist: 'Geier Sturzflug', tonart: 'D', bpm: 166, quelle: 'Spotify-Analyse: Tunebat/Musicstax/Songbpm D, 166' },
  { title: 'Brüder', artist: 'Adel Tawil', tonart: 'F#', bpm: 91, quelle: 'Spotify-Analyse: Tunebat-Empfehlungslisten F#, 91 (keine eigene Seite)' },
  { title: 'Canada', artist: 'Milow', tonart: 'F', bpm: 169, quelle: 'Spotify-Analyse: Musicstax/Tunebat-Liste F, 169 (evtl. halb: 85)' },
  { title: 'Canción del Mariachi (Ilia Topuria "El Matador" Anthem)', artist: 'Antonio Banderas, Los Lobos', bpm: 127, quelle: 'Spotify-Analyse: Songbpm/Tunebat 127; Tonart uneinig (Em / Am)' },
  { title: 'Chasing Cars', artist: 'Snow Patrol', tonart: 'A', bpm: 104, quelle: 'Tunebat/Chordu A, 104' },
  { title: 'Christmas Time', artist: 'Bryan Adams', tonart: 'C', bpm: 77, quelle: 'Spotify-Analyse: Songbpm 77, Musicstax/Tunebat C, 77' },
  { title: 'Chöre', artist: 'Mark Forster', tonart: 'F#m', bpm: 130, quelle: 'Spotify-Analyse: Tunebat/Musicstax F#m, 130' },
  { title: 'Colorblind', artist: 'Counting Crows', tonart: 'F', bpm: 108, quelle: 'Spotify-Analyse: Tunebat/Songbpm F, 108' },
  { title: 'Come Together - Remastered 2009', artist: 'The Beatles', tonart: 'Am', bpm: 83, quelle: 'Spotify-Analyse: Tunebat/Songbpm Am; 165 = doppelt gezählt → 83 (Songbpm halb)' },
  { title: 'Die schönsten Fehler', artist: 'Alexander Eder', tonart: 'F', bpm: 128, quelle: 'Spotify-Analyse: Tunebat-Empfehlungsliste F, 128 (unsicher)' },
  { title: 'Drive', artist: 'Incubus', tonart: 'Em', bpm: 90, quelle: 'Musicnotes Originaltonart Em, ~90; Audiokeychain 91' },
  { title: 'Driving Home for Christmas', artist: 'Chris Rea', tonart: 'A', bpm: 90, quelle: 'Spotify-Analyse: Musicstax/Tunebat A, 180 = doppelt gezählt → 90' },
  { title: 'Drops of Jupiter (Tell Me)', artist: 'Train', tonart: 'C', bpm: 79, quelle: 'Spotify-Analyse: Tunebat/Musicstax/Songbpm C, 79' },
  { title: 'Dust in the Wind', artist: 'Kansas', tonart: 'G', bpm: 94, quelle: 'Spotify-Analyse: Tunebat/Musicstax G, 94 zur Spotify-Fassung (Songbpm: Am)' },
  { title: 'Ein Kompliment', artist: 'Sportfreunde Stiller', tonart: 'Em', bpm: 80, quelle: 'Spotify-Analyse: Tunebat/Songbpm/Musicstax Em, 80 (Doppelzeit 160)' },
  { title: 'Fading into Life', artist: 'Takida', tonart: 'Bb', bpm: 137, quelle: 'Spotify-Analyse: Tunebat Bb, 137 zur Spotify-Fassung – nur eine Quelle' },
  { title: 'Father And Son', artist: 'Yusuf / Cat Stevens', tonart: 'G', bpm: 136, quelle: 'Mixmeister G; Spotify-Analyse: Tunebat/Songbpm/Musicstax G, 136 (GetSongBPM 67 = halbes Tempo)' },
  { title: 'Fields Of Gold', artist: 'Sting', tonart: 'D', bpm: 104, quelle: 'Spotify-Analyse: Tunebat/Musicstax D, 104' },
  { title: 'Fly Away', artist: 'Lenny Kravitz', tonart: 'G', bpm: 160, quelle: 'Spotify-Analyse: Tunebat/Musicstax G, 160' },
  { title: 'Forever Young', artist: 'Alphaville', tonart: 'Am', bpm: 137, quelle: 'Spotify-Analyse: Tunebat/Songbpm Am, 137' },
  { title: "Free Fallin'", artist: 'Tom Petty', tonart: 'F', bpm: 84, quelle: 'Spotify-Analyse: Tunebat/Songbpm F, 84' },
  { title: 'Good Riddance (Time of Your Life)', artist: 'Green Day', tonart: 'G', bpm: 95, quelle: 'Karaoke-Version G, 95; Mixmeister 94,7' },
  { title: 'Grosse Freiheit - MTV Unplugged', artist: 'Unheilig', tonart: 'F', bpm: 132, quelle: 'Spotify-Analyse: Tunebat-Empfehlungslisten F, 132 (keine eigene Seite)' },
  { title: 'Gutes Gefühl', artist: 'Fargo', tonart: 'B', bpm: 128, quelle: 'Spotify-Analyse: Songbpm B, 128 (nur eine Quelle)' },
  { title: 'Hallelujah', artist: 'Leonard Cohen', tonart: 'C', bpm: 57, takt: '6/8', quelle: 'Musicnotes Signature Artist C; Tempo: Musicstax 171 im 3er-Takt zur Spotify-Fassung, also ca. 57 Takte je Minute (ein Schlag je Takt) – am Instrument prüfen; Takt 6/8 (Musicnotes, Sony/ATV) – punktierte Viertel = 57' },
  { title: 'Happy Xmas (War Is Over) - Remastered 2010', artist: 'John Lennon, Yoko Ono', tonart: 'D', bpm: 49, takt: '12/8', quelle: 'Spotify-Analyse: Tunebat/Songbpm/Musicstax D, 146 Achtel (3er-Takt) zur Spotify-Fassung; Takt 12/8 laut Musicnotes (Klavier/Gesang, punktierte Viertel = 49, dort A-Dur) – Grundschlag 146 ÷ 3 ≈ 49' },
  { title: 'Hear You Me', artist: 'Jimmy Eat World', tonart: 'E', bpm: 136, takt: '3/4', quelle: 'Spotify-Analyse: Tunebat/Musicstax E, 136 (3/4-Takt); 3/4 auch laut Tabs (chords-and-tabs.net)' },
  { title: 'Heaven - MTV Unplugged Version', artist: 'Bryan Adams', tonart: 'C', bpm: 65, quelle: 'AcousticBrainz C (automatisch); Tempo unsicher; Tempo: Tunebat/Musicstax 130 = doppelt gezählt → 65 (C bestätigt)' },
  { title: 'Heimat', artist: 'Johannes Oerding', tonart: 'Bb', bpm: 139, quelle: 'Spotify-Analyse: Tunebat Bb, Musicstax A#; 139' },
  { title: 'Heimathafen', artist: 'Thomas Godoj', bpm: 172, quelle: 'Spotify-Analyse: GetSongBPM 172; Tonart nicht gefunden' },
  { title: 'Here I Am', artist: 'Bryan Adams', tonart: 'Ab', quelle: 'Spotify-Analyse: Tunebat/Songbpm Ab; Tempo je Fassung 107 bzw. 99 – welche auf Spotify, ist nicht eindeutig' },
  { title: 'Hey Jude', artist: 'The Beatles', tonart: 'F', bpm: 74, quelle: 'Ukutabs Originaltonart F, ~74; Musicnotes 75' },
  { title: 'Hopeless Wanderer', artist: 'Mumford & Sons', tonart: 'Gm', bpm: 81, quelle: 'Spotify-Analyse: Tunebat/Musicstax Gm, 81' },
  { title: 'Hymn', artist: 'Barclay James Harvest', tonart: 'E', quelle: 'Spotify-Analyse: Tunebat/Songbpm E; Tempo uneinig (65 / 138)' },
  { title: 'I Came for You', artist: "Manfred Mann's Earth Band, The Disco Boys", bpm: 128, quelle: 'Spotify-Analyse: Songbpm/GetSongBPM 127–128; Tonart je Fassung F oder C' },
  { title: 'I Like To Move It', artist: 'will.i.am', tonart: 'Gm', bpm: 127, quelle: 'Spotify-Analyse: Tunebat/Musicstax/Songbpm Gm, 127' },
  { title: 'I See Fire', artist: 'Ed Sheeran', tonart: 'A#m', bpm: 76, quelle: 'Spotify-Analyse: Tunebat/Musicstax A#m (= Bbm); Songbpm/Musicstax 76 (Tunebat 152 doppelt)' },
  { title: 'I Wanna Rock', artist: 'Twisted Sister', tonart: 'D', bpm: 106, quelle: 'Spotify-Analyse: Tunebat/Songbpm/Musicstax D, 106' },
  { title: "I Won't Give Up", artist: 'Jason Mraz', tonart: 'E', bpm: 133, quelle: 'Spotify-Analyse: Tunebat/Songbpm/Musicstax E, 133 (3/4-Takt)' },
  { title: "I'm In a Hurry", artist: 'Kaleb Austin', tonart: 'Ab', bpm: 129, quelle: 'Spotify-Analyse: Tunebat Ab, 129' },
  { title: "I'm Yours", artist: 'Jason Mraz', tonart: 'B', bpm: 76, quelle: 'Spotify-Analyse: Tunebat/Musicstax B, 151 = doppelt gezählt (Shuffle) → 76' },
  { title: 'Ich komm nach Haus (Wenn das Jahr zu Ende geht) (aus "Sing meinen Song - die Weihnachtsparty, Vol. 6")', artist: 'Johannes Oerding', tonart: 'Ab', bpm: 80, quelle: 'Spotify-Analyse: Musicstax G#/Ab, 80 zur Spotify-Fassung – nur eine Quelle' },
  { title: 'Ich wollte nie erwachsen sein (Nessajas Lied) - aus "Tabaluga & Lilli" - Live', artist: 'Peter Maffay', tonart: 'A', bpm: 84, quelle: 'Spotify-Analyse: Tunebat/Songbpm A, 84' },
  { title: 'If Tomorrow Never Comes', artist: 'Ronan Keating', tonart: 'Bb', bpm: 79, quelle: 'Karaoke-Version Bb; Chordu 79' },
  { title: 'Ihr da oben', artist: 'Broilers', tonart: 'G#m', bpm: 155, quelle: 'Spotify-Analyse: Tunebat/Musicstax G#m, 155' },
  { title: 'Im Wagen vor mir', artist: 'Henry Valentino, Uschi', tonart: 'D', bpm: 92, quelle: 'Spotify-Analyse: Tunebat D, 92' },
  { title: 'In der Weihnachtsbäckerei', artist: 'Rolf Zuckowski', tonart: 'C', bpm: 146, quelle: 'Spotify-Analyse: Tunebat C, 146; Musicstax/Songbpm 147' },
  { title: 'Indigo Girl', artist: 'Watershed', tonart: 'Eb', bpm: 114, quelle: 'Spotify-Analyse: Songbpm/Musicstax D#/Eb, 114' },
  { title: 'Into The Great Wide Open', artist: 'Tom Petty and the Heartbreakers', tonart: 'Em', bpm: 82, quelle: 'Spotify-Analyse: Tunebat/Musicstax Em, 82' },
  { title: 'Iris', artist: 'The Goo Goo Dolls', tonart: 'D', bpm: 155, quelle: 'Musicnotes/Karaoke-Version Original D; 153–156; Takt wechselt: Intro und Zwischenspiele 4/4, Strophe und Refrain 6/8 (Wikipedia) – eingezählt wird das Intro (4/4)' },
  { title: "It's Beginning to Look a Lot like Christmas", artist: 'Michael Bublé', tonart: 'E', bpm: 95, quelle: 'Spotify-Analyse: Tunebat/Musicstax E, 95 (GetSongBPM 93)' },
  { title: "It's My Life - 2003 Acoustic Version", artist: 'Bon Jovi', tonart: 'Am', bpm: 115, quelle: 'Spotify-Analyse: Songbpm Am, 115 (nur eine Quelle)' },
  { title: 'Junimond', artist: 'Echt', tonart: 'F#', bpm: 83, quelle: 'Spotify-Analyse: Tunebat F#, 83' },
  { title: 'Kids', artist: 'Robbie Williams, Kylie Minogue', tonart: 'D', bpm: 92, quelle: 'Spotify-Analyse: Songbpm/Musicstax D, 92 (Tunebat 185 doppelt)' },
  { title: 'Kleine Kinder, große Kinder (Das Adventskalenderlied)', artist: 'Rolf Zuckowski', tonart: 'A', bpm: 99, quelle: 'Spotify-Analyse: GetSongBPM 99, Tunebat A 100' },
  { title: "Knockin' On Heaven's Door", artist: 'Bob Dylan', tonart: 'G', bpm: 70, quelle: 'Musicnotes G; Noten ~70 (Analysen 140 = doppelt gezählt)' },
  { title: 'Kreise', artist: 'Johannes Oerding', tonart: 'D', bpm: 138, quelle: 'Spotify-Analyse: Tunebat/Songbpm D, 138 (GetSongBPM 137)' },
  { title: 'Lady In Black', artist: 'Uriah Heep', tonart: 'G', bpm: 87, quelle: 'Spotify-Analyse: Tunebat/Songbpm G, 87 zur Spotify-Fassung (Celebration 2009); Audiokeychain 87 – das Original von 1971 (Remaster 2016) steht in Am' },
  { title: 'Land unter', artist: 'Herbert Grönemeyer', tonart: 'D', bpm: 165, quelle: 'Spotify-Analyse: Tunebat/Musicstax D, 165 (Remaster 2016, gleiche Länge wie die Spotify-Fassung)' },
  { title: 'Lass mich nie mehr los - Studio Version', artist: 'Sportfreunde Stiller', tonart: 'A', bpm: 118, quelle: 'Spotify-Analyse: Tunebat/Songbpm A, 118' },
  { title: 'Last Christmas', artist: 'Wham!', tonart: 'D', bpm: 108, quelle: 'Spotify-Analyse: Songbpm/Tunebat D, 108' },
  { title: 'Learning To Fly', artist: 'Tom Petty and the Heartbreakers', tonart: 'C', bpm: 117, quelle: 'Spotify-Analyse: Tunebat/Songbpm/Musicstax C, 117' },
  { title: 'Lemon Tree', artist: 'Fools Garden', tonart: 'Fm', bpm: 143, quelle: 'Musicnotes Fm, AppsNemo Em+Capo 1; 143–145' },
  { title: 'Let It Be - Remastered 2009', artist: 'The Beatles', tonart: 'C', bpm: 72, quelle: 'Musicnotes Originaltonart C, ~72' },
  { title: 'Let It Go', artist: 'Peyton Parrish', tonart: 'C', bpm: 137, quelle: 'Spotify-Analyse: Songbpm C, 137' },
  { title: 'Love Somebody', artist: 'Rick Springfield', tonart: 'E', bpm: 139, quelle: 'Spotify-Analyse: Songbpm/Musicstax-Liste E (Musicstax-Seite A), 139' },
  { title: 'Lucky Man', artist: 'The Verve', tonart: 'D', bpm: 76, quelle: 'Spotify-Analyse: Tunebat/Musicstax D, 76' },
  { title: "Mary Jane's Last Dance", artist: 'Tom Petty and the Heartbreakers', bpm: 170, quelle: 'Spotify-Analyse: Songbpm/Musicstax 170; Tonart uneinig (Bb / Gm / D)' },
  { title: 'Mein Herz bleibt hier', artist: 'Madsen', tonart: 'Gm', bpm: 117, quelle: 'Spotify-Analyse: Tunebat Gm, 117 (nur eine Quelle)' },
  { title: 'Mitten in der Nacht', artist: 'Rolf Zuckowski', bpm: 70, quelle: 'Spotify-Analyse: Musicstax/Tunebat 70; Tonart nicht gefunden' },
  { title: 'MMMBop 2.0', artist: 'Busted, Hanson', tonart: 'E', bpm: 105, quelle: 'Spotify-Analyse: Songbpm/Tunebat E, 105' },
  { title: 'More Than Words', artist: 'Extreme', tonart: 'F#', bpm: 92, quelle: 'Spotify-Analyse: Tunebat/Songbpm/Musicstax F#, 92' },
  { title: 'Morgen', artist: 'Johannes Oerding', tonart: 'D', bpm: 96, quelle: 'Spotify-Analyse: Tunebat-Empfehlungsliste D, 96 (keine eigene Seite)' },
  { title: 'Mr. Brightside', artist: 'The Killers', tonart: 'C#', bpm: 148, quelle: 'Spotify-Analyse: Tunebat/Musicstax C# (= Db), 148' },
  { title: 'Mr. Jones', artist: 'Counting Crows', tonart: 'C', bpm: 142, quelle: 'Spotify-Analyse: Tunebat/Musicstax C, 142' },
  { title: 'Mr. Red White and Blue - Rock Version', artist: 'Coffey Anderson, Drew Jacobs', tonart: 'G', bpm: 156, quelle: 'Spotify-Analyse: Musicstax G, 156 (Tunebat-Liste C)' },
  { title: 'Musik', artist: 'KAYEF', tonart: 'F#m', bpm: 152, quelle: 'Spotify-Analyse: Tunebat/Songbpm/Musicstax F#m, 152 (halb 76)' },
  { title: 'Nachtbaden', artist: 'Madsen', tonart: 'G', bpm: 154, quelle: 'Spotify-Analyse: Songbpm/Tunebat G, 154 zur Spotify-Fassung' },
  { title: 'Naive', artist: 'The Kooks', tonart: 'G#m', bpm: 103, quelle: 'Spotify-Analyse: Tunebat/Musicstax G#m, 103 (Remaster-Analyse B = Parallele)' },
  { title: 'Nur nach vorne gehen', artist: 'Broilers', tonart: 'Bb', bpm: 140, quelle: 'Spotify-Analyse: Musicstax A#, Tunebat 6B; 140' },
  { title: 'Ooh La', artist: 'The Kooks', tonart: 'A#m', bpm: 151, quelle: 'Spotify-Analyse: Tunebat/Songbpm A#m (= Bbm), Songbpm/Musicstax 151' },
  { title: 'Over My Shoulder', artist: 'Mike + The Mechanics', tonart: 'Fm', bpm: 92, quelle: 'Spotify-Analyse: Tunebat/Musicstax Fm, 92' },
  { title: 'Perfect', artist: 'Ed Sheeran', tonart: 'Ab', bpm: 63, takt: '12/8', quelle: 'Musicnotes Ab, 12/8 mit punktierter Viertel = 63' },
  { title: 'Plötzlich perfekt', artist: 'Johannes Oerding', tonart: 'E', bpm: 95, quelle: 'Akkorde Ultimate Guitar (Key E, ohne Capo); Tempo: Musicstax 95, GetSongBPM 94 (Analyse dort A statt E)' },
  { title: 'Quit Playing Games (With My Heart)', artist: 'Backstreet Boys', tonart: 'Bm', bpm: 100, quelle: 'Spotify-Analyse: Tunebat/Songbpm/Musicstax Bm, 100' },
  { title: 'Radio Nowhere', artist: 'Bruce Springsteen', tonart: 'A', bpm: 140, quelle: 'Spotify-Analyse: Tunebat/Songbpm A, 140' },
  { title: 'Radio Orchid', artist: 'Fury In The Slaughterhouse', tonart: 'Am', bpm: 170, quelle: 'Spotify-Analyse: Tunebat/Musicstax Am, 170 (evtl. halb: 85)' },
  { title: "Rockin' Around The Christmas Tree", artist: 'Brenda Lee', tonart: 'Ab', bpm: 67, quelle: 'Spotify-Analyse: Tunebat Ab, Musicstax G#; 67 (Shuffle, doppelt 134)' },
  { title: 'Save Tonight', artist: 'Eagle-Eye Cherry', tonart: 'Am', bpm: 120, quelle: 'Musicnotes Am, 120' },
  { title: 'Schau schau', artist: 'Selig', tonart: 'Gm', bpm: 102, quelle: 'Spotify-Analyse: Songbpm Gm, 102 (nur eine Quelle)' },
  { title: 'Seven Nation Army', artist: 'The White Stripes', tonart: 'Em', bpm: 124, quelle: 'Musicnotes Em; Aufnahme 123,5–124' },
  { title: 'Sexy', artist: 'Westernhagen', tonart: 'C', bpm: 120, quelle: 'Spotify-Analyse: Tunebat/Songbpm/GetSongBPM C, 120' },
  { title: 'Shallow', artist: 'Lady Gaga, Bradley Cooper', tonart: 'G', bpm: 96, quelle: 'Spotify-Analyse: Tunebat/Musicstax G, 96' },
  { title: 'Sitting, Waiting, Wishing', artist: 'Jack Johnson', tonart: 'C', bpm: 105, quelle: 'Spotify-Analyse: Tunebat/Songbpm/Musicstax C, 105' },
  { title: 'Someday', artist: 'Nickelback', tonart: 'Bm', bpm: 163, quelle: 'Spotify-Analyse: Tunebat/Musicstax Bm, 163 (halb 82)' },
  { title: 'Sommerregen', artist: 'JORIS', tonart: 'F#', bpm: 137, quelle: 'Spotify-Analyse: Songbpm/Tunebat F#, 137' },
  { title: 'Stand By Me', artist: 'Ben E. King', tonart: 'A', bpm: 118, quelle: 'Mixmeister F#m (Parallele), Akkordfolge A F#m D E; Tempo: Tunebat 118 zur Spotify-Fassung (Songbpm/Musicstax 119)' },
  { title: "Summer Of '69", artist: 'Bryan Adams', tonart: 'D', bpm: 139, quelle: 'Karaoke-Version Original D; 137–139' },
  { title: 'Take Me Home, Country Roads', artist: 'John Denver', tonart: 'A', bpm: 82, quelle: 'Mixmeister F#m (Parallele); Tempo: Tunebat/Songbpm 82 (Musicstax 164 für die Spotify-Fassung = doppeltes Tempo)' },
  { title: 'Taugenichts', artist: 'Saltatio Mortis', tonart: 'Bm', bpm: 165, quelle: 'Spotify-Analyse: Tunebat-Liste/Musicstax Bm, 165' },
  { title: 'The Color', artist: 'Flox', tonart: 'F#m', bpm: 118, quelle: 'Spotify-Analyse: Musicstax/Tunebat-Liste F#m, 118' },
  { title: 'The Snows Of New York', artist: 'Chris de Burgh', tonart: 'G', bpm: 144, quelle: 'Spotify-Analyse: Tunebat/Musicstax G, 144 (evtl. halb: 72)' },
  { title: 'Three Little Birds', artist: 'Bob Marley & The Wailers', tonart: 'A', bpm: 74, quelle: 'Spotify-Analyse: Musicstax/Songbpm A, 74 (Tunebat 148 doppelt)' },
  { title: 'Time to Wonder', artist: 'Fury In The Slaughterhouse', tonart: 'A', bpm: 115, quelle: 'Spotify-Analyse: Tunebat/Musicstax A, 115; GetSongBPM 116' },
  { title: 'To Be With You - 2021 Remastered', artist: 'Mr. Big', tonart: 'E', bpm: 83, quelle: 'Spotify-Analyse: Tunebat/Musicstax E, 83 zur Spotify-Fassung' },
  { title: 'Two Princes', artist: 'Spin Doctors', tonart: 'G', bpm: 104, quelle: 'Spotify-Analyse: Tunebat/Musicstax G (Songbpm Bm), 104' },
  { title: 'Unanswered Prayers', artist: 'Brooks Jefferson', tonart: 'D', bpm: 74, quelle: 'Spotify-Analyse: Tunebat/Musicstax D, 74' },
  { title: 'Unikat', artist: 'SDP', tonart: 'D#m', bpm: 73, quelle: 'Spotify-Analyse: Musicstax D#m (= Ebm), 73 (nur eine Quelle)' },
  { title: 'Von Ewigkeit zu Ewigkeit', artist: 'Selig', tonart: 'Dm', bpm: 170, quelle: 'Spotify-Analyse: Tunebat (Fassung 2014) Dm, 170; andere Liste Em 178 – unsicher' },
  { title: 'Wackelkontakt', artist: 'Oimara', tonart: 'G', bpm: 170, quelle: 'Spotify-Analyse: Tunebat/Songbpm G, 170 (halb 85)' },
  { title: 'Wake Me up When September Ends', artist: 'Green Day', tonart: 'G', bpm: 105, quelle: 'Jamzone G, 105' },
  { title: 'Walking On The Moon', artist: 'The Police', tonart: 'Dm', bpm: 146, quelle: 'Spotify-Analyse: Songbpm Dm, Tunebat C (Parallele uneinig); 146 (halb 73)' },
  { title: 'Weather With You', artist: 'Crowded House', tonart: 'D', bpm: 94, quelle: 'Spotify-Analyse: Tunebat/Musicstax D, 94' },
  { title: 'Weihnacht, was bist du', artist: 'Rolf Zuckowski', bpm: 96, quelle: 'Spotify-Analyse: GetSongBPM 96, Tunebat-Liste 97; Tonart nur indirekt' },
  { title: 'Wenn die Zeit kommt', artist: 'Wingenfelder', tonart: 'G', bpm: 140, quelle: 'Spotify-Analyse: Songbpm G, 140 (nur eine Quelle)' },
  { title: 'Westerland', artist: 'Die Ärzte', tonart: 'G', bpm: 94, quelle: 'Akkorde Ultimate Guitar (G D Em C); Tempo: Tunebat/Songbpm 94 (G bestätigt)' },
  { title: 'What Hurts the Most', artist: 'State of Mine', tonart: 'D#m', bpm: 136, quelle: 'Spotify-Analyse: Musicstax D#m (= Ebm), 136 (nur eine Quelle, Werte schwanken)' },
  { title: "When I'm Dead and Gone", artist: 'Fury In The Slaughterhouse', tonart: 'D', bpm: 84, quelle: 'GetSongBPM 84; Tonart: Tunebat/Musicstax D' },
  { title: 'Wherever You Will Go', artist: 'The Calling', tonart: 'D', bpm: 112, quelle: 'Mixmeister/Chordu 112; Tonart unklar; Tonart: Tunebat/Musicstax D' },
  { title: 'Winter Wonderland - Spotify Singles Holiday', artist: 'Laufey', tonart: 'D', bpm: 128, quelle: 'Spotify-Analyse: Musicstax/Songbpm D, 128' },
  { title: 'Wir werden uns wiedersehen', artist: 'Selig', tonart: 'F#m', bpm: 154, quelle: 'Spotify-Analyse: Tunebat/Musicstax F#m, 154 (evtl. halb: 77)' },
  { title: 'Wish You Were Here', artist: 'Pink Floyd', tonart: 'G', bpm: 123, quelle: 'Spotify-Analyse: Tunebat/Musicstax/Songbpm G, 122–123' },
  { title: 'Wonderful Life', artist: 'Katie Melua', tonart: 'F#m', bpm: 105, quelle: 'Spotify-Analyse: Tunebat/Songbpm/Musicstax F#m, 105 zur Spotify-Fassung (Hooktheory 106)' },
  { title: 'Wonderwall', artist: 'Oasis', tonart: 'F#m', bpm: 87, quelle: 'Musicnotes Original F#m; 87–88' },
  { title: 'Wonderwall', artist: 'Ryan Adams', tonart: 'Gm', bpm: 78, quelle: 'Spotify-Analyse: Tunebat/Songbpm Gm; 157 = doppelt gezählt → 78 (GetSongBPM 78)' },
  { title: 'Your House', artist: 'Jimmy Eat World', tonart: 'D', bpm: 93, quelle: 'Spotify-Analyse: Tunebat/Musicstax/Songbpm D, 93' },
  { title: 'Zu spät', artist: 'Die Ärzte', tonart: 'G', bpm: 140, quelle: 'Akkorde Ultimate Guitar (Key G, ohne Capo); Tempo: Tunebat/Musicstax 140 (Analyse dort C statt G)' },
];

/** Entwurf aus Backstage → Songs auf diesem Gerät (noch nicht in songinfo.ts übernommen), Schlüssel „Titel|Interpret“ */
export const SONGINFO_ENTWURF_KEY = 'bn-songinfo-entwurf';

/** im Backstage änderbare Felder (die Quelle kommt nur aus der Recherche) */
export type SongWerte = Pick<SongInfo, 'tonart' | 'spielTonart' | 'capo' | 'bpm' | 'takt' | 'notiz' | 'geprueft'>;
export const SONG_FELDER = ['tonart', 'spielTonart', 'capo', 'bpm', 'takt', 'notiz', 'geprueft'] as const;

/**
 * Wie verlässlich sind Tonart und Tempo? „geprueft“ (Band), „recherche“ (Notenausgaben, Akkordseiten),
 * „automatisch“ (Spotify-Analyse), „unsicher“ (Quellen uneinig, nur eine Quelle …), „fehlt“ (nichts eingetragen).
 */
export type SongStatus = 'geprueft' | 'recherche' | 'automatisch' | 'unsicher' | 'fehlt';
const UNSICHER = /unsicher|uneinig|nur eine Quelle|prüfen|keine eigene Seite|statt|Liste|nicht gefunden/i;
export function songStatus(w: SongWerte, quelle: string | undefined): SongStatus {
  if (w.geprueft) return 'geprueft';
  if (!w.tonart && !w.spielTonart && !w.bpm) return 'fehlt';
  if (!quelle) return 'geprueft'; // ohne Quelle hat die Band es selbst eingetragen
  if (UNSICHER.test(quelle) || !(w.tonart || w.spielTonart) || !w.bpm) return 'unsicher';
  return /^Spotify-Analyse/.test(quelle) ? 'automatisch' : 'recherche';
}
export const STATUS_TEXT: Record<SongStatus, string> = {
  geprueft: 'von der Band geprüft',
  recherche: 'recherchiert (Noten, Akkordseiten)',
  automatisch: 'automatisch ermittelt (Spotify-Analyse)',
  unsicher: 'unsicher – am Instrument prüfen',
  fehlt: 'noch nichts eingetragen',
};

function entwurf(): Record<string, SongWerte> {
  try {
    return typeof localStorage === 'undefined' ? {} : JSON.parse(localStorage.getItem(SONGINFO_ENTWURF_KEY) ?? '{}');
  } catch {
    return {};
  }
}

/** Tonart, Tempo und Notiz eines Songs – der Entwurf auf diesem Gerät hat Vorrang vor songinfo.ts, damit Einträge
 *  aus Backstage → Songs sofort in Setlist und Bühnen-Modus erscheinen */
export function songInfo(title: string, artist: string): SongInfo | undefined {
  const e = entwurf()[`${title}|${artist}`];
  const gespeichert = SONGINFO.find((s) => s.title === title && s.artist === artist);
  if (!e) return gespeichert;
  const s: SongInfo = { title, artist, ...e, ...(gespeichert?.quelle ? { quelle: gespeichert.quelle } : {}) };
  return SONG_FELDER.some((f) => s[f]) ? s : undefined;
}

/** Tonart, in der die Band den Song spielt – die eigene, sonst die des Originals */
export function gespielteTonart(s: SongInfo | undefined): string | undefined {
  return s?.spielTonart || s?.tonart;
}

/** z. B. „G · Capo 2 · 120 bpm · 3/4 · Intro nur Gitarre“ (4/4 steht nicht dabei) – leer, wenn nichts eingetragen ist */
export function songInfoText(title: string, artist: string): string {
  const s = songInfo(title, artist);
  return s ? [gespielteTonart(s), s.capo && `Capo ${s.capo}`, s.bpm && `${s.bpm} bpm`, s.takt && s.takt !== '4/4' && s.takt, s.notiz].filter(Boolean).join(' · ') : '';
}
