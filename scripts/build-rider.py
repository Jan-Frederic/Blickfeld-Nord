#!/usr/bin/env python3
"""Erzeugt den Technik-Rider für Veranstalter: public/presse/blickfeld-nord-technik-rider(-en|-nl).pdf
und den Bühnenplan einzeln (eine Seite quer, zum Weiterleiten an die Technik): blickfeld-nord-buehnenplan(-en|-nl).pdf

Aufruf (im Repo-Root, nach `npm ci`):  python3 scripts/build-rider.py
Läuft wie alle PDF-Skripte bei jedem Deploy (.github/actions/build-site) und in der PR-Prüfung – Änderungen an
technik.json landen so automatisch in den PDFs.
Benötigt: pillow, reportlab, fonttools
Angaben je Sprache stehen in scripts/pdf_texte.py (RIDER) – bei Änderungen auch die FAQ in src/app/data/faq.ts (DE/EN/NL) und die Technik-Seite src/app/pages/technik.ts anpassen.
Seite 2 (Bühnenplan, Kanalliste, Monitore, Strom) kommt aus src/app/data/technik.json – derselben Datei wie auf /technik.
"""
import math
import importlib.util
import json
import os
import tempfile
from datetime import date

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('pressekit', os.path.join(HERE, 'build-pressekit.py'))
pk = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pk)

LOGO = os.path.join(pk.SRC, 'kompass-logo-hell.png')
with open(os.path.join(HERE, '..', 'src', 'app', 'data', 'technik.json'), encoding='utf-8') as fh:
    TECHNIK = json.load(fh)

T = pk.pdf_texte
tx = T.tx


def out(lang, name='technik-rider'):
    return os.path.join(pk.OUT, f'blickfeld-nord-{name}{T.suffix(lang)}.pdf')


def header(c, w, h, lang):
    t, pt = T.RIDER[lang], T.PRESSEKIT[lang]
    band = 46 * mm
    c.setFillColor(pk.NIGHT)
    c.rect(0, h - band, w, band, stroke=0, fill=1)
    ls = 34 * mm
    c.drawImage(LOGO, w - 20 * mm - ls, h - band + (band - ls) / 2, ls, ls, mask='auto')
    m = 20 * mm
    pk.kicker(c, pt['organisers'], m, h - 17 * mm)
    c.setFont('Michroma', 22)
    c.setFillColor(pk.INK)
    c.drawString(m, h - 30 * mm, t['heading'])
    c.setFont('Montserrat', 10)
    c.setFillColor(pk.FOG)
    c.drawString(m, h - 38 * mm, 'Blickfeld Nord · ' + pt['claim'])


def stage_plot(c, x0, top, width, lang):
    t = T.RIDER[lang]
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
        if t in ('drums', 'amp', 'mixer', 'pedalboard'):
            w, h = it['b'] * m, it['t'] * m
            c.setDash(*((3, 2) if t == 'drums' else ()))
            c.rect(x - w / 2, y - h / 2, w, h, stroke=1, fill=0)
            c.setDash()
            # Schlagzeug: Beschriftung vorne (Richtung Publikum), hinten sitzt Matthias
            label(tx(it['label'], lang), x, y - h / 2 + 4 if t == 'drums' else y - 2, 6 if t == 'pedalboard' else 7)
        elif t == 'person':
            c.setFillColor(pk.SUNSET)
            c.circle(x, y, 4.2 * mm, stroke=0, fill=1)
            label(it['label'][0], x, y - 3, 9, pk.TEXT_DARK, 'Inter-SemiBold')
            if it['id'] != 'matthias':
                label(tx(it['label'], lang), x, y - 8 * mm, 8, pk.TEXT_DARK, 'Inter-SemiBold')
                label(tx(it.get('rolle', ''), lang), x, y - 11 * mm)
            else:
                label(tx(it['label'], lang), x, y - 7.5 * mm, 7, pk.TEXT_DARK, 'Inter-SemiBold')
        elif t == 'monitor':
            p = c.beginPath()
            if it.get('drehung'):
                p.moveTo(x - 2.5 * mm, y - 5 * mm); p.lineTo(x - 2.5 * mm, y + 5 * mm); p.lineTo(x + 2.5 * mm, y + 4 * mm); p.lineTo(x + 2.5 * mm, y - 4 * mm)
            else:
                p.moveTo(x - 5 * mm, y - 2.5 * mm); p.lineTo(x + 5 * mm, y - 2.5 * mm); p.lineTo(x + 4 * mm, y + 2.5 * mm); p.lineTo(x - 4 * mm, y + 2.5 * mm)
            p.close()
            c.drawPath(p, stroke=1, fill=0)
            label(tx(it['label'], lang), x, y - (8.5 if it.get('drehung') else 6) * mm)
        elif t == 'pa':
            # Top, ggf. auf dem Subwoofer („sub“: true)
            c.rect(x - 3.5 * mm, y + 1 * mm, 7 * mm, 11 * mm, stroke=1, fill=0)
            label('PA', x, y + 13.5 * mm)
            if it.get('sub'):
                c.rect(x - 4.5 * mm, y - 8.5 * mm, 9 * mm, 9 * mm, stroke=1, fill=0)
                c.circle(x, y - 4 * mm, 3 * mm, stroke=1, fill=0)
                label('Sub', x, y - 11.5 * mm, 6)
        elif t == 'mikro':
            # Mikrofonständer: Dreibein, beim Galgen mit Arm zum Musiker
            for a in (90, 210, 330):
                c.line(x, y, x + 2 * mm * math.cos(math.radians(a)), y + 2 * mm * math.sin(math.radians(a)))
            mx, my = (px(it['arm'][0]), py(it['arm'][1])) if it.get('arm') else (x, y)
            if it.get('arm'):
                c.line(x, y, mx, my)
            c.setFillColor(pk.TEXT_DARK)
            c.circle(mx, my, 1 * mm, stroke=0, fill=1)
        elif t == 'licht':
            c.circle(x, y, 2.6 * mm, stroke=1, fill=0)
            c.circle(x, y, 1 * mm, stroke=0, fill=1)
        elif t == 'banner':
            # Banner hinter der Band: schmale Bahn hinter der Bühnenkante mit Ösen
            w = it['b'] * m
            c.setFillColor(HexColor('#c27a3e'))
            c.rect(x - w / 2, y + 6.2 * mm, w, 1.4 * mm, stroke=0, fill=1)
            c.setFillColor(HexColor('#ffffff'))
            n = max(1, round(it['b']))
            for i in range(n + 1):
                c.circle(x - w / 2 + 0.06 * m + i * (w - 0.12 * m) / n, y + 6.9 * mm, 0.45 * mm, stroke=0, fill=1)
            c.setFont('Inter', 6)
            c.setFillColor(pk.TEXT_MID)
            c.drawString(x - w / 2, y + 8.6 * mm, tx(it['label'], lang) + ' · ' + T.RIDER[lang]['eyelets'])
        elif t == 'strom':
            c.setStrokeColor(HexColor('#3f8f63'))
            c.rect(x - 3 * mm, y - 2.2 * mm, 6 * mm, 4.4 * mm, stroke=1, fill=0)
            label(tx(it['label'], lang), x, y + 3.6 * mm)
    label(f"{T.RIDER[lang]['stage']} {bw} × {bd} M", px(bw / 2), py(0) + 12 * mm, 7.5, pk.TEXT_MID, 'Montserrat')
    label(T.RIDER[lang]['audience'], px(bw / 2), py(bd) - 7 * mm, 8, HexColor('#c27a3e'), 'Montserrat')
    return py(bd) - 16 * mm


def table(c, x, y, cols, rows, widths, open_text='offen'):
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
            c.drawString(cx, y, open_text if open_ else str(val))
            cx += w
        y -= 2.5 * mm
    return y


def mix_text(mon, lang):
    """Monitormischung als Text, z. B. „Gesang Fred laut, Bassdrum laut … (Vorschlag)“ – None, solange offen."""
    if not mon.get('mix'):
        return None
    quelle = {k['kanal']: k['quelle'] for k in TECHNIK['kanaele']}
    text = ', '.join(f"{tx(quelle[x['kanal']], lang)} {tx(x['pegel'], lang)}" for x in mon['mix'])
    return f"{text} ({T.RIDER[lang]['proposal']})" if mon.get('vorschlag') else text


def page_two(c, w, h, lang):
    t = T.RIDER[lang]
    m = 20 * mm
    pk.kicker(c, t['setup'], m, h - 20 * mm)
    pk.heading(c, t['plot'], m, h - 30 * mm, size=14)
    c.setFont('Inter', 8)
    c.setFillColor(pk.TEXT_MID)
    c.drawString(m, h - 36 * mm, tx(TECHNIK['status'], lang))
    hw = TECHNIK['hardware']
    c.setFont('Inter-SemiBold', 8.5)
    c.setFillColor(pk.TEXT_DARK)
    c.drawString(m, h - 41.5 * mm, '   ·   '.join(
        f'{k}: {hw[key]["modell"] or t["open"]}' for k, key in t['hw']))
    # Plan etwas schmaler als die Seite, damit Kanalliste, Monitormischungen und Strom darunter Platz haben
    pw = (w - 2 * m) * 0.9
    y = stage_plot(c, (w - pw) / 2, h - 60 * mm, pw, lang)
    rows = [[k['kanal'], tx(k['quelle'], lang), tx(k['art'], lang), tx(k['geraet'], lang), tx(k['stativ'], lang) or '–', t['yes'] if k['phantom'] else '–'] for k in TECHNIK['kanaele']]
    y = table(c, m, y, t['cols'], rows, [16 * mm, 45 * mm, 20 * mm, 45 * mm, 25 * mm, 15 * mm], t['open'])
    y -= 6 * mm
    labels = {i['id']: tx(i['label'], lang) for i in TECHNIK['aufbau']}
    # Monitore über die volle Breite (die Mischungen sind lang), Strom darunter
    pk.heading(c, t['monitors'], m, y, size=10)
    y -= 6 * mm
    for i, mon in enumerate(TECHNIK['monitore'], 1):
        text = t['monitor_line'].format(label=labels.get(mon['id'], mon['id']), i=i, fuer=tx(mon['fuer'], lang), mix=mix_text(mon, lang) or t['mix_open'])
        y = pk.paragraph(c, text, m, y, w - 2 * m, size=8.5, leading=11) - 1.5 * mm
    y -= 3 * mm
    pk.heading(c, t['power'], m, y, size=10)
    y -= 6 * mm
    for s_ in TECHNIK['strom']:
        text = f"{labels.get(s_['id'], s_['id'])}: {', '.join(tx(v, lang) for v in s_['verbraucher'])}"
        y = pk.paragraph(c, text, m, y, w - 2 * m, size=8.5, leading=11) - 1.5 * mm


def main():
    with tempfile.TemporaryDirectory() as tmp:
        pk.register_fonts(tmp)
        for lang in T.LANGS:
            build(lang)
            build_plan(lang)
            for name in ('technik-rider', 'buehnenplan'):
                print(f'{os.path.relpath(out(lang, name))}  {os.path.getsize(out(lang, name)) / 1024:.0f} KB')


def build_plan(lang):
    """Nur der Bühnenplan, A4 quer – derselbe Plan wie auf Seite 2 des Riders."""
    t, pt = T.RIDER[lang], T.PRESSEKIT[lang]
    w, h = landscape(A4)
    m = 18 * mm
    c = canvas.Canvas(out(lang, 'buehnenplan'), pagesize=(w, h), lang=lang)
    c.setViewerPreference('DisplayDocTitle', 'true')
    c.setTitle(f'Blickfeld Nord – {t["plan"]}')
    c.setAuthor('Blickfeld Nord')
    pk.kicker(c, t['setup'], m, h - 16 * mm)
    pk.heading(c, t['plan'], m, h - 26 * mm, size=14)
    c.setFont('Inter', 8)
    c.setFillColor(pk.TEXT_MID)
    c.drawString(m, h - 32 * mm, t['plan_caption'])
    # Breite so wählen, dass Plan samt Beschriftung und Publikum-Zeile auf die Seite passt
    pw = 190 * mm
    stage_plot(c, (w - pw) / 2, h - 52 * mm, pw, lang)
    c.setFont('Montserrat', 7.5)
    c.setFillColor(pk.TEXT_MID)
    c.drawString(m, 10 * mm, f'BLICKFELD NORD · {t["plan"].upper()} · BLICKFELD-NORD.DE')
    c.drawRightString(w - m, 10 * mm, f'{pt["as_of"]} {date.today():%m/%Y}')
    c.showPage()
    c.save()


def build(lang):
    t, pt = T.RIDER[lang], T.PRESSEKIT[lang]
    w, h = A4
    m = 20 * mm
    c = canvas.Canvas(out(lang), pagesize=A4, lang=lang)
    c.setViewerPreference('DisplayDocTitle', 'true')
    c.setTitle(t['title'])
    c.setAuthor('Blickfeld Nord')
    header(c, w, h, lang)

    y = h - 62 * mm
    label_w = 52 * mm
    for section, rows in t['sections']:
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
    pk.heading(c, pt['lineup'], m, y, size=12)
    y -= 9 * mm
    members = ' · '.join(f'{n} ({r})' for n, r in pt['members'])
    y = pk.paragraph(c, members, m, y, w - 2 * m, size=10.5, leading=15) - 8 * mm
    pk.heading(c, pt['contact_label'], m, y, size=12)
    y -= 9 * mm
    for label, value, url in [e for e in T.contact(lang) if e[0] in ('Booking', 'Instagram', 'Website')]:
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
    c.drawString(m, 12 * mm, f'BLICKFELD NORD · {t["footer"]} · BLICKFELD-NORD.DE')
    c.drawRightString(w - m, 12 * mm, f'{pt["as_of"]} {date.today():%m/%Y}')
    c.showPage()

    page_two(c, w, h, lang)
    c.setFont('Montserrat', 7.5)
    c.setFillColor(pk.TEXT_MID)
    c.drawString(m, 12 * mm, f'BLICKFELD NORD · {t["footer"]} · BLICKFELD-NORD.DE')
    c.drawRightString(w - m, 12 * mm, f'{pt["as_of"]} {date.today():%m/%Y} · {t["page"]} 2')
    c.showPage()
    c.save()


if __name__ == '__main__':
    main()
