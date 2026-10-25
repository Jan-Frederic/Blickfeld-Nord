#!/usr/bin/env python3
"""Link-Vorschau je Konzert (1200 × 630, z. B. für WhatsApp, Signal, Facebook): Startbild mit Logo oben, darunter
Datum, Ort, Stadt und Eintritt. Aufgerufen von scripts/seo.mjs mit einer JSON-Datei:
  [{"file": "og/konzert-2026-12-04.jpg", "datum": "…", "ort": "…", "stadt": "…", "extra": "…"}]
Bilder landen im fertigen Build (dist/blickfeld-nord/browser/). Benötigt Pillow und fontTools.
"""
import json
import os
import sys
import tempfile

from fontTools.ttLib import TTFont
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, 'dist', 'blickfeld-nord', 'browser')
FONTS = os.path.join(ROOT, 'node_modules', '@fontsource')
W, H = 1200, 630
SUNSET = (232, 164, 106)
INK = (236, 233, 228)
FOG = (176, 181, 188)


def font(path, size, cache={}):
    # @fontsource liefert WOFF – für Pillow einmal als TTF ablegen
    if path not in cache:
        ttf = os.path.join(tempfile.gettempdir(), 'bn-og-' + os.path.basename(path).replace('.woff', '.ttf'))
        if not os.path.exists(ttf):
            TTFont(os.path.join(FONTS, path)).save(ttf)
        cache[path] = ttf
    return ImageFont.truetype(cache[path], size)


def passend(draw, text, pfad, groesse, breite):
    """Schrift so klein wie nötig, damit der Text in die Breite passt"""
    while groesse > 20:
        f = font(pfad, groesse)
        if draw.textlength(text, font=f) <= breite:
            return f
        groesse -= 2
    return font(pfad, groesse)


def hintergrund():
    hero = Image.open(os.path.join(ROOT, 'public', 'hero.webp')).convert('RGB')
    # Grund: dunkler Verlauf wie auf der Website
    grund = Image.new('RGB', (W, H))
    gd = ImageDraw.Draw(grund)
    for y in range(H):
        t = y / H
        gd.line([(0, y), (W, y)], fill=tuple(round(a + (b - a) * t) for a, b in zip((28, 31, 35), (16, 18, 21))))
    # darauf das Startbild kleiner, damit Logo samt „NORD“ oben Platz hat – Ränder weich auslaufend
    fh = 470
    fg = hero.resize((round(hero.width * fh / hero.height), fh), Image.LANCZOS)
    rand = 140
    seiten = Image.new('L', fg.size, 255)
    unten = Image.new('L', fg.size, 255)
    sd, ud = ImageDraw.Draw(seiten), ImageDraw.Draw(unten)
    for i in range(rand):
        a = int(255 * i / rand)
        sd.line([(i, 0), (i, fh)], fill=a)
        sd.line([(fg.width - 1 - i, 0), (fg.width - 1 - i, fh)], fill=a)
        ud.line([(0, fh - 1 - i), (fg.width, fh - 1 - i)], fill=a)
    maske = ImageChops.darker(seiten, unten)
    bild = grund.copy()
    bild.paste(fg, ((W - fg.width) // 2, -10), maske)
    # unten abdunkeln, damit der Text gut lesbar ist
    schleier = Image.new('L', (W, H))
    d = ImageDraw.Draw(schleier)
    for y in range(H):
        d.line([(0, y), (W, y)], fill=int(235 * min(1, max(0, (y - H * 0.6) / (H * 0.18)))))
    return Image.composite(Image.new('RGB', (W, H), (16, 18, 21)), bild, schleier)


def zeichnen(e, basis):
    """Logo oben (aus dem Startbild), darunter Datum, Ort und – in einer Zeile – Stadt und Eintritt"""
    img = basis.copy()
    d = ImageDraw.Draw(img)
    rand = 64
    breite = W - 2 * rand
    unten = [t for t in (e.get('stadt'), e.get('extra')) if t]
    zeilen = [
        (e['datum'], 'montserrat/files/montserrat-latin-400-normal.woff', 30, SUNSET),
        (e['ort'], 'michroma/files/michroma-latin-400-normal.woff', 44, INK),
    ]
    if unten:
        zeilen.append(('  ·  '.join(unten), 'inter/files/inter-latin-400-normal.woff', 27, FOG))
    gesetzt = [(t, passend(d, t, p, g, breite), farbe) for t, p, g, farbe in zeilen]
    hoehe = sum(f.getbbox(t)[3] for t, f, _ in gesetzt) + 16 * (len(gesetzt) - 1)
    y = H - 52 - hoehe
    for t, f, farbe in gesetzt:
        d.text((rand, y), t, font=f, fill=farbe)
        y += f.getbbox(t)[3] + 16
    return img


def main():
    eintraege = json.load(open(sys.argv[1], encoding='utf-8'))
    basis = hintergrund().filter(ImageFilter.GaussianBlur(0))
    for e in eintraege:
        ziel = os.path.join(DIST, e['file'])
        os.makedirs(os.path.dirname(ziel), exist_ok=True)
        zeichnen(e, basis).save(ziel, 'JPEG', quality=84, optimize=True, progressive=True)
    print(f'Link-Vorschau: {len(eintraege)} Konzertbilder erzeugt')


if __name__ == '__main__':
    main()
