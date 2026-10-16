#!/usr/bin/env python3
"""Erzeugt Vorschaubilder fürs Suchergebnis aus dem Logo-Motiv (public/hero.webp):
public/share-1x1.jpg (1200 × 1200) und public/share-4x3.jpg (1200 × 900).

Das Motiv ist breit (16:9) – damit der Schriftzug beim Zuschneiden nicht abgeschnitten wird, liegt es in
voller Breite mittig; Himmel und See werden darüber und darunter weich erweitert.
Aufruf: python3 scripts/share-images.py   (benötigt pillow)
"""
import os

from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HERO = os.path.join(ROOT, 'public', 'hero.webp')


def build(w, h, out):
    hero = Image.open(HERO).convert('RGB')
    # Hintergrund: Motiv formatfüllend, stark weichgezeichnet und abgedunkelt
    scale = max(w / hero.width, h / hero.height)
    bg = hero.resize((round(hero.width * scale), round(hero.height * scale)), Image.LANCZOS)
    left, top = (bg.width - w) // 2, (bg.height - h) // 2
    bg = bg.crop((left, top, left + w, top + h)).filter(ImageFilter.GaussianBlur(40))
    bg = Image.blend(bg, Image.new('RGB', (w, h), (20, 22, 25)), 0.35)
    # Vordergrund: komplettes Motiv in voller Breite, Ränder oben/unten weich ausgeblendet
    fh = round(hero.height * w / hero.width)
    fg = hero.resize((w, fh), Image.LANCZOS)
    mask = Image.new('L', (w, fh), 255)
    fade = round(fh * 0.18)
    for y in range(fade):
        a = round(255 * (y / fade) ** 1.5)
        mask.paste(a, (0, y, w, y + 1))
        mask.paste(a, (0, fh - 1 - y, w, fh - y))
    bg.paste(fg, (0, (h - fh) // 2), mask)
    bg.save(out, quality=86, optimize=True, progressive=True)
    print(os.path.relpath(out), f'{w}×{h}', f'{os.path.getsize(out) // 1024} KB')


if __name__ == '__main__':
    build(1200, 1200, os.path.join(ROOT, 'public', 'share-1x1.jpg'))
    build(1200, 900, os.path.join(ROOT, 'public', 'share-4x3.jpg'))
