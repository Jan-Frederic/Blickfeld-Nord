#!/usr/bin/env python3
"""Erzeugt die QR-Code-Karte zum Ausdrucken: public/presse/blickfeld-nord-qr-karte.pdf

Seite 1: Schild (A4) für Bühne und Theke – QR-Codes zu Website und Instagram
Seite 2: vier Flyer-Karten (A6) zum Ausschneiden

Aufruf (im Repo-Root, nach `npm ci`):  python3 scripts/build-qr-karte.py
Benötigt: reportlab, fonttools, segno  (pip install reportlab fonttools segno)
"""
import importlib.util
import os
import tempfile

import segno
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('pressekit', os.path.join(HERE, 'build-pressekit.py'))
pk = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pk)

OUT = os.path.join(pk.OUT, 'blickfeld-nord-qr-karte.pdf')
LOGO = os.path.join(pk.SRC, 'kompass-logo-hell.png')
WEBSITE = ('Website', 'blickfeld-nord.de', 'https://blickfeld-nord.de/')
INSTAGRAM = ('Instagram', '@blickfeldnord', 'https://www.instagram.com/blickfeldnord/')


def qr(c, url, x, y, size):
    """QR-Code als Vektor: dunkle Module auf hellem Feld (gut scanbar, auch bei schwachem Licht)."""
    pad = size * 0.08
    c.setFillColor(pk.INK)
    c.roundRect(x, y, size, size, size * 0.06, stroke=0, fill=1)
    code = segno.make(url, error='m')
    rows = list(code.matrix_iter(border=0))
    n = len(rows)
    cell = (size - 2 * pad) / n
    c.setFillColor(pk.NIGHT)
    for r, row in enumerate(rows):
        for col, dark in enumerate(row):
            if dark:
                # minimal überlappen, damit keine feinen Spalten zwischen Modulen entstehen
                c.rect(x + pad + col * cell, y + size - pad - (r + 1) * cell, cell + 0.05, cell + 0.05, stroke=0, fill=1)
    c.linkURL(url, (x, y, x + size, y + size), relative=0)


def wordmark(c, cx, y, size):
    """Schriftzug wie im Seitenkopf: BLICKFELD (Michroma) + N O R D (Montserrat, gesperrt)."""
    c.setFillColor(pk.INK)
    c.setFont('Michroma', size)
    a = 'BLICKFELD'
    wa = c.stringWidth(a, 'Michroma', size)
    b = 'NORD'
    bsize = size * 0.62
    spacing = bsize * 0.55
    wb = sum(c.stringWidth(ch, 'Montserrat', bsize) for ch in b) + spacing * (len(b) - 1)
    gap = size * 0.7
    x = cx - (wa + gap + wb) / 2
    c.drawString(x, y, a)
    c.setFillColor(pk.FOG)
    c.setFont('Montserrat', bsize)
    xb = x + wa + gap
    for ch in b:
        c.drawString(xb, y, ch)
        xb += c.stringWidth(ch, 'Montserrat', bsize) + spacing


def centered(c, text, cx, y, font, size, color):
    c.setFillColor(color)
    c.setFont(font, size)
    c.drawCentredString(cx, y, text)


def spaced(c, text, cx, y, font, size, color, tracking=0.22):
    """Gesperrte Großbuchstaben (wie die .kicker-Zeilen der Website), zentriert."""
    c.setFillColor(color)
    c.setFont(font, size)
    extra = size * tracking
    w = sum(c.stringWidth(ch, font, size) for ch in text) + extra * (len(text) - 1)
    x = cx - w / 2
    for ch in text:
        c.drawString(x, y, ch)
        x += c.stringWidth(ch, font, size) + extra


def qr_block(c, entry, cx, top, size):
    label, display, url = entry
    qr(c, url, cx - size / 2, top - size, size)
    spaced(c, label.upper(), cx, top - size - 9 * mm, 'Montserrat', 10, pk.SUNSET)
    centered(c, display, cx, top - size - 16 * mm, 'Inter-SemiBold', 13, pk.INK)


def sign_page(c):
    w, h = A4
    c.setFillColor(pk.NIGHT)
    c.rect(0, 0, w, h, stroke=0, fill=1)
    ls = 78 * mm
    c.drawImage(LOGO, (w - ls) / 2, h - 22 * mm - ls, ls, ls, mask='auto')
    wordmark(c, w / 2, h - 122 * mm, 26)
    centered(c, pk.TEXT['claim'], w / 2, h - 134 * mm, 'Inter', 12.5, pk.FOG)
    size = 62 * mm
    top = h - 152 * mm
    qr_block(c, WEBSITE, w / 2 - 44 * mm, top, size)
    qr_block(c, INSTAGRAM, w / 2 + 44 * mm, top, size)
    c.setStrokeColor(pk.SUNSET)
    c.setLineWidth(0.8)
    c.line(w / 2 - 20 * mm, 30 * mm, w / 2 + 20 * mm, 30 * mm)
    centered(c, 'Termine, Booking & Fotos: einfach scannen', w / 2, 20 * mm, 'Inter', 11, pk.INK)
    c.showPage()


def card(c, x, y, w, h):
    c.setFillColor(pk.NIGHT)
    c.rect(x, y, w, h, stroke=0, fill=1)
    cx = x + w / 2
    ls = 34 * mm
    c.drawImage(LOGO, cx - ls / 2, y + h - 8 * mm - ls, ls, ls, mask='auto')
    wordmark(c, cx, y + h - 52 * mm, 13)
    centered(c, 'Partyband · Feste, private Feiern und Kneipen', cx, y + h - 59 * mm, 'Inter', 7.5, pk.FOG)
    size = 42 * mm
    qr(c, WEBSITE[2], cx - size / 2, y + 26 * mm, size)
    spaced(c, 'TERMINE & BOOKING', cx, y + 18 * mm, 'Montserrat', 7, pk.SUNSET)
    centered(c, 'blickfeld-nord.de', cx, y + 12 * mm, 'Inter-SemiBold', 10, pk.INK)
    centered(c, 'Instagram @blickfeldnord', cx, y + 6.5 * mm, 'Inter', 7.5, pk.FOG)


def cards_page(c):
    w, h = A4
    cw, ch = w / 2, h / 2  # 4 × A6
    for i in range(2):
        for j in range(2):
            card(c, i * cw, j * ch, cw, ch)
    # Schnittlinien
    c.setStrokeColor(pk.FOG)
    c.setLineWidth(0.4)
    c.setDash(2, 3)
    c.line(w / 2, 0, w / 2, h)
    c.line(0, h / 2, w, h / 2)
    c.showPage()


def main():
    with tempfile.TemporaryDirectory() as tmp:
        pk.register_fonts(tmp)
        c = canvas.Canvas(OUT, pagesize=A4)
        c.setTitle('Blickfeld Nord – QR-Code-Karte')
        c.setAuthor('Blickfeld Nord')
        sign_page(c)
        cards_page(c)
        c.save()
    print(f'{os.path.relpath(OUT)}  {os.path.getsize(OUT) / 1024:.0f} KB')


if __name__ == '__main__':
    main()
