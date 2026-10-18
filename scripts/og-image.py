#!/usr/bin/env python3
"""Erzeugt das Link-Vorschaubild public/og-image.jpg (1200 × 630).

Google schneidet das Bild im Suchergebnis oft mittig quadratisch zu – Kompass und Schriftzug liegen daher
komplett im mittleren Quadrat (630 × 630), links und rechts nur die weichgezeichnete Landschaft.
Aufruf (im Repo-Root, nach `npm ci`):  python3 scripts/og-image.py   (benötigt pillow, fonttools, brotli)
"""
import io
import os

from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HERO = os.path.join(ROOT, 'public', 'hero.webp')
COMPASS = os.path.join(ROOT, 'public', 'presse', 'blickfeld-nord-kompass-logo-hell.png')
FONTS = os.path.join(ROOT, 'node_modules', '@fontsource')
OUT = os.path.join(ROOT, 'public', 'og-image.jpg')

W, H = 1200, 630
INK = (236, 233, 228)
FOG = (178, 183, 190)


def font(path, size):
    """woff2 der Website-Schriften für Pillow in TrueType umwandeln."""
    tt = TTFont(os.path.join(FONTS, path))
    tt.flavor = None
    buf = io.BytesIO()
    tt.save(buf)
    buf.seek(0)
    return ImageFont.truetype(buf, size)


def spaced(draw, text, cx, y, fnt, fill, tracking):
    widths = [draw.textlength(ch, font=fnt) for ch in text]
    x = cx - (sum(widths) + tracking * (len(text) - 1)) / 2
    for ch, w in zip(text, widths):
        draw.text((x, y), ch, font=fnt, fill=fill)
        x += w + tracking


def main():
    # Hintergrund: nur der untere Teil des Logo-Motivs (See und Abendlicht, ohne Schriftzug),
    # formatfüllend, weichgezeichnet und abgedunkelt
    hero = Image.open(HERO).convert('RGB')
    hero = hero.crop((0, round(hero.height * 0.66), hero.width, hero.height))
    scale = max(W / hero.width, H / hero.height)
    bg = hero.resize((round(hero.width * scale), round(hero.height * scale)), Image.LANCZOS)
    left, top = (bg.width - W) // 2, (bg.height - H) // 2
    bg = bg.crop((left, top, left + W, top + H)).filter(ImageFilter.GaussianBlur(18))
    bg = Image.blend(bg, Image.new('RGB', (W, H), (20, 22, 25)), 0.55)

    # Kompass (helle Variante, Hintergrund transparent machen: dunkle Pixel ausblenden)
    compass = Image.open(COMPASS).convert('RGBA')
    gray = compass.convert('L')
    alpha = gray.point(lambda v: 0 if v < 40 else min(255, int((v - 40) * 1.6)))
    compass.putalpha(alpha)
    size = 340
    compass = compass.resize((size, size), Image.LANCZOS)
    bg.paste(compass, ((W - size) // 2, 40), compass)

    draw = ImageDraw.Draw(bg)
    spaced(draw, 'BLICKFELD', W / 2, 410, font('michroma/files/michroma-latin-400-normal.woff2', 64), INK, 6)
    spaced(draw, 'NORD', W / 2, 505, font('montserrat/files/montserrat-latin-300-normal.woff2', 40), FOG, 26)

    bg.save(OUT, 'JPEG', quality=88, optimize=True, progressive=True)
    print(f'{os.path.relpath(OUT)}  {os.path.getsize(OUT) / 1024:.0f} KB')


if __name__ == '__main__':
    main()
