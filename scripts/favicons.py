#!/usr/bin/env python3
"""Erzeugt alle Website- und App-Icons aus der Kompass-Grafik der Band (scripts/assets/kompass-icon.png, heller
Kompass auf transparentem Grund): icon-192.png, icon-512.png, icon-maskable-512.png, apple-touch-icon.png (180) –
die Grafik auf dunklem Grund. Für die Favicons (favicon.svg, favicon.ico 16/32/48, favicon-16.png, favicon-32.png)
wären die feinen Linien der Grafik zu dünn: dort dieselben Formen vereinfacht (Ring, Nadel, „K“, Nabe), hell auf
dunklem Grund – favicon.svg als echter Vektor.
Beim maskierbaren Icon (Android schneidet es rund oder eckig zu) liegt der Kompass ganz in der sicheren Zone
(innere 80 %). Hintergrund randlos (keine abgerundeten Ecken) – Google zeigt das Icon im Suchergebnis als Kreis.

Dazu public/badge-96.png: das kleine Symbol für Benachrichtigungen in der Android-Statusleiste. Android nutzt davon
nur die Deckkraft (alles Deckende wird weiß) – ein vollflächiges Icon erschiene als weißes Quadrat. Deshalb eine
vereinfachte Silhouette des Kompasses (Ring, Nord-Süd-Nadel, die beiden Arme, Nabe) weiß auf transparent; die
feinen Gradstriche der Grafik wären bei 24 dp nur Brei.
Aufruf:  python3 scripts/favicons.py   (benötigt pillow)
"""
import math
import os

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(ROOT, 'public')
QUELLE = os.path.join(ROOT, 'scripts', 'assets', 'kompass-icon.png')

BG = (21, 23, 28, 255)  # #15171c wie bisher, passt zur Nabe der Grafik


def kompass(size, anteil):
    """Kompass auf dunklem Grund; anteil: Durchmesser der Grafik (mit N/S/W/O) im Verhältnis zur Kantenlänge."""
    quelle = Image.open(QUELLE).convert('RGBA')
    d = max(1, round(size * anteil))
    klein = quelle.resize((d, d), Image.LANCZOS)
    bild = Image.new('RGBA', (size, size), BG)
    bild.alpha_composite(klein, ((size - d) // 2, (size - d) // 2))
    return bild.convert('RGB')


# vereinfachte Silhouette (Einheitskreis 0..1): Ring, Nord-Süd-Nadel, die beiden Arme (das „K“), Nabe mit Loch
RING_AUSSEN, RING_INNEN = 0.47, 0.40
NADEL_BREITE = 0.075
NABE_AUSSEN, NABE_INNEN = 0.11, 0.06


def arme():
    out = []
    for winkel in (45, -45):
        a = math.radians(winkel)
        rx, ry = math.cos(a), -math.sin(a)
        nx, ny = -ry, rx
        h, lang = 0.035, 0.44
        spitze = (0.5 + rx * lang, 0.5 + ry * lang)
        sch = (0.5 + rx * (lang - 0.08), 0.5 + ry * (lang - 0.08))
        out.append([(0.5 + nx * h, 0.5 + ny * h), (sch[0] + nx * h, sch[1] + ny * h), spitze,
                    (sch[0] - nx * h, sch[1] - ny * h), (0.5 - nx * h, 0.5 - ny * h)])
    return out


NADEL = [(0.5, 0.05), (0.5 + NADEL_BREITE, 0.5), (0.5, 0.95), (0.5 - NADEL_BREITE, 0.5)]


def silhouette(size):
    """Deckkraft-Maske der Silhouette, mit 8-facher Auflösung gezeichnet."""
    g = size * 8
    bild = Image.new('L', (g, g), 0)
    d = ImageDraw.Draw(bild)
    kreis = lambda r: (g * (0.5 - r), g * (0.5 - r), g * (0.5 + r), g * (0.5 + r))
    sk = lambda poly: [(x * g, y * g) for x, y in poly]
    d.ellipse(kreis(RING_AUSSEN), fill=255)
    d.ellipse(kreis(RING_INNEN), fill=0)
    d.polygon(sk(NADEL), fill=255)
    for arm in arme():
        d.polygon(sk(arm), fill=255)
    d.ellipse(kreis(NABE_AUSSEN), fill=255)
    d.ellipse(kreis(NABE_INNEN), fill=0)
    return bild.resize((size, size), Image.LANCZOS)


def badge(size=96):
    """Statusleiste: Silhouette weiß auf transparent."""
    weiss = Image.new('RGBA', (size, size), (255, 255, 255, 0))
    weiss.putalpha(silhouette(size))
    return weiss


HELL = (233, 230, 225, 255)  # Linienfarbe der Grafik


def mini(size):
    """Favicons (16–48 px): die feinen Gradstriche der Grafik wären Brei – Silhouette hell auf dunklem Grund."""
    rand = max(1, round(size * 0.04))
    innen = size - 2 * rand
    bild = Image.new('RGBA', (size, size), BG)
    farbe = Image.new('RGBA', (innen, innen), HELL)
    farbe.putalpha(silhouette(innen))
    bild.alpha_composite(farbe, (rand, rand))
    return bild.convert('RGB')


def svg():
    """favicon.svg: die Silhouette als Vektor (scharf in jeder Tab-Größe)."""
    f = lambda v: f'{v * 64:.2f}'
    pts = lambda poly: ' '.join(f'{f(x)},{f(y)}' for x, y in poly)
    hell = '#e9e6e1'
    rm, rb = (RING_AUSSEN + RING_INNEN) / 2, RING_AUSSEN - RING_INNEN
    nm, nb = (NABE_AUSSEN + NABE_INNEN) / 2, NABE_AUSSEN - NABE_INNEN
    teile = [
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">',
        '<rect width="64" height="64" fill="#15171c"/>',
        '<g transform="translate(1.28 1.28) scale(0.96)">',
        f'<circle cx="32" cy="32" r="{f(rm)}" fill="none" stroke="{hell}" stroke-width="{f(rb)}"/>',
        f'<polygon points="{pts(NADEL)}" fill="{hell}"/>',
        *[f'<polygon points="{pts(a)}" fill="{hell}"/>' for a in arme()],
        f'<circle cx="32" cy="32" r="{f(nm)}" fill="#15171c" stroke="{hell}" stroke-width="{f(nb)}"/>',
        '</g></svg>',
    ]
    return '\n'.join(teile) + '\n'


def main():
    with open(os.path.join(PUBLIC, 'favicon.svg'), 'w') as fh:
        fh.write(svg())
    for name, size in [('favicon-16.png', 16), ('favicon-32.png', 32)]:
        mini(size).save(os.path.join(PUBLIC, name), optimize=True)
    for name, size in [('icon-192.png', 192), ('icon-512.png', 512), ('apple-touch-icon.png', 180)]:
        kompass(size, 0.96).save(os.path.join(PUBLIC, name), optimize=True)
    # maskierbar: Kompass in der sicheren Zone (Kreis mit 80 % Durchmesser)
    kompass(512, 0.78).save(os.path.join(PUBLIC, 'icon-maskable-512.png'), optimize=True)
    mini(48).save(os.path.join(PUBLIC, 'favicon.ico'), sizes=[(16, 16), (32, 32), (48, 48)])
    badge(96).save(os.path.join(PUBLIC, 'badge-96.png'), optimize=True)
    print('Icons erzeugt: favicon.svg/.ico, 16, 32, 180, 192, 512, maskierbar 512, Badge 96')


if __name__ == '__main__':
    main()
