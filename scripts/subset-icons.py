#!/usr/bin/env python3
"""Verkleinert die Material-Icons-Schrift (~128 KB, >2000 Symbole) auf die Symbole, die die Seite nutzt.

Findet alle Icon-Namen in den Templates unter src/ (<mat-icon>name</mat-icon> sowie 'a' : 'b' in Ausdrücken),
behält nur deren Ligaturen und schreibt public/fonts/material-icons-subset.woff2.
Läuft beim Deploy vor dem Build; lokal: pip install fonttools brotli && python3 scripts/subset-icons.py
"""
import hashlib
import os
import re
import sys

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_FONT = os.path.join(ROOT, 'node_modules', 'material-icons', 'iconfont', 'material-icons.woff2')
OUT_FONT = os.path.join(ROOT, 'public', 'fonts', 'material-icons-subset.woff2')

ICON_TAG = re.compile(r'<mat-icon[^>]*>(.*?)</mat-icon>', re.S)
# Icon-Namen in Datenlisten, z. B. { icon: 'build', label: … } – angezeigt per <mat-icon>{{ f.icon }}</mat-icon>
ICON_FIELD = re.compile(r"\bicon:\s*'([a-z][a-z0-9_]*)'")
NAME = re.compile(r"[a-z][a-z0-9_]*")


def used_icons():
    """Namen aus <mat-icon> (müssen existieren) und aus Datenlisten (optional – dort stehen auch eigene SVG-Symbole)."""
    names, optional = set(), set()
    for base, _, files in os.walk(os.path.join(ROOT, 'src')):
        for f in files:
            if f.endswith(('.ts', '.html')):
                with open(os.path.join(base, f), encoding='utf-8') as fh:
                    text = fh.read()
                    optional.update(ICON_FIELD.findall(text))
                    for content in ICON_TAG.findall(text):
                        content = content.strip()
                        if '{{' in content:  # z. B. {{ ok ? 'check' : 'schedule' }}
                            names.update(re.findall(r"'([a-z][a-z0-9_]*)'", content))
                        elif NAME.fullmatch(content):
                            names.add(content)
    return sorted(names), sorted(optional - names)


def ligature_glyphs(font, names):
    cmap = font.getBestCmap()
    wanted = {tuple(cmap[ord(c)] for c in n): n for n in names}
    found = {}
    for lookup in font['GSUB'].table.LookupList.Lookup:
        for st in lookup.SubTable:
            st = getattr(st, 'ExtSubTable', st)
            for first, ligs in getattr(st, 'ligatures', {}).items():
                for lig in ligs:
                    key = (first, *lig.Component)
                    if key in wanted:
                        found[wanted[key]] = lig.LigGlyph
    return found


def main():
    names, optional = used_icons()
    font = TTFont(SRC_FONT)
    found = ligature_glyphs(font, names + optional)
    missing = sorted(set(names) - set(found))
    if missing:
        sys.exit(f'Unbekannte Icon-Namen: {", ".join(missing)}')
    # Nicht benötigte Ligaturen entfernen – sonst hält der Subsetter über die Buchstaben alle ~2000 Icons
    keep = set(found.values())
    for lookup in font['GSUB'].table.LookupList.Lookup:
        for st in lookup.SubTable:
            st = getattr(st, 'ExtSubTable', st)
            if hasattr(st, 'ligatures'):
                st.ligatures = {
                    first: [lig for lig in ligs if lig.LigGlyph in keep]
                    for first, ligs in st.ligatures.items()
                    if any(lig.LigGlyph in keep for lig in ligs)
                }
    options = subset.Options()
    options.flavor = 'woff2'
    options.layout_features = ['liga', 'rlig']  # die Icons nutzen 'rlig'
    options.glyph_names = True
    sub = subset.Subsetter(options)
    letters = [ord(c) for c in 'abcdefghijklmnopqrstuvwxyz0123456789_']
    sub.populate(glyphs=list(found.values()), unicodes=letters)
    sub.subset(font)
    os.makedirs(os.path.dirname(OUT_FONT), exist_ok=True)
    font.save(OUT_FONT)
    bust_cache()
    print(f'{len(found)} Icons → {OUT_FONT} ({os.path.getsize(OUT_FONT) / 1024:.1f} KB): {", ".join(sorted(found))}')


def bust_cache():
    """Verweise auf die Schrift mit ?v=<Inhalts-Hash> versehen: Ändert sich die Icon-Auswahl, laden Browser die neue
    Schrift statt einer alten aus dem Cache (sonst fehlen neue Icons, bis der Cache abläuft)."""
    with open(OUT_FONT, 'rb') as fh:
        version = hashlib.sha256(fh.read()).hexdigest()[:10]
    for rel in ('src/index.html', 'src/icons.css'):
        path = os.path.join(ROOT, rel)
        with open(path, encoding='utf-8') as fh:
            text = fh.read()
        new = re.sub(r'(fonts/material-icons-subset\.woff2)(\?v=[0-9a-f]+)?', rf'\1?v={version}', text)
        if new != text:
            with open(path, 'w', encoding='utf-8') as fh:
                fh.write(new)


if __name__ == '__main__':
    main()
