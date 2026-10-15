#!/usr/bin/env python3
"""Erzeugt das Pressekit nach public/presse/: Logos, Pressefotos, Pressetext, PDF und ZIP.

Aufruf (im Repo-Root, nach `npm ci`):  python3 scripts/build-pressekit.py
Benötigt: pillow, reportlab, fonttools  (pip install pillow reportlab fonttools)
Texte für PDF und Pressetext stehen unten in TEXT – bei Änderungen dort anpassen und neu bauen.
"""
import os
import shutil
import tempfile
import zipfile
from datetime import date

from fontTools.ttLib import TTFont
from PIL import Image, ImageOps
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.utils import simpleSplit
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont as RLFont
from reportlab.pdfgen import canvas

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'scripts', 'presse-quellen')
OUT = os.path.join(ROOT, 'public', 'presse')
FONTS = os.path.join(ROOT, 'node_modules', '@fontsource')

NIGHT = HexColor('#141619')
INK = HexColor('#ece9e4')
FOG = HexColor('#8d939b')
SUNSET = HexColor('#e8a46a')
TEXT_DARK = HexColor('#1d2024')
TEXT_MID = HexColor('#555b63')
LINE = HexColor('#d9d6d0')

TEXT = {
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
    # (Bezeichnung, Anzeige, Link)
    'contact': [
        ('Booking', 'Matthiaswigger@me.com', 'mailto:Matthiaswigger@me.com?subject=Booking-Anfrage%20Blickfeld%20Nord'),
        ('Instagram', '@blickfeldnord', 'https://www.instagram.com/blickfeldnord/'),
        ('Facebook', 'Blickfeld Nord', 'https://www.facebook.com/share/1BBobZWfjG/'),
        ('Website', 'blickfeld-nord.de', 'https://blickfeld-nord.de/'),
        ('Repertoire', 'Playlist auf Spotify', 'https://open.spotify.com/playlist/6O7apXN53rSGaWGhP8S8TW'),
    ],
    'usage': 'Logos und Fotos dürfen für die Ankündigung von Auftritten sowie für die Berichterstattung über '
             'Blickfeld Nord honorarfrei verwendet werden. Bitte nicht verfremden. Bildnachweis: Blickfeld Nord.',
}

FILES = {
    'pdf': 'blickfeld-nord-pressekit.pdf',
    'zip': 'blickfeld-nord-pressekit.zip',
    'logo': 'blickfeld-nord-logo-motiv.jpg',
    'kompass_png': 'blickfeld-nord-kompass.png',
    'kompass_svg': 'blickfeld-nord-kompass.svg',
    'logo_hell_png': 'blickfeld-nord-kompass-logo-hell.png',
    'logo_hell_svg': 'blickfeld-nord-kompass-logo-hell.svg',
    'logo_dunkel_png': 'blickfeld-nord-kompass-logo-dunkel.png',
    'logo_dunkel_svg': 'blickfeld-nord-kompass-logo-dunkel.svg',
    'foto1': 'blickfeld-nord-bandfoto-1.jpg',
    'foto2': 'blickfeld-nord-bandfoto-2.jpg',
    'text': 'blickfeld-nord-pressetext.txt',
}


def register_fonts(tmp):
    for name, path in [
        ('Inter', 'inter/files/inter-latin-400-normal.woff'),
        ('Inter-SemiBold', 'inter/files/inter-latin-600-normal.woff'),
        ('Michroma', 'michroma/files/michroma-latin-400-normal.woff'),
        ('Montserrat', 'montserrat/files/montserrat-latin-400-normal.woff'),
    ]:
        font = TTFont(os.path.join(FONTS, path))
        font.flavor = None
        ttf = os.path.join(tmp, name + '.ttf')
        font.save(ttf)
        pdfmetrics.registerFont(RLFont(name, ttf))


def build_images():
    # Logo-Motiv in voller Auflösung
    hero = Image.open(os.path.join(ROOT, 'public', 'hero.webp')).convert('RGB')
    hero.save(os.path.join(OUT, FILES['logo']), quality=93, optimize=True)
    # Kompass-Symbol
    Image.open(os.path.join(SRC, 'kompass-2048.png')).save(os.path.join(OUT, FILES['kompass_png']), optimize=True)
    with open(os.path.join(SRC, 'kompass-detail.svg')) as f_in, open(os.path.join(OUT, FILES['kompass_svg']), 'w') as f_out:
        f_out.write(f_in.read())
    # Freigestelltes Kompass-Logo (transparent), erzeugt mit scripts/kompass-logo.py
    for variant in ('hell', 'dunkel'):
        for ext in ('png', 'svg'):
            shutil.copyfile(os.path.join(SRC, f'kompass-logo-{variant}.{ext}'), os.path.join(OUT, FILES[f'logo_{variant}_{ext}']))
    # Bandfotos ohne Metadaten
    for key, src in [('foto1', 'bandfoto-1-original.jpg'), ('foto2', 'bandfoto-2-original.jpg')]:
        im = ImageOps.exif_transpose(Image.open(os.path.join(SRC, src))).convert('RGB')
        im.save(os.path.join(OUT, FILES[key]), quality=92, optimize=True)


def build_text():
    lines = ['BLICKFELD NORD – Pressetext', '', TEXT['claim'], '']
    lines += [p for para in TEXT['about'] for p in (para, '')]
    lines += ['Besetzung:'] + [f'– {n}: {r}' for n, r in TEXT['members']] + ['']
    lines += ['Für Veranstalter:'] + [f'– {k}: {v}' for k, v in TEXT['facts']] + ['']
    lines += ['Kontakt:']
    for label, value, url in TEXT['contact']:
        link = url.split('?')[0].replace('mailto:', '')
        lines.append(f'– {label}: {value}' + ('' if link == value else f' ({link})'))
    lines.append('')
    lines += ['Nutzung:', TEXT['usage'], '', f'Stand: {date.today():%m/%Y}']
    with open(os.path.join(OUT, FILES['text']), 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines) + '\n')


def pdf_jpeg(tmp, path, max_px=1600):
    """Verkleinerte JPG-Kopie fürs PDF – JPGs bettet reportlab komprimiert ein, das hält das PDF klein."""
    im = Image.open(path)
    if im.mode in ('RGBA', 'LA', 'P'):
        bg = Image.new('RGB', im.size, (20, 22, 25))
        bg.paste(im.convert('RGBA'), mask=im.convert('RGBA').split()[-1])
        im = bg
    im = im.convert('RGB')
    im.thumbnail((max_px, max_px))
    out = os.path.join(tmp, os.path.basename(path).rsplit('.', 1)[0] + '-pdf.jpg')
    im.save(out, quality=85, optimize=True)
    return out


def paragraph(c, text, x, y, width, font='Inter', size=10.5, leading=16, color=TEXT_DARK):
    c.setFont(font, size)
    c.setFillColor(color)
    for line in simpleSplit(text, font, size, width):
        c.drawString(x, y, line)
        y -= leading
    return y


def kicker(c, text, x, y, color=SUNSET):
    c.setStrokeColor(color)
    c.setLineWidth(0.8)
    c.line(x, y + 3, x + 14 * mm, y + 3)
    c.setFont('Montserrat', 8)
    c.setFillColor(color)
    c.drawString(x + 18 * mm, y, ' '.join(text.upper()))


def heading(c, text, x, y, size=17, color=TEXT_DARK):
    c.setFont('Michroma', size)
    c.setFillColor(color)
    c.drawString(x, y, text.upper())


def footer(c, page, dark=False):
    w, _ = A4
    c.setFont('Montserrat', 7.5)
    c.setFillColor(FOG if dark else TEXT_MID)
    c.drawString(20 * mm, 12 * mm, 'BLICKFELD NORD · PRESSEKIT · BLICKFELD-NORD.DE')
    c.drawRightString(w - 20 * mm, 12 * mm, f'{page} / 3')


def cover_image(c, path, x, y, w, h):
    """Bild formatfüllend (object-fit: cover) in den Rahmen setzen."""
    iw, ih = Image.open(path).size
    scale = max(w / iw, h / ih)
    dw, dh = iw * scale, ih * scale
    c.saveState()
    p = c.beginPath()
    p.roundRect(x, y, w, h, 3 * mm)
    c.clipPath(p, stroke=0, fill=0)
    c.drawImage(path, x - (dw - w) / 2, y - (dh - h) / 2, dw, dh)
    c.restoreState()


def build_pdf(tmp):
    w, h = A4
    m = 20 * mm
    c = canvas.Canvas(os.path.join(OUT, FILES['pdf']), pagesize=A4)
    c.setTitle('Blickfeld Nord – Pressekit')
    c.setAuthor('Blickfeld Nord')
    c.setSubject(TEXT['claim'])

    # Seite 1: Cover
    c.setFillColor(NIGHT)
    c.rect(0, 0, w, h, stroke=0, fill=1)
    logo = pdf_jpeg(tmp, os.path.join(OUT, FILES['logo']), 2000)
    lw_px, lh_px = Image.open(logo).size
    lh = w * lh_px / lw_px
    c.drawImage(logo, 0, h - lh, w, lh)
    y = h - lh - 22 * mm
    kicker(c, 'Pressekit', m, y)
    y -= 14 * mm
    c.setFont('Michroma', 26)
    c.setFillColor(INK)
    c.drawString(m, y, 'BLICKFELD NORD')
    y -= 10 * mm
    c.setFont('Montserrat', 12)
    c.setFillColor(SUNSET)
    c.drawString(m, y, TEXT['claim'])
    y -= 14 * mm
    for para in TEXT['about']:
        y = paragraph(c, para, m, y, w - 2 * m, size=11, leading=17, color=INK) - 6
    # Besetzung als drei Spalten
    y -= 8 * mm
    col = (w - 2 * m) / 3
    for i, (name, role) in enumerate(TEXT['members']):
        x = m + i * col
        c.setStrokeColor(SUNSET)
        c.setLineWidth(1)
        c.line(x, y + 6 * mm, x + 10 * mm, y + 6 * mm)
        c.setFont('Michroma', 9.5)
        c.setFillColor(INK)
        c.drawString(x, y, name.upper())
        c.setFont('Montserrat', 8.5)
        c.setFillColor(FOG)
        c.drawString(x, y - 5.5 * mm, role)
    footer(c, 1, dark=True)
    c.showPage()

    # Seite 2: Booking & Kontakt
    y = h - 28 * mm
    kicker(c, 'Für Veranstalter', m, y, color=HexColor('#c27a3e'))
    y -= 12 * mm
    heading(c, 'Booking', m, y)
    y -= 14 * mm
    box_w = (w - 2 * m - 6 * mm) / 2
    box_h = 24 * mm
    for i, (label, value) in enumerate(TEXT['facts']):
        bx = m + (i % 2) * (box_w + 6 * mm)
        by = y - (i // 2) * (box_h + 6 * mm) - box_h
        c.setStrokeColor(LINE)
        c.setFillColor(HexColor('#f7f5f2'))
        c.roundRect(bx, by, box_w, box_h, 3 * mm, stroke=1, fill=1)
        c.setFont('Montserrat', 7.5)
        c.setFillColor(TEXT_MID)
        c.drawString(bx + 6 * mm, by + box_h - 9 * mm, ' '.join(label.upper()))
        paragraph(c, value, bx + 6 * mm, by + box_h - 16 * mm, box_w - 12 * mm, size=11, leading=14)
    y -= 2 * box_h + 6 * mm + 16 * mm

    heading(c, 'Repertoire', m, y, size=13)
    y -= 9 * mm
    y = paragraph(c, 'Pop, Rock, Schlager, Dance und Disco – die komplette Songliste gibt es als Playlist auf Spotify:',
                  m, y, w - 2 * m)
    spotify = TEXT['contact'][-1][2]
    c.setFont('Inter-SemiBold', 10.5)
    c.setFillColor(HexColor('#c27a3e'))
    c.drawString(m, y, 'Playlist auf Spotify öffnen →')
    c.linkURL(spotify, (m, y - 3, m + 70 * mm, y + 11), relative=0)
    y -= 16
    y -= 12 * mm

    heading(c, 'Kontakt', m, y, size=13)
    y -= 10 * mm
    for label, value, url in TEXT['contact']:
        c.setFont('Montserrat', 8)
        c.setFillColor(TEXT_MID)
        c.drawString(m, y, label.upper())
        c.setFont('Inter-SemiBold', 11)
        c.setFillColor(TEXT_DARK)
        c.drawString(m + 32 * mm, y, value)
        tw = pdfmetrics.stringWidth(value, 'Inter-SemiBold', 11)
        c.linkURL(url, (m + 32 * mm, y - 3, m + 32 * mm + tw, y + 11), relative=0)
        c.setStrokeColor(LINE)
        c.line(m, y - 4 * mm, w - m, y - 4 * mm)
        y -= 11 * mm
    footer(c, 2)
    c.showPage()

    # Seite 3: Pressefotos & Logos
    y = h - 28 * mm
    kicker(c, 'Download', m, y, color=HexColor('#c27a3e'))
    y -= 12 * mm
    heading(c, 'Fotos & Logos', m, y)
    y -= 10 * mm
    full = w - 2 * m
    ph = full * 0.5
    cover_image(c, pdf_jpeg(tmp, os.path.join(OUT, FILES['foto2'])), m, y - ph, full, ph)
    y -= ph + 5 * mm
    half = (full - 6 * mm) / 2
    sh = half * 0.75
    cover_image(c, pdf_jpeg(tmp, os.path.join(OUT, FILES['foto1'])), m, y - sh, half, sh)
    # Kompass-Symbol zentriert auf dunklem Feld
    kx = m + half + 6 * mm
    c.setFillColor(NIGHT)
    c.roundRect(kx, y - sh, half, sh, 3 * mm, stroke=0, fill=1)
    ks = sh * 0.72
    c.drawImage(pdf_jpeg(tmp, os.path.join(OUT, FILES['kompass_png']), 800), kx + (half - ks) / 2, y - sh + (sh - ks) / 2, ks, ks)
    y -= sh + 10 * mm
    y = paragraph(c, 'Alle Bilder und Logos in voller Auflösung zum Download: blickfeld-nord.de/presse', m, y, full,
                  font='Inter-SemiBold', size=10.5)
    c.linkURL('https://blickfeld-nord.de/presse', (m, y + 2, m + full, y + 18), relative=0)
    y -= 4
    paragraph(c, TEXT['usage'], m, y, full, size=9.5, leading=14, color=TEXT_MID)
    footer(c, 3)
    c.showPage()
    c.save()


def build_zip():
    with zipfile.ZipFile(os.path.join(OUT, FILES['zip']), 'w', zipfile.ZIP_DEFLATED) as z:
        for key in ['pdf', 'text', 'logo', 'kompass_png', 'kompass_svg', 'logo_hell_png', 'logo_hell_svg',
                    'logo_dunkel_png', 'logo_dunkel_svg', 'foto1', 'foto2']:
            z.write(os.path.join(OUT, FILES[key]), 'blickfeld-nord-pressekit/' + FILES[key])


def main():
    os.makedirs(OUT, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        register_fonts(tmp)
        build_images()
        build_text()
        build_pdf(tmp)
        build_zip()
    for name in sorted(os.listdir(OUT)):
        print(f'{name:40} {os.path.getsize(os.path.join(OUT, name)) / 1024:8.0f} KB')


if __name__ == '__main__':
    main()
