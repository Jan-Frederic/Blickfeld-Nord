#!/usr/bin/env python3
"""Erzeugt das Pressekit nach public/presse/: Logos, Pressefotos, Pressetext, PDF und ZIP.

Aufruf (im Repo-Root, nach `npm ci`):  python3 scripts/build-pressekit.py
Benötigt: pillow, reportlab, fonttools  (pip install pillow reportlab fonttools)
Texte für PDF und Pressetext je Sprache stehen in scripts/pdf_texte.py – bei Änderungen dort anpassen und neu bauen.
Erzeugt Deutsch (ohne Zusatz) sowie Englisch und Niederländisch (-en, -nl).
"""
import os
import shutil
import sys
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

# Texte je Sprache: scripts/pdf_texte.py (Deutsch, Englisch, Niederländisch – wie auf der Website)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pdf_texte  # noqa: E402


def stimmen():
    """Freigegebene Zitate aus src/app/data/stimmen.ts (wie im Booking und auf der Pressekit-Seite) – höchstens zwei,
    damit Seite 3 nicht überläuft. Zitate bleiben im Wortlaut (Deutsch)."""
    import re
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    src = open(os.path.join(root, 'src/app/data/stimmen.ts'), encoding='utf-8').read()
    liste = src[src.index('export const STIMMEN'):]
    feld = lambda block, k: (m.group(1).replace("\\'", "'") if (m := re.search(rf"\b{k}: '((?:[^'\\]|\\.)*)'", block)) else None)
    out = []
    for block in re.findall(r'\{[^{}]*\}', liste):
        zitat, wer = feld(block, 'zitat'), feld(block, 'wer')
        if zitat and wer:
            out.append((zitat, wer + (f" · {feld(block, 'anlass')}" if feld(block, 'anlass') else '')))
    return out[:2]


def texts(lang):
    return {**pdf_texte.PRESSEKIT[lang], 'contact': pdf_texte.contact(lang)}


# deutsche Fassung – auch für Technik-Rider und QR-Code-Karte
TEXT = texts('de')

FILES = {
    'logo': 'blickfeld-nord-logo-motiv.jpg',
    'kompass_png': 'blickfeld-nord-kompass.png',
    'kompass_svg': 'blickfeld-nord-kompass.svg',
    'logo_hell_png': 'blickfeld-nord-kompass-logo-hell.png',
    'logo_hell_svg': 'blickfeld-nord-kompass-logo-hell.svg',
    'logo_dunkel_png': 'blickfeld-nord-kompass-logo-dunkel.png',
    'logo_dunkel_svg': 'blickfeld-nord-kompass-logo-dunkel.svg',
    'foto1': 'blickfeld-nord-bandfoto-1.jpg',
    'foto2': 'blickfeld-nord-bandfoto-2.jpg',
    'logo_schrift_hell_png': 'blickfeld-nord-logo-freigestellt-hell.png',
    'logo_schrift_hell_klein_png': 'blickfeld-nord-logo-freigestellt-hell-klein.png',
    'logo_svg': 'blickfeld-nord-logo.svg',
    'logo_clean_svg': 'blickfeld-nord-logo-clean.svg',
}


def lang_files(lang):
    """PDF, ZIP und Pressetext je Sprache: Deutsch ohne Zusatz, sonst -en / -nl"""
    sfx = pdf_texte.suffix(lang)
    return {
        'pdf': f'blickfeld-nord-pressekit{sfx}.pdf',
        'zip': f'blickfeld-nord-pressekit{sfx}.zip',
        'text': f'blickfeld-nord-pressetext{sfx}.txt',
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


def build_text(lang):
    t = texts(lang)
    lines = [f'BLICKFELD NORD – {t["text_title"]}', '', t['claim'], '']
    lines += [p for para in t['about'] for p in (para, '')]
    lines += [f'{t["lineup"]}:'] + [f'– {n}: {r}' for n, r in t['members']] + ['']
    lines += [f'{t["organisers"]}:'] + [f'– {k}: {v}' for k, v in t['facts']] + ['']
    lines += [f'{t["contact_label"]}:']
    for label, value, url in t['contact']:
        link = url.split('?')[0].replace('mailto:', '')
        lines.append(f'– {label}: {value}' + ('' if link == value else f' ({link})'))
    lines.append('')
    lines += [f'{t["usage_label"]}:', t['usage'], '', f'{t["as_of"]}: {date.today():%m/%Y}']
    with open(os.path.join(OUT, lang_files(lang)['text']), 'w', encoding='utf-8') as f:
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


def footer(c, page, dark=False, label='PRESSEKIT'):
    w, _ = A4
    c.setFont('Montserrat', 7.5)
    c.setFillColor(FOG if dark else TEXT_MID)
    c.drawString(20 * mm, 12 * mm, f'BLICKFELD NORD · {label} · BLICKFELD-NORD.DE')
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


def build_pdf(tmp, lang):
    t = texts(lang)
    w, h = A4
    m = 20 * mm
    c = canvas.Canvas(os.path.join(OUT, lang_files(lang)['pdf']), pagesize=A4)
    c.setTitle(t['title'])
    c.setAuthor('Blickfeld Nord')
    c.setSubject(t['claim'])

    # Seite 1: Cover
    c.setFillColor(NIGHT)
    c.rect(0, 0, w, h, stroke=0, fill=1)
    logo = pdf_jpeg(tmp, os.path.join(OUT, FILES['logo']), 2000)
    lw_px, lh_px = Image.open(logo).size
    lh = w * lh_px / lw_px
    c.drawImage(logo, 0, h - lh, w, lh)
    y = h - lh - 22 * mm
    kicker(c, t['kicker'], m, y)
    y -= 14 * mm
    c.setFont('Michroma', 26)
    c.setFillColor(INK)
    c.drawString(m, y, 'BLICKFELD NORD')
    y -= 10 * mm
    c.setFont('Montserrat', 12)
    c.setFillColor(SUNSET)
    c.drawString(m, y, t['claim'])
    y -= 14 * mm
    for para in t['about']:
        y = paragraph(c, para, m, y, w - 2 * m, size=11, leading=17, color=INK) - 6
    # Besetzung als drei Spalten
    y -= 8 * mm
    col = (w - 2 * m) / 3
    for i, (name, role) in enumerate(t['members']):
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
    footer(c, 1, dark=True, label=t['footer'])
    c.showPage()

    # Seite 2: Booking & Kontakt
    y = h - 28 * mm
    kicker(c, t['organisers'], m, y, color=HexColor('#c27a3e'))
    y -= 12 * mm
    heading(c, t['booking'], m, y)
    y -= 14 * mm
    box_w = (w - 2 * m - 6 * mm) / 2
    box_h = 24 * mm
    for i, (label, value) in enumerate(t['facts']):
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
    y = paragraph(c, t['repertoire'], m, y, w - 2 * m)
    spotify = t['contact'][-1][2]
    c.setFont('Inter-SemiBold', 10.5)
    c.setFillColor(HexColor('#c27a3e'))
    c.drawString(m, y, t['open_playlist'])
    c.linkURL(spotify, (m, y - 3, m + 70 * mm, y + 11), relative=0)
    y -= 16
    y -= 12 * mm

    # Referenzen („Bisher live bei …“) stehen im Booking, nicht mehr im Pressekit

    heading(c, t['contact_label'], m, y, size=13)
    y -= 10 * mm
    for label, value, url in t['contact']:
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
    footer(c, 2, label=t['footer'])
    c.showPage()

    # Seite 3: Pressefotos & Logos
    y = h - 28 * mm
    kicker(c, 'Download', m, y, color=HexColor('#c27a3e'))
    y -= 12 * mm
    heading(c, t['photos'], m, y)
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
    y = paragraph(c, t['full_res'], m, y, full, font='Inter-SemiBold', size=10.5)
    c.linkURL(pdf_texte.site('/presse', lang), (m, y + 2, m + full, y + 18), relative=0)
    y -= 4
    y = paragraph(c, t['usage'], m, y, full, size=9.5, leading=14, color=TEXT_MID)

    # Stimmen von Veranstaltern (nur wenn in stimmen.ts eingetragen) – unten auf Seite 3, dort ist Platz
    zitate = stimmen()
    if zitate:
        y -= 10 * mm
        heading(c, STIMMEN_TITEL[lang], m, y, size=13)
        y -= 9 * mm
        for zitat, wer in zitate:
            y = paragraph(c, f'„{zitat}“', m, y, full, size=10, leading=14.5)
            c.setFont('Inter', 8.5)
            c.setFillColor(TEXT_MID)
            c.drawString(m, y + 2, f'– {wer}')
            y -= 8 * mm
    footer(c, 3, label=t['footer'])
    c.showPage()
    c.save()


def build_zip(lang):
    files = {**FILES, **lang_files(lang)}
    with zipfile.ZipFile(os.path.join(OUT, files['zip']), 'w', zipfile.ZIP_DEFLATED) as z:
        for key in ['pdf', 'text', 'logo', 'kompass_png', 'kompass_svg', 'logo_hell_png', 'logo_hell_svg',
                    'logo_dunkel_png', 'logo_dunkel_svg', 'logo_schrift_hell_png', 'logo_schrift_hell_klein_png', 'logo_svg', 'logo_clean_svg', 'foto1', 'foto2']:
            z.write(os.path.join(OUT, files[key]), 'blickfeld-nord-pressekit/' + files[key])


def main():
    os.makedirs(OUT, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        register_fonts(tmp)
        build_images()
        for lang in pdf_texte.LANGS:
            build_text(lang)
            build_pdf(tmp, lang)
            build_zip(lang)
    for name in sorted(os.listdir(OUT)):
        print(f'{name:40} {os.path.getsize(os.path.join(OUT, name)) / 1024:8.0f} KB')


if __name__ == '__main__':
    main()
