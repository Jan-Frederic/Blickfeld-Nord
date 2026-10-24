"""Erzeugt das freigestellte Kompass-Logo als SVG (Vektor, transparenter Hintergrund).

Nachbau des Kompasses aus dem Logo-Motiv (scripts/presse-quellen/kompass.jpg).
Aufruf:  python3 scripts/kompass-logo.py
Ausgabe: scripts/presse-quellen/kompass-logo-hell.svg  (für dunkle Hintergründe)
         scripts/presse-quellen/kompass-logo-dunkel.svg (für helle Hintergründe)
Gradzahlen und Himmelsrichtungen werden als Pfade gezeichnet (Montserrat aus node_modules/@fontsource) – so sehen
die SVGs in jedem Grafikprogramm gleich aus, auch ohne installierte Schrift. Benötigt fonttools.
"""
import math
import os

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

SIZE = 1500
C = SIZE / 2
OUT = os.path.join(os.path.dirname(__file__), 'presse-quellen')


def pol(r, deg):
    """Punkt auf Kreis; 0° = Norden, im Uhrzeigersinn."""
    a = math.radians(deg - 90)
    return C + r * math.cos(a), C + r * math.sin(a)


def f(v):
    return f'{v:.1f}'


FONTS = os.path.join(os.path.dirname(__file__), '..', 'node_modules', '@fontsource', 'montserrat', 'files')
_fonts = {}


def text_path(text, x, y, size, weight, tracking=0.0):
    """Text als Pfad: zentriert um x, senkrecht mittig um y (wie text-anchor=middle, dominant-baseline=central)."""
    if weight not in _fonts:
        _fonts[weight] = TTFont(os.path.join(FONTS, f'montserrat-latin-{weight}-normal.woff'))
    font = _fonts[weight]
    glyphs, cmap, upm = font.getGlyphSet(), font.getBestCmap(), font['head'].unitsPerEm
    hhea = font['hhea']
    scale = size / upm
    width = sum(glyphs[cmap[ord(c)]].width * scale + tracking for c in text)
    baseline = y + (hhea.ascent + hhea.descent) / 2 * scale
    pen = SVGPathPen(glyphs, lambda v: f'{v:.2f}'.rstrip('0').rstrip('.'))
    cx = x - width / 2
    for c in text:
        g = glyphs[cmap[ord(c)]]
        g.draw(TransformPen(pen, (scale, 0, 0, -scale, cx, baseline)))
        cx += g.width * scale + tracking
    return pen.getCommands()


def build(ink, shade, bg_cut):
    p = []
    add = p.append
    add(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {SIZE} {SIZE}" width="{SIZE}" height="{SIZE}">')
    add('<title>Blickfeld Nord – Kompass</title>')
    add(f'<g fill="none" stroke="{ink}">')
    # äußerer Ring, Gradring, innere Kreise
    add(f'<circle cx="{C}" cy="{C}" r="612" stroke-width="2.5" opacity=".55"/>')
    add(f'<circle cx="{C}" cy="{C}" r="546" stroke-width="5"/>')
    add(f'<circle cx="{C}" cy="{C}" r="492" stroke-width="2" opacity=".6"/>')
    add(f'<circle cx="{C}" cy="{C}" r="470" stroke-width="1.5" stroke-dasharray="2 7" opacity=".45"/>')
    add(f'<circle cx="{C}" cy="{C}" r="170" stroke-width="1.5" opacity=".4"/>')
    # Fadenkreuz
    add(f'<path d="M{C} {C - 492}V{C + 492}M{C - 492} {C}H{C + 492}" stroke-width="1.5" opacity=".4"/>')
    # Gradstriche nach innen
    ticks = []
    for d in range(360):
        if d % 10 == 0:
            ln, w = 40, 3.2
        elif d % 5 == 0:
            ln, w = 26, 2.4
        else:
            ln, w = 14, 1.6
        x1, y1 = pol(546, d)
        x2, y2 = pol(546 - ln, d)
        ticks.append(f'<line x1="{f(x1)}" y1="{f(y1)}" x2="{f(x2)}" y2="{f(y2)}" stroke-width="{w}"/>')
    add(''.join(ticks))
    # Himmelsrichtungs-Marken am Gradring
    for d in (0, 90, 180, 270):
        x1, y1 = pol(612, d)
        x2, y2 = pol(560, d)
        add(f'<line x1="{f(x1)}" y1="{f(y1)}" x2="{f(x2)}" y2="{f(y2)}" stroke-width="3"/>')
    add('</g>')

    # Gradzahlen (010 … 350) tangential, Himmelsrichtungen N/O/S/W
    add(f'<g fill="{ink}">')
    for d in range(10, 360, 10):
        if d % 90 == 0:
            continue
        x, y = pol(580, d)
        rot = d + 180 if 90 < d < 270 else d  # untere Hälfte lesbar statt kopfüber
        add(f'<path transform="rotate({rot} {f(x)} {f(y)})" d="{text_path(f"{d:03d}", x, y, 24, 500, 1)}"/>')
    for d, label in ((0, 'N'), (90, 'O'), (180, 'S'), (270, 'W')):
        x, y = pol(618, d)
        add(f'<path d="{text_path(label, x, y, 36, 700)}"/>')
    # Nordmarke
    add(f'<path d="M{C - 17} {C - 590}H{C + 17}L{C} {C - 556}Z"/>')
    # dekorative Peildreiecke
    for d in (315, 45, 225):
        x, y = pol(455, d)
        add(f'<path d="M-14 -18L20 0L-14 18Z" transform="translate({f(x)} {f(y)}) rotate({d})" opacity=".75"/>')
    add('</g>')

    # Bogen mit Skala zwischen den Zirkelschenkeln
    a0, a1 = 45, 135
    r = 240
    x0, y0 = pol(r, a0)
    x1, y1 = pol(r, a1)
    add(f'<path d="M{f(x0)} {f(y0)}A{r} {r} 0 0 1 {f(x1)} {f(y1)}" fill="none" stroke="{ink}" stroke-width="14"/>')
    sc = []
    for d in range(a0 + 4, a1 - 3, 4):
        xa, ya = pol(r - 7, d)
        xb, yb = pol(r + 1, d)
        sc.append(f'<line x1="{f(xa)}" y1="{f(ya)}" x2="{f(xb)}" y2="{f(yb)}"/>')
    add(f'<g stroke="{bg_cut}" stroke-width="2">{"".join(sc)}</g>')
    kx, ky = pol(r, 68)
    add(f'<circle cx="{f(kx)}" cy="{f(ky)}" r="17" fill="{ink}" stroke="{bg_cut}" stroke-width="3"/>')
    add(f'<rect x="{f(kx - 10)}" y="{f(ky - 2.5)}" width="20" height="5" fill="{bg_cut}"/>')

    # Zirkelschenkel
    def leg(deg):
        g = [f'<g transform="rotate({deg} {C} {C})">']
        # Schenkel: vom Zentrum bis kurz vor die Spitze, dann Nadel
        g.append(f'<path d="M{C - 15} {C}L{C - 13} {C - 420}H{C + 13}L{C + 15} {C}Z" fill="{ink}"/>')
        g.append(f'<path d="M{C - 15} {C}L{C - 13} {C - 420}H{C}V{C}Z" fill="{shade}" opacity=".35"/>')
        g.append(f'<rect x="{C - 19}" y="{C - 448}" width="38" height="36" rx="3" fill="{ink}" stroke="{bg_cut}" stroke-width="3"/>')
        g.append(f'<circle cx="{C}" cy="{C - 430}" r="6" fill="{bg_cut}" opacity=".6"/>')
        g.append(f'<path d="M{C - 7} {C - 448}L{C} {C - 525}L{C + 7} {C - 448}Z" fill="{ink}"/>')
        g.append('</g>')
        return ''.join(g)
    add(leg(42))
    add(leg(138))

    # Kompassnadel: Nord hell, Süd halbtransparent, jeweils zweigeteilt schattiert
    add(f'<path d="M{C} {C - 450}L{C + 36} {C}H{C - 36}Z" fill="{ink}"/>')
    add(f'<path d="M{C} {C - 450}L{C + 36} {C}H{C}Z" fill="{shade}" opacity=".18"/>')
    add(f'<path d="M{C} {C + 450}L{C + 36} {C}H{C - 36}Z" fill="{ink}" opacity=".62"/>')
    add(f'<path d="M{C} {C + 450}L{C - 36} {C}H{C}Z" fill="{shade}" opacity=".2"/>')

    # Griff nach Westen
    add(f'<rect x="{C - 112}" y="{C - 15}" width="82" height="30" rx="4" fill="{ink}"/>')
    grooves = ''.join(
        f'<line x1="{C - 100 + i * 9}" y1="{C - 15}" x2="{C - 100 + i * 9}" y2="{C + 15}"/>' for i in range(7)
    )
    add(f'<g stroke="{bg_cut}" stroke-width="2" opacity=".7">{grooves}</g>')
    add(f'<circle cx="{C - 122}" cy="{C}" r="12" fill="{ink}" stroke="{bg_cut}" stroke-width="3"/>')

    # Nabe mit Schraubenschlitz
    add(f'<circle cx="{C}" cy="{C}" r="44" fill="{ink}" stroke="{bg_cut}" stroke-width="3"/>')
    add(f'<circle cx="{C}" cy="{C}" r="33" fill="none" stroke="{bg_cut}" stroke-width="2" opacity=".6"/>')
    add(f'<line x1="{C - 16}" y1="{C + 10}" x2="{C + 16}" y2="{C - 10}" stroke="{bg_cut}" stroke-width="5" stroke-linecap="round"/>')
    add('</svg>')
    return '\n'.join(p) + '\n'


if __name__ == '__main__':
    # hell: weiße Linien für dunkle Hintergründe; dunkel: für helle Hintergründe
    variants = {
        'kompass-logo-hell.svg': ('#ece9e4', '#1b1e22', '#1b1e22'),
        'kompass-logo-dunkel.svg': ('#1b1e22', '#ece9e4', '#ece9e4'),
    }
    for name, (ink, shade, cut) in variants.items():
        with open(os.path.join(OUT, name), 'w') as fh:
            fh.write(build(ink, shade, cut))
        print('geschrieben:', name)
