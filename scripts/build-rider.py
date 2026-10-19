#!/usr/bin/env python3
"""Erzeugt den Technik-Rider für Veranstalter: public/presse/blickfeld-nord-technik-rider.pdf

Aufruf (im Repo-Root, nach `npm ci`):  python3 scripts/build-rider.py
Benötigt: pillow, reportlab, fonttools
Angaben stehen unten in RIDER – bei Änderungen auch die FAQ in src/app/sections/booking.ts und die Technik-Seite src/app/pages/technik.ts anpassen.
Seite 2 (Bühnenplan, Kanalliste, Monitore, Strom) kommt aus src/app/data/technik.json – derselben Datei wie auf /technik.
"""
import importlib.util
import json
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
with open(os.path.join(HERE, '..', 'src', 'app', 'data', 'technik.json'), encoding='utf-8') as fh:
    TECHNIK = json.load(fh)

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


def stage_plot(c, x0, top, width):
    """Bühnenplan als Draufsicht (druckfreundlich: dunkle Linien auf Weiß), Publikum unten."""
    bw, bd = TECHNIK['buehne']['breite'], TECHNIK['buehne']['tiefe']
    pad = 16 * mm  # Platz für die PA links und rechts
    m = (width - 2 * pad) / bw
    px = lambda v: x0 + pad + v * m
    py = lambda v: top - v * m  # y wächst nach unten (Rückseite oben)
    c.setStrokeColor(pk.TEXT_DARK)
    c.setLineWidth(1.2)
    c.rect(px(0), py(bd), bw * m, bd * m, stroke=1, fill=0)
    c.setStrokeColor(pk.LINE)
    c.setLineWidth(0.5)
    c.setDash(2, 3)
    for g in range(1, bw):
        c.line(px(g), py(0), px(g), py(bd))
    for g in range(1, bd):
        c.line(px(0), py(g), px(bw), py(g))
    c.setDash()

    def label(text, x, y, size=7, color=pk.TEXT_MID, font='Inter'):
        c.setFont(font, size)
        c.setFillColor(color)
        c.drawCentredString(x, y, text)

    for it in TECHNIK['aufbau']:
        x, y, t = px(it['x']), py(it['y']), it['typ']
        c.setStrokeColor(pk.TEXT_DARK)
        c.setLineWidth(0.9)
        if t in ('drums', 'amp', 'mixer'):
            w, h = it['b'] * m, it['t'] * m
            c.setDash(*((3, 2) if t == 'drums' else ()))
            c.rect(x - w / 2, y - h / 2, w, h, stroke=1, fill=0)
            c.setDash()
            label(it['label'], x, y + h / 2 - 9 if t == 'drums' else y - 2)
        elif t == 'person':
            c.setFillColor(pk.SUNSET)
            c.circle(x, y, 4.2 * mm, stroke=0, fill=1)
            label(it['label'][0], x, y - 3, 9, pk.TEXT_DARK, 'Inter-SemiBold')
            if it['id'] != 'matthias':
                label(it['label'], x, y - 8 * mm, 8, pk.TEXT_DARK, 'Inter-SemiBold')
                label(it.get('rolle', ''), x, y - 11 * mm)
            else:
                label(it['label'], x, y - 7.5 * mm, 7, pk.TEXT_DARK, 'Inter-SemiBold')
        elif t == 'monitor':
            p = c.beginPath()
            if it.get('drehung'):
                p.moveTo(x - 2.5 * mm, y - 5 * mm); p.lineTo(x - 2.5 * mm, y + 5 * mm); p.lineTo(x + 2.5 * mm, y + 4 * mm); p.lineTo(x + 2.5 * mm, y - 4 * mm)
            else:
                p.moveTo(x - 5 * mm, y - 2.5 * mm); p.lineTo(x + 5 * mm, y - 2.5 * mm); p.lineTo(x + 4 * mm, y + 2.5 * mm); p.lineTo(x - 4 * mm, y + 2.5 * mm)
            p.close()
            c.drawPath(p, stroke=1, fill=0)
            label(it['label'], x, y - (8.5 if it.get('drehung') else 6) * mm)
        elif t == 'pa':
            c.rect(x - 4 * mm, y - 8 * mm, 8 * mm, 16 * mm, stroke=1, fill=0)
            label('PA', x, y + 9.5 * mm)
        elif t == 'licht':
            c.circle(x, y, 2.6 * mm, stroke=1, fill=0)
            c.circle(x, y, 1 * mm, stroke=0, fill=1)
        elif t == 'strom':
            c.setStrokeColor(HexColor('#3f8f63'))
            c.rect(x - 3 * mm, y - 2.2 * mm, 6 * mm, 4.4 * mm, stroke=1, fill=0)
            label(it['label'], x, y + 3.6 * mm)
    label(f"SPIELFLÄCHE {bw} × {bd} M", px(bw / 2), py(0) + 9 * mm, 7.5, pk.TEXT_MID, 'Montserrat')
    label('P U B L I K U M', px(bw / 2), py(bd) - 7 * mm, 8, HexColor('#c27a3e'), 'Montserrat')
    return py(bd) - 16 * mm


def table(c, x, y, cols, rows, widths):
    c.setFont('Montserrat', 7)
    c.setFillColor(pk.TEXT_MID)
    cx = x
    for col, w in zip(cols, widths):
        c.drawString(cx, y, ' '.join(col.upper()))
        cx += w
    y -= 3 * mm
    for row in rows:
        c.setStrokeColor(pk.LINE)
        c.setLineWidth(0.5)
        c.line(x, y + 1.5 * mm, x + sum(widths), y + 1.5 * mm)
        y -= 3.5 * mm
        cx = x
        for i, (val, w) in enumerate(zip(row, widths)):
            open_ = val is None
            c.setFont('Inter-SemiBold' if i == 0 else 'Inter', 9)
            c.setFillColor(HexColor('#c27a3e') if i == 0 else (pk.TEXT_MID if open_ else pk.TEXT_DARK))
            c.drawString(cx, y, 'offen' if open_ else str(val))
            cx += w
        y -= 2.5 * mm
    return y


def page_two(c, w, h):
    m = 20 * mm
    pk.kicker(c, 'Technischer Aufbau', m, h - 20 * mm)
    pk.heading(c, 'Bühnenplan & Kanalliste', m, h - 30 * mm, size=14)
    c.setFont('Inter', 8)
    c.setFillColor(pk.TEXT_MID)
    c.drawString(m, h - 36 * mm, TECHNIK['status'])
    g = TECHNIK['geraete']
    c.setFont('Inter-SemiBold', 8.5)
    c.setFillColor(pk.TEXT_DARK)
    c.drawString(m, h - 41.5 * mm, '   ·   '.join(
        f'{k}: {g[key] or "offen"}' for k, key in [('Mischpult', 'mischpult'), ('PA', 'pa'), ('Monitore', 'monitore'), ('Licht', 'licht')]))
    y = stage_plot(c, m, h - 60 * mm, w - 2 * m)
    rows = [[k['kanal'], k['quelle'], k['art'], k['geraet'], k['stativ'] or '–', 'ja' if k['phantom'] else '–'] for k in TECHNIK['kanaele']]
    y = table(c, m, y, ['Kanal', 'Quelle', 'Art', 'Gerät', 'Stativ', '48 V'], rows, [16 * mm, 45 * mm, 20 * mm, 45 * mm, 25 * mm, 15 * mm])
    y -= 6 * mm
    labels = {i['id']: i['label'] for i in TECHNIK['aufbau']}
    half = (w - 2 * m) / 2
    pk.heading(c, 'Monitore', m, y, size=10)
    pk.heading(c, 'Strom', m + half, y, size=10)
    yl = yr = y - 6 * mm
    for i, mon in enumerate(TECHNIK['monitore'], 1):
        text = f"{labels.get(mon['id'], mon['id'])} (Aux {i}) für {mon['fuer']}: {mon['mix'] or 'Mischung offen'}"
        yl = pk.paragraph(c, text, m, yl, half - 6 * mm, size=8.5, leading=11) - 1.5 * mm
    for s_ in TECHNIK['strom']:
        text = f"{labels.get(s_['id'], s_['id'])}: {', '.join(s_['verbraucher'])}"
        yr = pk.paragraph(c, text, m + half, yr, half, size=8.5, leading=11) - 1.5 * mm


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

        page_two(c, w, h)
        c.setFont('Montserrat', 7.5)
        c.setFillColor(pk.TEXT_MID)
        c.drawString(m, 12 * mm, 'BLICKFELD NORD · TECHNIK-RIDER · BLICKFELD-NORD.DE')
        c.drawRightString(w - m, 12 * mm, f'Stand {date.today():%m/%Y} · Seite 2')
        c.showPage()
        c.save()
    print(f'{os.path.relpath(OUT)}  {os.path.getsize(OUT) / 1024:.0f} KB')


if __name__ == '__main__':
    main()
