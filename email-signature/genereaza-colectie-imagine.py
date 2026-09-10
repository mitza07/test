# -*- coding: utf-8 -*-
"""Colectia-imagine: semnaturile HTML pentru cele 17 imagini din assets/imagini/.

    python3 genereaza-colectie-imagine.py <sha-commit-cu-imaginile> [<folder-iesire>]

Fiecare semnatura: o singura tabela, imaginea (link catre site, alt cu datele)
si sub ea doua randuri de text mic - ce ramane vizibil cand imaginile sunt
blocate si ce da filtrelor anti-spam textul pe care o semnatura-doar-imagine
nu-l are. Imaginea e la 2x si se afiseaza la 600 px.
"""
import os, sys
from PIL import Image

SHA = sys.argv[1] if len(sys.argv) > 1 else "0" * 40
BASE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(BASE, "colectie-imagine")
IMG = os.path.join(BASE, "assets", "imagini")
URL = f"https://raw.githubusercontent.com/mitza07/test/{SHA}/email-signature/assets/imagini/"
FF = "font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;"
NUME_SCURT = {"lux-%d" % i: "Lux %d" % i for i in range(1, 10)}
NUME_SCURT.update({"rose": "Rose", "noir-1": "Noir 1", "noir-2": "Noir 2", "noir-3": "Noir 3",
                   "mono-1": "Mono 1", "mono-2": "Mono 2", "mono-3": "Mono 3", "aur": "Aur"})
ALT = ("Mihai Zamfir - Consultant IT - ITISTUL.RO - Mentenanta echipamente IT - "
       "+40 742 932 686 - mihai@itistul.ro - www.itistul.ro")
R1 = ("<b>Mihai Zamfir</b>&#160;&#183; Consultant IT&#160;&#183; ITISTUL.RO&#160;&#183; "
      "MENTENAN&#538;&#258; ECHIPAMENTE IT&#160;&#183; INFRASTRUCTUR&#258;&#160;&#183; SUPORT&#160;&#183; "
      "NETWORKING&#160;&#183; CLOUD&#160;&#183; SECURITY")

def a(href, text, color="#5b6b7c", fs=9):
    st = FF + "font-size:%dpx;color:%s;text-decoration:none;" % (fs, color)
    return '<a href="%s" style="%s"><span style="%s">%s</span></a>' % (href, st, st, text)

R2 = (a("tel:+40742932686", "+40&#160;742&#160;932&#160;686") + "&#160;&#183; " + a("mailto:mihai@itistul.ro", "mihai@itistul.ro")
      + "&#160;&#183; " + a("https://www.itistul.ro/", "www.itistul.ro") + "&#160;&#183; "
      + a("https://www.google.com/maps/search/?api=1&amp;query=Strada+Samuil+Vulcan+12D+Bucuresti",
          "Strada Samuil Vulcan, nr. 12D, et. 1, biroul 15, Bucure&#537;ti, Rom&#226;nia"))

def fragment(slug, fname, w, h):
    tbl = ('<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" '
           'style="width:600px;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;%s">' % FF)
    img = ('<img src="%s%s" width="%d" height="%d" alt="%s" border="0" style="width:%dpx;height:%dpx;display:block;'
           'border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;">' % (URL, fname, w, h, ALT, w, h))
    link = ('<a href="https://www.itistul.ro/" style="text-decoration:none;%s"><span style="text-decoration:none;%s">%s</span></a>'
            % (FF, FF, img))
    cell_img = ('<td width="600" height="%d" bgcolor="#ffffff" style="width:600px;height:%dpx;background-color:#ffffff;%s'
                'font-size:0px;line-height:0px;"><p style="margin:0;padding:0;font-size:0px;line-height:0px;">%s</p></td>' % (h, h, FF, link))
    def txt(row, top, rule=False):
        # o linie fina deasupra textului: desparte imaginea de randurile de rezerva
        return ('<td bgcolor="#ffffff" style="background-color:#ffffff;padding:%s;%s%sfont-size:9px;'
                'mso-line-height-rule:exactly;line-height:13px;color:#5b6b7c;"><p style="margin:0;padding:0;font-size:9px;'
                'mso-line-height-rule:exactly;line-height:13px;">%s</p></td>'
                % (top, "border-top:1px solid #e3e8ee;" if rule else "", FF, row))
    return (tbl + "\n<tr>" + cell_img + "</tr>\n<tr>" + txt(R1, "7px 0 0 0", rule=True) + "</tr>\n<tr>"
            + txt(R2, "0") + "</tr>\n</table>")

HEAD = ('﻿<!doctype html>\r\n<html>\r\n<head>\r\n'
        '<meta http-equiv="Content-Type" content="text/html; charset=utf-8">\r\n<meta charset="utf-8">\r\n'
        '</head>\r\n<body style="margin:0;padding:0;background-color:#ffffff;">\r\n')
TXT = open(os.path.join(BASE, "semnatura-signet", "Mihai Zamfir - Signet.txt"), "rb").read()
RTF = ("{\\rtf1\\ansi\\ansicpg1252\\deff0\\uc1{\\fonttbl{\\f0\\fswiss\\fcharset0 Segoe UI;}}"
       "{\\colortbl;\\red17\\green17\\blue17;\\red91\\green107\\blue124;}\\viewkind4\\pard\\sa0\\sb0\n"
       "\\f0\\b\\cf1\\fs40 Mihai Zamfir\\b0\\par\n\\f0\\cf2\\fs20 Consultant IT\\par\n\\f0\\fs20\\par\n"
       "\\f0\\cf1\\fs20 +40 742 932 686   |   mihai@itistul.ro   |   www.itistul.ro\\par\n"
       "\\f0\\cf2\\fs18 Strada Samuil Vulcan, nr. 12D, et. 1, biroul 15, Bucure\\u537sti, Rom\\u226ania\\par\n\\f0\\fs14\\par\n"
       "\\f0\\cf1\\fs18 I T I S T U L . R O\\par\n\\f0\\cf2\\fs14 MENTENAN\\u538T\\u258A ECHIPAMENTE IT\\par\n"
       "\\f0\\cf2\\fs14 INFRASTRUCTUR\\u258A \\'b7 SUPORT \\'b7 NETWORKING \\'b7 CLOUD \\'b7 SECURITY\\par\n}\n")

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for slug, short in NUME_SCURT.items():
        cand = [f for f in os.listdir(IMG) if f.rsplit(".", 1)[0] == slug]
        assert len(cand) == 1, (slug, cand)
        fname = cand[0]; pw, ph = Image.open(os.path.join(IMG, fname)).size
        assert pw == 1200 and ph % 2 == 0, (fname, pw, ph)
        frag = fragment(slug, fname, pw // 2, ph // 2)
        assert all(ord(ch) < 128 for ch in frag)
        d = os.path.join(OUT, slug); os.makedirs(d, exist_ok=True)
        nume = f"Mihai Zamfir - {short} (img)"
        open(os.path.join(d, "fragment.html"), "w", encoding="ascii", newline="\n").write(frag)
        open(os.path.join(d, nume + ".htm"), "w", encoding="utf-8", newline="").write(HEAD + frag.replace("\n", "\r\n") + "\r\n</body>\r\n</html>\r\n")
        open(os.path.join(d, nume + ".txt"), "wb").write(TXT)
        open(os.path.join(d, nume + ".rtf"), "w", encoding="ascii", newline="\n").write(RTF)
        print(f"{slug:8s} {fname:12s} {pw // 2}x{ph // 2}  {len(frag.encode())} B")
