"""Fotos für den Build vorbereiten (läuft beim Deploy vor dem Build, ändert nur die Arbeitskopie).

- Für jedes Foto aus `photos` in band.service.ts fehlende Vorschaubilder erzeugen
  (`…-thumb.webp` max. 900 px sowie die Varianten `-thumb-480.webp` und `-thumb-720.webp`).
  Neue Fotos brauchen deshalb nur das große Bild – siehe PFLEGE.md.
- Große Bilder auf max. 2000 px verkleinern und dabei Metadaten entfernen.
- Abbruch mit verständlicher Meldung, wenn ein eingetragenes Bild fehlt oder ein Bild im Repo
  einen GPS-Standort enthält (der wäre sonst öffentlich).

Aufruf: python scripts/bilder.py  (benötigt Pillow)
"""
import pathlib
import re
import sys

from PIL import Image, ImageOps

ROOT = pathlib.Path(__file__).resolve().parent.parent
PUBLIC = ROOT / 'public'
DATA = (ROOT / 'src/app/data/band.service.ts').read_text(encoding='utf-8')
MAX_BIG = 2000
GPS_IFD = 0x8825
errors: list[str] = []


def save(im: Image.Image, path: pathlib.Path) -> None:
    fmt = {'.webp': 'WEBP', '.jpg': 'JPEG', '.jpeg': 'JPEG', '.png': 'PNG'}[path.suffix.lower()]
    if fmt == 'JPEG' and im.mode != 'RGB':
        im = im.convert('RGB')
    im.save(path, fmt, quality=82)


def fit(im: Image.Image, box: int) -> Image.Image:
    im = im.copy()
    im.thumbnail((box, box), Image.LANCZOS)
    return im


def width(im: Image.Image, w: int) -> Image.Image:
    if im.width <= w:
        return im
    return im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)


# 1. Kein Bild mit GPS-Standort
for path in sorted(PUBLIC.rglob('*')):
    if path.suffix.lower() not in ('.jpg', '.jpeg', '.webp', '.png'):
        continue
    with Image.open(path) as im:
        if im.getexif().get_ifd(GPS_IFD):
            errors.append(f'{path.relative_to(ROOT)} enthält einen GPS-Standort – bitte ohne Standort neu hochladen (PFLEGE.md, „Fotos“).')

# 2. Große Bilder aus `photos` und `history` verkleinern, Metadaten entfernen
big = set(re.findall(r"\bsrc: '([^']+\.(?:webp|jpe?g|png))'", DATA))
for src in sorted(big):
    path = PUBLIC / src
    if not path.exists():
        errors.append(f'Bild „{src}“ ist in band.service.ts eingetragen, fehlt aber in public/.')
        continue
    with Image.open(path) as im:
        if max(im.size) <= MAX_BIG and not im.getexif() and not im.info.get('exif'):
            continue
        out = fit(ImageOps.exif_transpose(im), MAX_BIG)
    save(out, path)
    print(f'verkleinert/bereinigt: {src} → {out.size[0]}×{out.size[1]}')

# 3. Fehlende Vorschaubilder der Galerie erzeugen
for src, thumb in re.findall(r"\{ src: '([^']+)', thumb: '([^']+)'", DATA):
    source = PUBLIC / src
    if not source.exists():
        continue
    with Image.open(source) as im:
        im = ImageOps.exif_transpose(im)
        im.load()
    t900 = PUBLIC / thumb
    if not t900.exists():
        save(fit(im, 900), t900)
        print(f'erzeugt: {thumb}')
    with Image.open(t900) as base:
        base.load()
        for w in (480, 720):
            variant = t900.with_name(t900.name.replace('-thumb.webp', f'-thumb-{w}.webp'))
            if variant != t900 and not variant.exists():
                save(width(base, w), variant)
                print(f'erzeugt: {variant.relative_to(PUBLIC)}')

if errors:
    print('\n'.join('FEHLER: ' + e for e in errors), file=sys.stderr)
    sys.exit(1)
print('Bilder geprüft.')
