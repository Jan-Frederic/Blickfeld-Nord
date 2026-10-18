#!/usr/bin/env python3
"""Erzeugt alle Website-Icons aus einer gemeinsamen Kompass-Zeichnung (64er-Raster):
public/favicon.svg, favicon.ico (16/32/48), favicon-16.png, favicon-32.png, icon-192.png, icon-512.png,
apple-touch-icon.png (180).

Bewusst vereinfacht gegenüber dem Logo, damit es auch winzig erkennbar bleibt: kräftiger Ring, Nordnadel
(im Sonnenuntergangs-Orange der Website) und die „K“-Arme, keine Gradstriche. Hintergrund randlos (keine
abgerundeten Ecken) – Google zeigt das Icon im Suchergebnis als Kreis. Alles liegt im inneren Kreis.
Aufruf:  python3 scripts/favicons.py   (benötigt pillow)
"""
import math
import os

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(ROOT, 'public')

BG = '#15171c'
INK = '#efece6'
DIM = '#9a9790'
SUNSET = '#e8a46a'
C = 32
RING_R, RING_W = 24, 3


def arm(angle_deg):
    """„K“-Arm als spitz zulaufender Balken vom Zentrum nach außen (0° = Osten, gegen den Uhrzeigersinn)."""
    a = math.radians(angle_deg)
    d = (math.cos(a), -math.sin(a))
    n = (-d[1], d[0])
    start, length, half = 1.5, 21, 2.7
    base = (C + d[0] * start, C + d[1] * start)
    shoulder = (C + d[0] * (length - 4), C + d[1] * (length - 4))
    tip = (C + d[0] * length, C + d[1] * length)
    return [
        (base[0] + n[0] * half, base[1] + n[1] * half),
        (shoulder[0] + n[0] * half, shoulder[1] + n[1] * half),
        tip,
        (shoulder[0] - n[0] * half, shoulder[1] - n[1] * half),
        (base[0] - n[0] * half, base[1] - n[1] * half),
    ]


NEEDLE_N = [(C, 10), (C + 4.4, C), (C - 4.4, C)]
NEEDLE_S = [(C - 4.4, C), (C + 4.4, C), (C, 54)]
ARMS = [arm(45), arm(-45)]
HUB_R = 3.6


def svg():
    pts = lambda poly: ' '.join(f'{x:.2f},{y:.2f}' for x, y in poly)
    parts = [
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">',
        f'<rect width="64" height="64" fill="{BG}"/>',
        f'<circle cx="{C}" cy="{C}" r="{RING_R}" fill="none" stroke="{INK}" stroke-width="{RING_W}"/>',
        *[f'<polygon points="{pts(p)}" fill="{INK}"/>' for p in ARMS],
        f'<polygon points="{pts(NEEDLE_S)}" fill="{DIM}"/>',
        f'<polygon points="{pts(NEEDLE_N)}" fill="{SUNSET}"/>',
        f'<circle cx="{C}" cy="{C}" r="{HUB_R}" fill="{BG}" stroke="#ffffff" stroke-width="2"/>',
        '</svg>',
    ]
    return '\n'.join(parts) + '\n'


def raster(size):
    """Mit 8-facher Auflösung zeichnen und verkleinern (glatte Kanten)."""
    s = size * 8 / 64
    big = Image.new('RGB', (size * 8, size * 8), BG)
    d = ImageDraw.Draw(big)
    sc = lambda poly: [(x * s, y * s) for x, y in poly]
    r_out, r_in = (RING_R + RING_W / 2) * s, (RING_R - RING_W / 2) * s
    d.ellipse((C * s - r_out, C * s - r_out, C * s + r_out, C * s + r_out), fill=INK)
    d.ellipse((C * s - r_in, C * s - r_in, C * s + r_in, C * s + r_in), fill=BG)
    for p in ARMS:
        d.polygon(sc(p), fill=INK)
    d.polygon(sc(NEEDLE_S), fill=DIM)
    d.polygon(sc(NEEDLE_N), fill=SUNSET)
    ro, ri = (HUB_R + 1) * s, (HUB_R - 1) * s
    d.ellipse((C * s - ro, C * s - ro, C * s + ro, C * s + ro), fill='#ffffff')
    d.ellipse((C * s - ri, C * s - ri, C * s + ri, C * s + ri), fill=BG)
    return big.resize((size, size), Image.LANCZOS)


def main():
    with open(os.path.join(PUBLIC, 'favicon.svg'), 'w') as fh:
        fh.write(svg())
    for name, size in [('favicon-16.png', 16), ('favicon-32.png', 32), ('icon-192.png', 192),
                       ('icon-512.png', 512), ('apple-touch-icon.png', 180)]:
        raster(size).save(os.path.join(PUBLIC, name), optimize=True)
    raster(48).save(os.path.join(PUBLIC, 'favicon.ico'), sizes=[(16, 16), (32, 32), (48, 48)])
    print('Icons erzeugt: favicon.svg/.ico, 16, 32, 180, 192, 512')


if __name__ == '__main__':
    main()
