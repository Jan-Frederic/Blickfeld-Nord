#!/usr/bin/env python3
"""Verkleinert die drei Textschriften (Inter, Michroma, Montserrat aus @fontsource) auf die Zeichen, die gebraucht werden.

Behalten werden: Grundzeichen für Deutsch/Niederländisch/Englisch (Latin-1, typografische Anführungszeichen,
Gedankenstriche, €, Pfeile …) plus jedes Zeichen, das irgendwo in den Quelltexten unter src/ vorkommt – neue Texte
bekommen ihre Sonderzeichen also automatisch. Ohne Hinting (spielt auf modernen Bildschirmen keine Rolle).
Schreibt src/fonts/*.woff2 und src/fonts.css; Angular hängt beim Build einen Inhalts-Hash an (Cache-Busting).
Läuft beim Deploy vor dem Build; lokal: pip install fonttools brotli && python3 scripts/subset-fonts.py
"""
import glob
import os

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTSOURCE = os.path.join(ROOT, 'node_modules', '@fontsource')
OUT_DIR = os.path.join(ROOT, 'src', 'fonts')
OUT_CSS = os.path.join(ROOT, 'src', 'fonts.css')

# (Familie im CSS, Paket, Schnitt)
FONTS = [
    ('Inter', 'inter', 400),
    ('Inter', 'inter', 500),
    ('Inter', 'inter', 600),
    ('Michroma', 'michroma', 400),
    ('Montserrat', 'montserrat', 300),
    ('Montserrat', 'montserrat', 400),
]

BASE = set(range(0x20, 0x7F)) | set(range(0xA0, 0x100)) | {
    0x152, 0x153, 0x2009, 0x200A, 0x202F, 0x2013, 0x2014, 0x2018, 0x2019, 0x201A, 0x201C, 0x201D, 0x201E,
    0x2022, 0x2026, 0x2032, 0x2033, 0x2039, 0x203A, 0x20AC, 0x2190, 0x2192, 0x2191, 0x2193, 0x2212, 0x2122,
}

# Opentype-Funktionen, die die Seite nutzt (u. a. tabular-nums für Zahlen in Tabellen und Countdown)
FEATURES = ['kern', 'liga', 'calt', 'ccmp', 'locl', 'mark', 'mkmk', 'tnum', 'lnum', 'case']


def used_chars():
    chars = set()
    for path in glob.glob(os.path.join(ROOT, 'src', '**', '*.*'), recursive=True):
        if path.endswith(('.ts', '.html', '.json', '.scss', '.css')) and '/fonts/' not in path:
            with open(path, encoding='utf-8', errors='ignore') as fh:
                chars |= {ord(c) for c in fh.read() if ord(c) >= 0x20}
    # Emojis & Co. kommen ohnehin aus der Systemschrift
    return {c for c in chars if c < 0x2600 or 0xFB00 <= c <= 0xFB06}


def main():
    unicodes = sorted(BASE | used_chars())
    os.makedirs(OUT_DIR, exist_ok=True)
    css = ['/* Erzeugt von scripts/subset-fonts.py – nicht von Hand ändern */']
    before = after = 0
    for family, pkg, weight in FONTS:
        src = os.path.join(FONTSOURCE, pkg, 'files', f'{pkg}-latin-{weight}-normal.woff2')
        name = f'{pkg}-{weight}.woff2'
        font = TTFont(src)
        opts = subset.Options()
        opts.flavor = 'woff2'
        opts.hinting = False
        opts.desubroutinize = True
        opts.layout_features = FEATURES
        opts.name_IDs = [0, 1, 2, 3, 4, 5, 6]
        sub = subset.Subsetter(opts)
        sub.populate(unicodes=unicodes)
        sub.subset(font)
        font.flavor = 'woff2'
        font.save(os.path.join(OUT_DIR, name))
        before += os.path.getsize(src)
        after += os.path.getsize(os.path.join(OUT_DIR, name))
        css.append(
            f"@font-face {{ font-family: '{family}'; font-style: normal; font-weight: {weight}; font-display: swap; "
            f"src: url('./fonts/{name}') format('woff2'); }}"
        )
    with open(OUT_CSS, 'w', encoding='utf-8') as fh:
        fh.write('\n'.join(css) + '\n')
    print(f'{len(FONTS)} Schriften, {len(unicodes)} Zeichen: {before // 1024} KB → {after // 1024} KB')


if __name__ == '__main__':
    main()
