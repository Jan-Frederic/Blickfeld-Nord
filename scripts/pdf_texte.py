"""Texte der PDFs (Pressekit, Technik-Rider, QR-Code-Karte, Wunschbox-Schild) auf Deutsch, Englisch und Niederländisch.

Die englischen und niederländischen Fassungen entsprechen den Texten der Website (src/app/pages/presse.ts,
Booking-Seite). Texte aus src/app/data/technik.json übersetzt `tx()` mit der Tabelle aus
src/app/data/uebersetzungen.ts – ohne Eintrag bleibt das deutsche Original stehen.
"""
import os
import re

LANGS = ('de', 'en', 'nl')
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def suffix(lang):
    """Dateiname je Sprache: Deutsch ohne Zusatz, sonst -en / -nl"""
    return '' if lang == 'de' else f'-{lang}'


def site(path, lang):
    """Adresse auf der Website in der jeweiligen Sprache, z. B. site('/wunsch', 'nl') → https://blickfeld-nord.de/nl/wunsch"""
    if lang == 'de':
        return 'https://blickfeld-nord.de' + path
    return f'https://blickfeld-nord.de/{lang}' + ('' if path == '/' else path)


def _load_uebersetzungen():
    # Die Datei hat ein festes Format (je Zeile de/en/nl: '…',) – siehe src/app/data/uebersetzungen-patch.ts
    with open(os.path.join(ROOT, 'src', 'app', 'data', 'uebersetzungen.ts'), encoding='utf-8') as fh:
        source = fh.read()
    value = r"'((?:[^'\\]|\\.)*)'"
    table = {}
    for de, en, nl in re.findall(rf"\n    de: {value},\n    en: {value},\n    nl: {value},", source):
        unescape = lambda s: s.replace("\\'", "'").replace('\\\\', '\\')
        table[unescape(de)] = {'en': unescape(en), 'nl': unescape(nl)}
    return table


UEBERSETZUNGEN = _load_uebersetzungen()


def tx(text, lang):
    """Inhaltstext (z. B. aus technik.json) in der Sprache – ohne Übersetzung das Original"""
    if lang == 'de' or not isinstance(text, str):
        return text
    return UEBERSETZUNGEN.get(text, {}).get(lang, text)


# ---- Pressekit ---------------------------------------------------------------------------------------

PRESSEKIT = {
    'de': {
        'title': 'Blickfeld Nord – Pressekit',
        'claim': 'Partyband mit drei Stimmen und jeder Menge Stimmung',
        'about': [
            'Was 2019 als Kombo von David Bröker und Matthias Wigger begann, ist heute ein echtes Power-Trio: '
            'Seit Oktober 2025 macht Jan-Frederic „Fred“ Overbeck am Bass die Runde komplett. Seitdem heißt es: '
            'drei Stimmen, ein Ziel – Party.',
            'Blickfeld Nord spielt Musik, die ins Bein geht und zum Mitsingen einlädt – ein vielseitiges Repertoire '
            'aus Pop, Rock, Schlager, Dance und Disco. Egal ob Weihnachtsmarkt, Stadtfest oder private Feier: '
            'Wenn Blickfeld Nord auf der Bühne steht, bleibt keiner lange sitzen.',
        ],
        'members': [
            ('David Bröker', 'Gesang & Gitarre'),
            ('Matthias Wigger', 'Schlagzeug & Gesang'),
            ('Jan-Frederic Overbeck', 'Bass & Gesang'),
        ],
        'facts': [
            ('Anlässe', 'Feste, private Feiern und Kneipen'),
            ('Spielzeit', '3 bis 4 Stunden – in Sets à 1 Stunde'),
            ('Pausen', 'Nach Absprache oder spontan'),
            ('Technik', 'Eigene PA und Licht bringen wir mit'),
        ],
        'mail_subject': 'Booking-Anfrage%20Blickfeld%20Nord',
        'playlist': 'Playlist auf Spotify',
        'usage': 'Logos und Fotos dürfen für die Ankündigung von Auftritten sowie für die Berichterstattung über '
                 'Blickfeld Nord honorarfrei verwendet werden. Bitte nicht verfremden. Bildnachweis: Blickfeld Nord.',
        'kicker': 'Pressekit',
        'organisers': 'Für Veranstalter',
        'booking': 'Booking',
        'repertoire': 'Pop, Rock, Schlager, Dance und Disco – die komplette Songliste gibt es als Playlist auf Spotify:',
        'open_playlist': 'Playlist auf Spotify öffnen →',
        'contact_label': 'Kontakt',
        'photos': 'Fotos & Logos',
        'full_res': 'Alle Bilder und Logos in voller Auflösung zum Download: blickfeld-nord.de/presse',
        'footer': 'PRESSEKIT',
        'text_title': 'Pressetext',
        'lineup': 'Besetzung',
        'usage_label': 'Nutzung',
        'as_of': 'Stand',
    },
    'en': {
        'title': 'Blickfeld Nord – Press kit',
        'claim': 'Party band with three voices and plenty of atmosphere',
        'about': [
            'What started in 2019 as a duo of David Bröker and Matthias Wigger is now a real power trio: since '
            'October 2025, Jan-Frederic “Fred” Overbeck on bass has completed the line-up. Ever since, it’s been '
            'three voices, one goal – party.',
            'Blickfeld Nord plays music that gets your feet moving and invites everyone to sing along – a varied '
            'repertoire of pop, rock, German Schlager, dance and disco. Whether it’s a Christmas market, a town '
            'festival or a private party: when Blickfeld Nord is on stage, nobody stays seated for long.',
        ],
        'members': [
            ('David Bröker', 'Vocals & guitar'),
            ('Matthias Wigger', 'Drums & vocals'),
            ('Jan-Frederic Overbeck', 'Bass & vocals'),
        ],
        'facts': [
            ('Occasions', 'Festivals, private parties and pubs'),
            ('Playing time', '3 to 4 hours – in sets of 1 hour'),
            ('Breaks', 'As agreed or spontaneously'),
            ('Equipment', 'We bring our own PA and lights'),
        ],
        'mail_subject': 'Booking%20request%20Blickfeld%20Nord',
        'playlist': 'Playlist on Spotify',
        'usage': 'Logos and photos may be used free of charge to announce shows and for reporting on Blickfeld Nord. '
                 'Please do not alter them. Photo credit: Blickfeld Nord.',
        'kicker': 'Press kit',
        'organisers': 'For organisers',
        'booking': 'Booking',
        'repertoire': 'Pop, rock, German Schlager, dance and disco – the complete song list is available as a playlist on Spotify:',
        'open_playlist': 'Open the playlist on Spotify →',
        'contact_label': 'Contact',
        'photos': 'Photos & logos',
        'full_res': 'All photos and logos in full resolution to download: blickfeld-nord.de/en/presse',
        'footer': 'PRESS KIT',
        'text_title': 'Press text',
        'lineup': 'Line-up',
        'usage_label': 'Usage',
        'as_of': 'As of',
    },
    'nl': {
        'title': 'Blickfeld Nord – Perskit',
        'claim': 'Partyband met drie stemmen en een hoop sfeer',
        'about': [
            'Wat in 2019 begon als duo van David Bröker en Matthias Wigger, is nu een echte powertrio: sinds oktober '
            '2025 maakt Jan-Frederic „Fred” Overbeck op bas het geheel compleet. Sindsdien geldt: drie stemmen, '
            'één doel – feest.',
            'Blickfeld Nord speelt muziek die in de benen kruipt en uitnodigt om mee te zingen – een gevarieerd '
            'repertoire van pop, rock, schlagers, dance en disco. Of het nu een kerstmarkt, een stadsfeest of een '
            'privéfeest is: als Blickfeld Nord op het podium staat, blijft niemand lang zitten.',
        ],
        'members': [
            ('David Bröker', 'Zang & gitaar'),
            ('Matthias Wigger', 'Drums & zang'),
            ('Jan-Frederic Overbeck', 'Bas & zang'),
        ],
        'facts': [
            ('Gelegenheden', 'Feesten, privéfeesten en cafés'),
            ('Speelduur', '3 tot 4 uur – in sets van 1 uur'),
            ('Pauzes', 'In overleg of spontaan'),
            ('Techniek', 'Eigen geluid (PA) en licht nemen we zelf mee'),
        ],
        'mail_subject': 'Boekingsaanvraag%20Blickfeld%20Nord',
        'playlist': 'Playlist op Spotify',
        'usage': 'Logo’s en foto’s mogen kosteloos worden gebruikt om optredens aan te kondigen en voor berichtgeving '
                 'over Blickfeld Nord. Graag niet bewerken. Fotocredit: Blickfeld Nord.',
        'kicker': 'Perskit',
        'organisers': 'Voor organisatoren',
        'booking': 'Boeken',
        'repertoire': 'Pop, rock, schlagers, dance en disco – de complete songlijst staat als playlist op Spotify:',
        'open_playlist': 'Playlist op Spotify openen →',
        'contact_label': 'Contact',
        'photos': 'Foto’s & logo’s',
        'full_res': 'Alle foto’s en logo’s in volledige resolutie om te downloaden: blickfeld-nord.de/nl/presse',
        'footer': 'PERSKIT',
        'text_title': 'Perstekst',
        'lineup': 'Bezetting',
        'usage_label': 'Gebruik',
        'as_of': 'Bijgewerkt',
    },
}


def contact(lang):
    """(Bezeichnung, Anzeige, Link) für Pressekit und Rider"""
    t = PRESSEKIT[lang]
    return [
        ('Booking', 'Matthiaswigger@me.com', f'mailto:Matthiaswigger@me.com?subject={t["mail_subject"]}'),
        ('Instagram', '@blickfeldnord', 'https://www.instagram.com/blickfeldnord/'),
        ('Facebook', 'Blickfeld Nord', 'https://www.facebook.com/share/1BBobZWfjG/'),
        ('Website', 'blickfeld-nord.de', site('/', lang)),
        ('Repertoire', t['playlist'], 'https://open.spotify.com/playlist/6O7apXN53rSGaWGhP8S8TW'),
    ]


# ---- Technik-Rider -----------------------------------------------------------------------------------

RIDER = {
    'de': {
        'title': 'Blickfeld Nord – Technik-Rider',
        'heading': 'TECHNIK-RIDER',
        'sections': [
            ('Platz, Strom & Technik', [
                ('Spielfläche', 'ca. 4 × 3 m'),
                ('Strom', '2 Steckdosen in der Nähe der Spielfläche'),
                ('PA & Licht', 'bringen wir selbst mit'),
            ]),
            ('Zeitplan', [
                ('Aufbau', 'ca. 3 Stunden vor Beginn'),
                ('Spielzeit', '3 bis 4 Stunden, in Sets à 1 Stunde'),
                ('Pausen', 'nach Absprache oder spontan'),
                ('Abbau', 'ca. 1 Stunde'),
            ]),
            ('Buchung', [
                ('Anfahrt', 'im Umkreis von bis zu 50 km rund um Hamminkeln'),
                ('Vorlauf', 'mindestens 4 Wochen im Voraus'),
            ]),
        ],
        'setup': 'Technischer Aufbau',
        'plot': 'Bühnenplan & Kanalliste',
        'plan': 'Bühnenplan',
        'plan_caption': 'Ansicht von oben, Publikum unten · 1 Kästchen = 1 m · Details und Kanalliste im Technik-Rider',
        'hw': [('Mischpult', 'mischpult'), ('PA', 'pa'), ('Monitore', 'monitore'), ('Licht', 'licht')],
        'open': 'offen',
        'stage': 'SPIELFLÄCHE',
        'audience': 'P U B L I K U M',
        'cols': ['Kanal', 'Quelle', 'Art', 'Gerät', 'Stativ', '48 V'],
        'yes': 'ja',
        'monitors': 'Monitore',
        'power': 'Strom',
        'monitor_line': '{label} (Aux {i}) für {fuer}: {mix}',
        'mix_open': 'Mischung offen',
        'proposal': 'Vorschlag',
        'footer': 'TECHNIK-RIDER',
        'page': 'Seite',
    },
    'en': {
        'title': 'Blickfeld Nord – Tech rider',
        'heading': 'TECH RIDER',
        'sections': [
            ('Space, power & equipment', [
                ('Stage area', 'approx. 4 × 3 m'),
                ('Power', '2 power sockets near the stage area'),
                ('PA & lights', 'we bring our own'),
            ]),
            ('Schedule', [
                ('Set-up', 'approx. 3 hours before the start'),
                ('Playing time', '3 to 4 hours, in sets of 1 hour'),
                ('Breaks', 'as agreed or spontaneously'),
                ('Tear-down', 'approx. 1 hour'),
            ]),
            ('Booking', [
                ('Travel', 'within up to 50 km of Hamminkeln'),
                ('Lead time', 'at least 4 weeks in advance'),
            ]),
        ],
        'setup': 'Technical set-up',
        'plot': 'Stage plot & channel list',
        'plan': 'Stage plan',
        'plan_caption': 'Top view, audience at the bottom · 1 square = 1 m · details and channel list in the tech rider',
        'hw': [('Mixer', 'mischpult'), ('PA', 'pa'), ('Monitors', 'monitore'), ('Lights', 'licht')],
        'open': 'tbc',
        'stage': 'STAGE AREA',
        'audience': 'A U D I E N C E',
        'cols': ['Ch.', 'Source', 'Type', 'Device', 'Stand', '48 V'],
        'yes': 'yes',
        'monitors': 'Monitors',
        'power': 'Power',
        'monitor_line': '{label} (aux {i}) for {fuer}: {mix}',
        'mix_open': 'mix tbc',
        'proposal': 'proposal',
        'footer': 'TECH RIDER',
        'page': 'Page',
    },
    'nl': {
        'title': 'Blickfeld Nord – Techniek-rider',
        'heading': 'TECHNIEK-RIDER',
        'sections': [
            ('Ruimte, stroom & techniek', [
                ('Speelvlak', 'ca. 4 × 3 m'),
                ('Stroom', '2 stopcontacten in de buurt van het speelvlak'),
                ('PA & licht', 'nemen we zelf mee'),
            ]),
            ('Tijdschema', [
                ('Opbouw', 'ca. 3 uur voor aanvang'),
                ('Speelduur', '3 tot 4 uur, in sets van 1 uur'),
                ('Pauzes', 'in overleg of spontaan'),
                ('Afbouw', 'ca. 1 uur'),
            ]),
            ('Boeking', [
                ('Afstand', 'tot 50 km rond Hamminkeln'),
                ('Op tijd boeken', 'minimaal 4 weken van tevoren'),
            ]),
        ],
        'setup': 'Technische opbouw',
        'plot': 'Podiumplan & kanalenlijst',
        'plan': 'Podiumplan',
        'plan_caption': 'Bovenaanzicht, publiek onderaan · 1 vakje = 1 m · details en kanalenlijst in de techniek-rider',
        'hw': [('Mengpaneel', 'mischpult'), ('PA', 'pa'), ('Monitoren', 'monitore'), ('Licht', 'licht')],
        'open': 'n.n.b.',
        'stage': 'SPEELVLAK',
        'audience': 'P U B L I E K',
        'cols': ['Kanaal', 'Bron', 'Type', 'Apparaat', 'Statief', '48 V'],
        'yes': 'ja',
        'monitors': 'Monitoren',
        'power': 'Stroom',
        'monitor_line': '{label} (aux {i}) voor {fuer}: {mix}',
        'mix_open': 'mix n.n.b.',
        'proposal': 'voorstel',
        'footer': 'TECHNIEK-RIDER',
        'page': 'Pagina',
    },
}


# ---- QR-Code-Karte und Wunschbox-Schild --------------------------------------------------------------

QR = {
    'de': {
        'title': 'Blickfeld Nord – QR-Code-Karte',
        'scan': 'Termine, Booking & Fotos: einfach scannen',
        'card_claim': 'Partyband · Feste, private Feiern und Kneipen',
        'card_label': 'TERMINE & BOOKING',
        'wish_title': 'Blickfeld Nord – Live-Wunschbox',
        'wish_kicker': 'LIVE-WUNSCHBOX',
        'wish_question': 'Euer Song?',
        'wish_how': 'Scannen, Song aussuchen, abschicken.',
        'wish_promise': 'Wir spielen ihn, sobald er in den Abend passt.',
    },
    'en': {
        'title': 'Blickfeld Nord – QR code card',
        'scan': 'Shows, booking & photos: just scan',
        'card_claim': 'Party band · festivals, private parties and pubs',
        'card_label': 'SHOWS & BOOKING',
        'wish_title': 'Blickfeld Nord – Live request box',
        'wish_kicker': 'LIVE REQUEST BOX',
        'wish_question': 'Your song?',
        'wish_how': 'Scan, pick a song, send it.',
        'wish_promise': 'We’ll play it as soon as it fits the night.',
    },
    'nl': {
        'title': 'Blickfeld Nord – QR-codekaart',
        'scan': 'Optredens, boeken & foto’s: gewoon scannen',
        'card_claim': 'Partyband · feesten, privéfeesten en cafés',
        'card_label': 'OPTREDENS & BOEKEN',
        'wish_title': 'Blickfeld Nord – Live-verzoekbox',
        'wish_kicker': 'LIVE-VERZOEKBOX',
        'wish_question': 'Jullie nummer?',
        'wish_how': 'Scannen, nummer kiezen, versturen.',
        'wish_promise': 'We spelen het zodra het in de avond past.',
    },
}
