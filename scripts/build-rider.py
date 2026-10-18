#!/usr/bin/env python3
"""Erzeugt den Technik-Rider für Veranstalter: public/presse/blickfeld-nord-technik-rider.pdf

Aufruf (im Repo-Root, nach `npm ci`):  python3 scripts/build-rider.py
Benötigt: pillow, reportlab, fonttools
Angaben stehen unten in RIDER – bei Änderungen auch die FAQ in src/app/sections/booking.ts und die Technik-Seite src/app/pages/technik.ts anpassen.
"""
import importlib.util
import os
import tempfile
from datetime import date

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('pressekit', os.path.join(HERE, 'build-pressekit.py'))
pk = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pk)

OUT = os.path.join(pk.OUT, 'blickfeld-nord-technik-rider.pdf')
LOGO = os.path.join(pk.SRC, 'kompass-logo-hell.png')

RIDER = [
    ('Platz, Strom & Technik', [
        ('Spielfläche', 'ca. 4 × 3 m'),
        ('Strom', '2 Steckdosen in der Nähe der Spielfläche'),
        ('PA & Licht', 'bringen wir selbst mit'),
    ]),
    ('Zeitplan', [
        ('Aufbau', 'ca. 3 Stunden vor Beginn'),
        ('Spielzeit', '3 bis 4 Stunden, in Sets à 1 Stunde'),
        ('Pausen', 'nach Absprache oder spontan'),
        ('Abbau', 'ca. 1 Stunde'),
    ]),
    ('Buchung', [
        ('Anfahrt', 'im Umkreis von bis zu 50 km rund um Hamminkeln'),
        ('Vorlauf', 'mindestens 4 Wochen im Voraus'),
    ]),
]


def header(c, w, h):
    band = 46 * mm
    c.setFillColor(pk.NIGHT)
    c.rect(0, h - band, w, band, stroke=0, fill=1)
    ls = 34 * mm
    c.drawImage(LOGO, w - 20 * mm - ls, h - band + (band - ls) / 2, ls, ls, mask='auto')
    m = 20 * mm
    pk.kicker(c, 'Für Veranstalter', m, h - 17 * mm)
    c.setFont('Michroma', 22)
    c.setFillColor(pk.INK)
    c.drawString(m, h - 30 * mm, 'TECHNIK-RIDER')
    c.setFont('Montserrat', 10)
    c.setFillColor(pk.FOG)
    c.drawString(m, h - 38 * mm, 'Blickfeld Nord · ' + pk.TEXT['claim'])


def main():
    w, h = A4
    m = 20 * mm
    with tempfile.TemporaryDirectory() as tmp:
        pk.register_fonts(tmp)
        c = canvas.Canvas(OUT, pagesize=A4)
        c.setTitle('Blickfeld Nord – Technik-Rider')
        c.setAuthor('Blickfeld Nord')
        header(c, w, h)

        y = h - 62 * mm
        label_w = 52 * mm
        for section, rows in RIDER:
            pk.heading(c, section, m, y, size=12)
            y -= 4 * mm
            c.setStrokeColor(HexColor('#c27a3e'))
            c.setLineWidth(1)
            c.line(m, y, m + 10 * mm, y)
            y -= 8 * mm
            for label, value in rows:
                c.setFont('Montserrat', 8)
                c.setFillColor(pk.TEXT_MID)
                c.drawString(m, y, ' '.join(label.upper()))
                pk.paragraph(c, value, m + label_w, y, w - 2 * m - label_w, size=11, leading=14)
                y -= 4 * mm
                c.setStrokeColor(pk.LINE)
                c.setLineWidth(0.5)
                c.line(m, y, w - m, y)
                y -= 5.5 * mm
            y -= 6 * mm

        # Besetzung und Kontakt
        pk.heading(c, 'Besetzung', m, y, size=12)
        y -= 9 * mm
        members = ' · '.join(f'{n} ({r})' for n, r in pk.TEXT['members'])
        y = pk.paragraph(c, members, m, y, w - 2 * m, size=10.5, leading=15) - 8 * mm
        pk.heading(c, 'Kontakt', m, y, size=12)
        y -= 9 * mm
        for label, value, url in [e for e in pk.TEXT['contact'] if e[0] in ('Booking', 'Instagram', 'Website')]:
            c.setFont('Montserrat', 8)
            c.setFillColor(pk.TEXT_MID)
            c.drawString(m, y, ' '.join(label.upper()))
            c.setFont('Inter', 10.5)
            c.setFillColor(pk.TEXT_DARK)
            c.drawString(m + label_w, y, value)
            c.linkURL(url, (m + label_w, y - 2, m + label_w + c.stringWidth(value, 'Inter', 10.5), y + 10), relative=0)
            y -= 6.5 * mm

        c.setFont('Montserrat', 7.5)
        c.setFillColor(pk.TEXT_MID)
        c.drawString(m, 12 * mm, 'BLICKFELD NORD · TECHNIK-RIDER · BLICKFELD-NORD.DE')
        c.drawRightString(w - m, 12 * mm, f'Stand {date.today():%m/%Y}')
        c.showPage()
        c.save()
    print(f'{os.path.relpath(OUT)}  {os.path.getsize(OUT) / 1024:.0f} KB')


if __name__ == '__main__':
    main()
