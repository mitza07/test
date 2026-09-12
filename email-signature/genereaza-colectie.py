# -*- coding: utf-8 -*-
"""Colectia de semnaturi ITISTUL.RO: 17 designuri dupa referintele trimise.

    python3 gen.py <sha-commit-cu-assets> [<folder-iesire>]

Toate respecta aceleasi reguli Outlook ca restul pachetului (verifica.py).
Fotografia: pana la primirea ei, in locul fotografiei sta un medalion cu
monograma MZ, construit din celule (deci nu poate fi blocat). Ornamentele
mandala sunt PNG-uri coapte pe fundalul exact al celulei, servite de pe GitHub.
"""
import os, sys, re

SHA = sys.argv[1] if len(sys.argv) > 1 else "0" * 40
OUT = sys.argv[2] if len(sys.argv) > 2 else "/home/user/test/email-signature/colectie"
FOTO = len(sys.argv) > 3 and sys.argv[3] == "foto"     # al treilea argument: monteaza fotografia
ASSETS = "/home/user/test/email-signature/assets"
SHA_LUX = "f06b8ff3bb09c88a80b4e33c4f7156d0558c898b"   # commit-ul cu ornamentele (nu se mai schimba)
URL = f"https://raw.githubusercontent.com/mitza07/test/{SHA_LUX}/email-signature/assets/lux/"
URL_FOTO = f"https://raw.githubusercontent.com/mitza07/test/{SHA}/email-signature/assets/foto/"

SANS  = "font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;"
SERIF = "font-family:'Palatino Linotype',Palatino,'Book Antiqua',Georgia,serif;"
THIN  = "font-family:'Segoe UI Light','Segoe UI','Helvetica Neue',Arial,sans-serif;"
VERD  = "font-family:Verdana,Geneva,'DejaVu Sans',sans-serif;"

# ---- continut -------------------------------------------------------------
NUME, NUME_CAPS = "Mihai Zamfir", "MIHAI ZAMFIR"
TITLU, TITLU_CAPS = "Consultant IT", "CONSULTANT IT"
BRAND = "ITISTUL.RO"
TAGLINE = "MENTENAN&#538;&#258; ECHIPAMENTE IT"
def discipl(sep): return sep.join(["INFRASTRUCTUR&#258;", "SUPORT", "NETWORKING", "CLOUD", "SECURITY"])
DOT = "&#160;&#183; "   # nbsp inainte de punct (nu ramane singur la inceput de rand), spatiu dupa (permite ruperea)
TEL, TEL_HREF = "+40&#160;742&#160;932&#160;686", "tel:+40742932686"
MAIL, MAIL_HREF = "mihai@itistul.ro", "mailto:mihai@itistul.ro"
WEB, WEB_HREF = "www.itistul.ro", "https://www.itistul.ro/"
ADR1, ADR2 = "Strada Samuil Vulcan, nr. 12D, et. 1, biroul 15", "Bucure&#537;ti, Rom&#226;nia"
ADR = ADR1 + ", " + ADR2
MAPS = "https://www.google.com/maps/search/?api=1&amp;query=Strada+Samuil+Vulcan+12D+Bucuresti"

# ---- primitive Outlook-safe ------------------------------------------------
def td(content="", w=None, h=None, colspan=None, align=None, valign=None, bg="#ffffff",
       pad=None, fs=None, lh=None, fw=None, color=None, ls=None, extra=None, pin=True,
       exact=True, ff=SANS, italic=False):
    a, s = [], []
    if colspan: a.append('colspan="%d"' % colspan)
    if w is not None: a.append('width="%d"' % w); s.append("width:%dpx;" % w)
    if h is not None: a.append('height="%d"' % h); s.append("height:%dpx;" % h)
    if align: a.append('align="%s"' % align)
    if valign: a.append('valign="%s"' % valign)
    a.append('bgcolor="%s"' % bg); s.append("background-color:%s;" % bg)
    if pad: s.append("padding:%s;" % pad)
    if extra: s.append(extra)
    s.append(ff)
    if fs is not None: s.append("font-size:%dpx;" % fs)
    if lh is not None:
        s.append(("mso-line-height-rule:exactly;" if exact else "") + "line-height:%dpx;" % lh)
    if fw: s.append("font-weight:%d;" % fw)
    if italic: s.append("font-style:italic;")
    if color: s.append("color:%s;" % color)
    if ls: s.append("letter-spacing:%s;" % ls)
    inner = content
    if pin and content:
        p = ["margin:0;padding:0;"]
        if fs is not None: p.append("font-size:%dpx;" % fs)
        if lh is not None:
            p.append(("mso-line-height-rule:exactly;" if exact else "") + "line-height:%dpx;" % lh)
        inner = '<p style="%s">%s</p>' % ("".join(p), content)
    return '<td %s style="%s">%s</td>' % (" ".join(a), "".join(s), inner)

def a(href, text, color, fs, fw=None, ff=SANS, ls=None):
    st = ff + "font-size:%dpx;" % fs
    if fw: st += "font-weight:%d;" % fw
    if ls: st += "letter-spacing:%s;" % ls
    st += "color:%s;text-decoration:none;" % color
    return '<a href="%s" style="%s"><span style="%s">%s</span></a>' % (href, st, st, text)

def span(text, color, fs, fw=None, ff=SANS, ls=None, italic=False):
    st = ff + "font-size:%dpx;" % fs
    if fw: st += "font-weight:%d;" % fw
    if ls: st += "letter-spacing:%s;" % ls
    if italic: st += "font-style:italic;"
    st += "color:%s;" % color
    return '<span style="%s">%s</span>' % (st, text)

def tbl(w, ff=SANS):
    return ('<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="%d" '
            'style="width:%dpx;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;%s">' % (w, w, ff))

def cols(cells, w, ff=SANS):
    """Un rand de celule intr-un tabel imbricat propriu (grila consistenta pentru Word)."""
    ws = [re.match(r'<td[^>]*?width="(\d+)"', c) for c in cells]
    if all(ws):   # doar celulele de nivel superior; o celula fara latime (padding+chenar) e permisa
        got = sum(int(m.group(1)) for m in ws)
        assert got == w, f"coloanele insumeaza {got}, nu {w}"
    return tbl(w, ff) + "<tr>" + "".join(cells) + "</tr></table>"

def stack(rows, w, ff=SANS):
    return tbl(w, ff) + "".join("<tr>" + r + "</tr>" for r in rows) + "</table>"

def gap(w, bg, ff=SANS):
    return td("&#160;", w=w, bg=bg, fs=0, lh=0, color=bg, ff=ff)

def vgap(h, bg, ff=SANS, colspan=None):
    return td("&#160;", h=h, bg=bg, fs=0, lh=0, color=bg, ff=ff, colspan=colspan)

def img(name, w, h, bg, ff=SANS, href=None, extra=None, base=None):
    """Celula cu imagine: fara mso-line-height-rule (ar taia imaginea la 0).
    Fotografiile (base=URL_FOTO) sunt fisiere la 2x, afisate la w x h."""
    tag = ('<img src="%s%s" width="%d" height="%d" alt="" border="0" style="width:%dpx;height:%dpx;'
           'display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;">'
           % (base or URL, name, w, h, w, h))
    if href: tag = '<a href="%s" style="text-decoration:none;%s"><span style="text-decoration:none;%s">%s</span></a>' % (href, ff, ff, tag)
    (used_foto if base == URL_FOTO else used).add(name)
    return td(tag, w=w, h=h, bg=bg, fs=0, lh=0, exact=False, ff=ff, extra=extra)

def foto(name, w, h, bg, ff=SANS, extra=None):
    return img(name, w, h, bg, ff=ff, extra=extra, base=URL_FOTO)

def lines(parts, w, bg, ff=SANS, top=0, align=None):
    """Bloc de text: fiecare (html, fs, lh, color, extra) pe randul lui, in celule proprii."""
    rows = []
    if top: rows.append(vgap(top, bg, ff))
    for p in parts:
        html, fs, lh, color = p[:4]
        kw = p[4] if len(p) > 4 else {}
        rows.append(td(html, bg=bg, fs=fs, lh=lh, color=color, ff=kw.pop("ff", ff), align=align, **kw))
    return stack(rows, w, ff)

def rule(w, color, bg, ff=SANS):
    return td("&#160;", w=w, h=1, bg=color, fs=0, lh=0, color=color, ff=ff)

def medalion(size, bg, ring1, ring2, text, color, ff, fs, ring_w=1, inset=3, poza=None):
    """Medalion cu dublu chenar din celule: monograma, sau fotografia daca exista."""
    inner = size - 2 * (ring_w + inset)
    if poza and FOTO:
        core = foto(poza, inner, inner, bg, ff=ff, extra="border:%dpx solid %s;" % (ring_w, ring2))
    else:
        core = td(text, w=inner, h=inner, align="center", valign="middle", bg=bg, fs=fs, lh=fs + 4,
                  fw=400, color=color, ff=ff, ls="2px", extra="border:%dpx solid %s;" % (ring_w, ring2))
    mid = td(cols([core], inner, ff), bg=bg, pad="%dpx" % inset, ff=ff, pin=False,
             extra="border:%dpx solid %s;" % (ring_w, ring1))
    return cols([td(cols([mid], size - 2 * ring_w, ff), w=size, bg=bg, ff=ff, pin=False)], size, ff)

def contacte(w, bg, ff, lab_color, val_color, lab_fs=8, val_fs=11, lh=16, adresa=True, lab_w=40, web_color=None, gapw=8):
    """Eticheta micro-caps + valoare, aliniate in doua coloane."""
    rows = []
    items = [("TEL", a(TEL_HREF, TEL, val_color, val_fs, ff=ff)),
             ("MAIL", a(MAIL_HREF, MAIL, val_color, val_fs, ff=ff)),
             ("WEB", a(WEB_HREF, WEB, web_color or val_color, val_fs, fw=700 if web_color else None, ff=ff))]
    if adresa: items.append(("ADRES&#258;", a(MAPS, ADR, val_color, val_fs - 1, ff=ff)))
    vw = w - lab_w - gapw
    for lab, val in items:
        rows.append(td(lab, w=lab_w, bg=bg, fs=lab_fs, lh=lh, fw=700, color=lab_color, ff=ff, ls="1px", valign="top")
                    + gap(gapw, bg, ff)
                    + td(val, w=vw, bg=bg, fs=val_fs, lh=lh, color=val_color, ff=ff, valign="top"))
    return stack(rows, w, ff)

def inline_contacte(color, fs, ff, web_color=None, sep=DOT):
    return (a(TEL_HREF, TEL, color, fs, ff=ff) + sep + a(MAIL_HREF, MAIL, color, fs, ff=ff)
            + sep + a(WEB_HREF, WEB, web_color or color, fs, fw=700 if web_color else None, ff=ff))

def band(inner, w, bg, pad, ff=SANS, extra=None):
    """Rand al tabelului exterior: o singura celula, fara latime, cu padding."""
    return "<tr>" + td(inner, bg=bg, pad=pad, ff=ff, pin=False, extra=extra) + "</tr>"

def card(rows, w, ff=SANS, bg="#ffffff"):
    return tbl(w, ff) + "\n" + "\n".join(rows) + "\n</table>"

# ---- palete ----------------------------------------------------------------
NEGRU, NEGRU2, PRUNA = "#111111", "#181818", "#1b1424"
IVORY, IVORY2 = "#efe6d2", "#cfc7b5"
GOLD, GOLD_HI, GOLD_LO = "#c9a961", "#eedaa0", "#80642c"
W = 600
used, used_foto = set(), set()

# ============================ LUX 1-9 ========================================
def lux_nume(w, bg, fs=17, lh=22, ff=SERIF, extra_rows=(), top=0, wordmark=True):
    parts = [(NUME_CAPS, fs, lh, GOLD_HI, {"fw": 700, "ls": "1px", "ff": SERIF}),
             (TITLU, 11, 16, IVORY2, {"ff": SANS})]
    if wordmark:
        parts += [("&#160;", 6, 8, bg),
                  (BRAND, 9, 13, GOLD, {"ls": "3px", "ff": SERIF}),
                  (TAGLINE, 8, 12, IVORY2, {"ls": "1px"} if w >= 170 else {})]
    parts += list(extra_rows)
    return lines(parts, w, bg, SANS, top=top)

def lux_med(bg=NEGRU):
    # cu fotografie: rama "floare" aurie din referinte, PNG copt pe fundalul celulei
    if FOTO: return cols([foto({PRUNA: "foto-lux-pruna.png", NEGRU2: "foto-lux-negru2.png"}.get(bg, "foto-lux-negru.png"), 80, 80, bg)], 80)
    return medalion(80, bg, GOLD_HI, GOLD_LO, "MZ", GOLD_HI, SERIF, 26)

def lux_contacte(w, bg, adresa=True, lh=15):
    return contacte(w, bg, SANS, GOLD, IVORY, lab_fs=8, val_fs=11, lh=lh, adresa=adresa, lab_w=36, gapw=6)

def lux_footer(w, bg, ff=SANS):
    return stack([td(discipl(DOT), bg=bg, fs=8, lh=12, color=GOLD, ff=ff, ls="2px", align="center", fw=700,
                     pad="8px 0 0 0", extra="border-top:1px solid %s;" % GOLD_LO)], w, ff)

def lux1():
    row = cols([img("lux-stanga.png", 200, 190, NEGRU), gap(12, NEGRU),
                td(lux_med(), w=80, bg=NEGRU, valign="middle", pin=False), gap(12, NEGRU),
                td(lux_nume(142, NEGRU), w=142, bg=NEGRU, valign="middle", pin=False), gap(4, NEGRU),
                td(lux_contacte(150, NEGRU), w=150, bg=NEGRU, valign="middle", pin=False)], W)
    return card([band(row, W, NEGRU, "0"),
                 band(lux_footer(W - 40, NEGRU), W, NEGRU, "0 20px 10px 20px")], W, bg=NEGRU)

def lux2():
    mid = cols([gap(24, NEGRU2), td(lux_med(NEGRU2), w=80, bg=NEGRU2, valign="middle", pin=False), gap(18, NEGRU2),
                td(lux_nume(200, NEGRU2), w=200, bg=NEGRU2, valign="middle", pin=False), gap(16, NEGRU2),
                td(lux_contacte(238, NEGRU2), w=238, bg=NEGRU2, valign="middle", pin=False), gap(24, NEGRU2)], W)
    return card([band(cols([img("lux-banda-sus.png", W, 44, NEGRU)], W), W, NEGRU, "0"),
                 band(mid, W, NEGRU2, "14px 0 8px 0", extra="border-top:1px solid %s;" % GOLD_LO),
                 band(lux_footer(W - 48, NEGRU2), W, NEGRU2, "0 24px 12px 24px"),
                 band(cols([img("lux-banda-jos.png", W, 44, NEGRU)], W), W, NEGRU, "0")], W, bg=NEGRU)

def lux3():
    blk = lines([(NUME_CAPS, 19, 24, GOLD_HI, {"fw": 700, "ls": "1px", "ff": SERIF}),
                 (TITLU + DOT + BRAND, 11, 16, IVORY2),
                 ("&#160;", 8, 10, NEGRU),
                 (inline_contacte(IVORY, 11, SANS, web_color=GOLD_HI), 11, 16, IVORY, {"extra": "border-top:1px solid %s;" % GOLD_LO, "pad": "8px 0 0 0"}),
                 (a(MAPS, ADR, IVORY2, 10), 10, 14, IVORY2),
                 ("&#160;", 6, 8, NEGRU),
                 (TAGLINE + DOT + discipl(" / "), 8, 12, GOLD, {"ls": "1px"})], 240, NEGRU)
    row = cols([img("lux-mare-stanga.png", 250, 190, NEGRU), gap(12, NEGRU),
                td(lux_med(), w=80, bg=NEGRU, valign="middle", pin=False), gap(18, NEGRU),
                td(blk, w=240, bg=NEGRU, valign="middle", pin=False)], W)
    return card([band(row, W, NEGRU, "0")], W, bg=NEGRU)

def lux4():
    row = cols([gap(24, NEGRU), td(lux_nume(170, NEGRU, fs=18, lh=24), w=170, bg=NEGRU, valign="middle", pin=False),
                gap(16, NEGRU), td(lux_contacte(170, NEGRU), w=170, bg=NEGRU, valign="middle", pin=False),
                img("lux-contur-negru-dreapta-220.png", 220, 190, NEGRU)], W)
    return card([band(row, W, NEGRU, "0"),
                 band(lux_footer(W - 48, NEGRU), W, NEGRU, "0 24px 10px 24px")], W, bg=NEGRU)

def lux5():
    row = cols([img("lux-contur-pruna-stanga-80.png", 80, 190, PRUNA),
                td(lux_nume(160, PRUNA, fs=16, lh=21), w=160, bg=PRUNA, valign="middle", pin=False), gap(8, PRUNA),
                td(lux_med(PRUNA), w=80, bg=PRUNA, valign="middle", pin=False), gap(14, PRUNA),
                td(lux_contacte(178, PRUNA), w=178, bg=PRUNA, valign="middle", pin=False),
                img("lux-contur-pruna-dreapta-80.png", 80, 190, PRUNA)], W)
    return card([band(row, W, PRUNA, "0"),
                 band(lux_footer(W - 48, PRUNA), W, PRUNA, "0 24px 10px 24px")], W, bg=PRUNA)

def lux6():
    row = cols([gap(22, NEGRU), td(lux_nume(190, NEGRU, fs=18, lh=24), w=190, bg=NEGRU, valign="middle", pin=False),
                gap(12, NEGRU), td(lux_med(), w=80, bg=NEGRU, valign="middle", pin=False), gap(14, NEGRU),
                td(lux_contacte(154, NEGRU), w=154, bg=NEGRU, valign="middle", pin=False),
                img("lux-contur-negru-dreapta-128.png", 128, 190, NEGRU)], W)
    return card([band(row, W, NEGRU, "0"),
                 band(lux_footer(W - 44, NEGRU), W, NEGRU, "0 22px 10px 22px")], W, bg=NEGRU)

def lux7():
    mid = cols([gap(20, NEGRU), td(lux_med(), w=80, bg=NEGRU, valign="middle", pin=False), gap(16, NEGRU),
                td(lux_nume(200, NEGRU), w=200, bg=NEGRU, valign="middle", pin=False), gap(16, NEGRU),
                td(lux_contacte(248, NEGRU), w=248, bg=NEGRU, valign="middle", pin=False), gap(20, NEGRU)], W)
    return card([band(cols([img("lux-banda-sus.png", W, 44, NEGRU)], W), W, NEGRU, "0"),
                 band(mid, W, NEGRU, "16px 0 10px 0"),
                 band(lux_footer(W - 40, NEGRU), W, NEGRU, "0 20px 14px 20px"),
                 band(cols([img("lux-banda-jos.png", W, 44, NEGRU)], W), W, NEGRU, "0")], W, bg=NEGRU)

def lux8():
    row = cols([img("lux-mare-stanga-200.png", 200, 190, NEGRU), gap(10, NEGRU),
                td(lux_med(), w=80, bg=NEGRU, valign="middle", pin=False), gap(12, NEGRU),
                td(lux_nume(140, NEGRU, fs=16, lh=21), w=140, bg=NEGRU, valign="middle", pin=False), gap(4, NEGRU),
                td(lux_contacte(154, NEGRU), w=154, bg=NEGRU, valign="middle", pin=False)], W)
    return card([band(row, W, NEGRU, "0"),
                 band(lux_footer(W - 40, NEGRU), W, NEGRU, "0 20px 10px 20px")], W, bg=NEGRU)

def lux9():
    blk = lines([(NUME_CAPS, 20, 26, GOLD_HI, {"fw": 700, "ls": "2px", "ff": SERIF}),
                 (TITLU, 11, 16, IVORY2),
                 ("&#160;", 6, 8, PRUNA),
                 (BRAND, 9, 13, GOLD, {"ls": "3px", "ff": SERIF}),
                 (TAGLINE, 8, 12, IVORY2, {"ls": "1px"}),
                 (inline_contacte(IVORY, 10, SANS, web_color=GOLD_HI), 10, 15, IVORY, {"extra": "border-top:1px solid %s;" % GOLD_LO, "pad": "8px 0 0 0"}),
                 (a(MAPS, ADR, IVORY2, 9), 9, 13, IVORY2),
                 (discipl(" / "), 8, 12, GOLD, {"ls": "1px", "fw": 700})], 240, PRUNA)
    row = cols([img("lux-contur-pruna-stanga-120.png", 120, 190, PRUNA),
                td(blk, w=240, bg=PRUNA, valign="middle", pin=False), gap(20, PRUNA),
                td(lux_med(PRUNA), w=80, bg=PRUNA, valign="middle", pin=False),
                img("lux-contur-pruna-dreapta-140.png", 140, 190, PRUNA)], W)
    return card([band(row, W, PRUNA, "0")], W, bg=PRUNA)

# ============================ ROSE ===========================================
ROSE, ROSE_BG, ROSE_LT, GRAY, GRAY2, ALB = "#a8655b", "#c8958a", "#f6ece9", "#4a4a4a", "#6b6b6b", "#ffffff"
def rose():
    med = medalion(150, ROSE_LT, ROSE_BG, ROSE_BG, "MZ", ROSE, VERD, 44, inset=4, poza="foto-rose.jpg")
    buton = cols([td(a(MAIL_HREF, "Contacteaz&#259;-m&#259;", ALB, 13, fw=700, ff=VERD), w=150, h=40, align="center",
                     valign="middle", bg=ROSE_BG, fs=13, lh=18, fw=700, color=ALB, ff=VERD)], 150, VERD)
    stanga = stack([td(med, bg=ALB, ff=VERD, pin=False), vgap(14, ALB, VERD), td(buton, bg=ALB, ff=VERD, pin=False)], 150, VERD)
    def linie(lab, val): return span(lab, ROSE, 13, ff=VERD) + " " + val
    dreapta = lines([(NUME, 24, 30, ROSE, {"fw": 700}),
                     (TITLU + " &#183; " + BRAND, 13, 18, GRAY, {"fw": 700}),
                     (TAGLINE, 9, 14, GRAY2, {"ls": "1px"}),
                     ("&#160;", 10, 12, ALB),
                     (linie("Telefon:", a(TEL_HREF, TEL, GRAY, 13, ff=VERD)), 13, 20, GRAY),
                     (linie("Website:", a(WEB_HREF, WEB, GRAY, 13, ff=VERD)), 13, 20, GRAY),
                     (linie("E-mail:", a(MAIL_HREF, MAIL, GRAY, 13, ff=VERD)), 13, 20, GRAY),
                     (linie("Adres&#259;:", a(MAPS, ADR, GRAY, 11, ff=VERD)), 11, 16, GRAY),
                     ("&#160;", 10, 12, ALB),
                     (discipl(" &#183; "), 9, 14, GRAY2, {"fw": 700, "ls": "1px", "extra": "border-top:1px solid #e8dcd8;", "pad": "8px 0 0 0"})],
                    359, ALB, VERD)
    row = cols([gap(24, ALB, VERD), td(stanga, w=150, bg=ALB, valign="top", pin=False, ff=VERD), gap(22, ALB, VERD),
                td("&#160;", w=3, bg=ROSE_BG, fs=0, lh=0, color=ROSE_BG, ff=VERD), gap(18, ALB, VERD),
                td(dreapta, w=359, bg=ALB, valign="top", pin=False, ff=VERD), gap(24, ALB, VERD)], W, VERD)
    return card([band(row, W, ALB, "24px 0 24px 0", VERD, extra="border:1px solid #e8dcd8;")], W, VERD, bg=ALB)

# ============================ NOIR 1-3 =======================================
NB, NB2, NB3, NW, NG, NG2 = "#000000", "#1e1e1e", "#5e5e5e", "#ffffff", "#9a9a9a", "#d0d0d0"
def noir_nume(w, bg, fs=22, lh=28, extra=()):
    return lines([(NUME_CAPS, fs, lh, NW, {"ls": "3px", "ff": THIN}),
                  (TITLU_CAPS, 10, 15, NG, {"ls": "2px"})] + list(extra), w, bg)
def noir_contacte(w, bg, adresa=True, fs=10, lh=16):
    parts = [(a(MAIL_HREF, MAIL, NG2, fs), fs, lh, NG2), (a(TEL_HREF, TEL, NG2, fs), fs, lh, NG2),
             (a(WEB_HREF, WEB, NG2, fs), fs, lh, NG2)]
    if adresa: parts.append((a(MAPS, ADR, NG, 9), 9, 13, NG))
    return lines(parts, w, bg)
def noir_panou(w, h, bg=NB2, fs=44):
    if FOTO: return cols([foto("foto-noir-1.jpg" if w == 300 else "foto-noir-2.jpg", w, h, bg)], w)
    mono = td("MZ", w=w, h=h, align="center", valign="middle", bg=bg, fs=fs, lh=fs + 6, color=NW, ff=THIN, ls="4px")
    return cols([mono], w)
def noir_brand(w, bg, discipline=True):
    parts = [(BRAND + DOT + TAGLINE, 8, 12, NG, {"ls": "1px", "fw": 700, "extra": "border-top:1px solid #333333;", "pad": "8px 0 0 0"})]
    if discipline: parts.append((discipl(DOT), 8, 12, NG, {"ls": "1px"}))
    return lines(parts, w, bg)

def noir1():
    stanga = stack([td(noir_nume(274, NB), bg=NB, pin=False), vgap(14, NB), td(noir_contacte(274, NB), bg=NB, pin=False),
                    vgap(12, NB), td(noir_brand(274, NB), bg=NB, pin=False)], 274)
    row = cols([gap(26, NB), td(stanga, w=274, bg=NB, valign="middle", pin=False), td(noir_panou(300, 180), w=300, bg=NB2, pin=False)], W)
    return card([band(row, W, NB, "0")], W, bg=NB)

def noir_logo(size=96):
    core = td(span("IT", NW, 30, ff=THIN, ls="2px") + "<br>" + span(BRAND, NW, 7, ls="2px"), w=size - 2, h=size - 2, align="center",
              valign="middle", bg=NB, fs=30, lh=34, color=NW, ff=THIN, extra="border:1px solid %s;" % NW)
    return cols([core], size - 2)

def noir_sus(discipline):
    stanga_parts = [td(noir_nume(250, NB), bg=NB, pin=False), vgap(12, NB), td(noir_contacte(250, NB), bg=NB, pin=False),
                    vgap(10, NB), td(noir_brand(250, NB, discipline), bg=NB, pin=False)]
    stanga = stack(stanga_parts, 250)
    return cols([gap(24, NB), td(stanga, w=250, bg=NB, valign="middle", pin=False), gap(16, NB),
                 td(noir_panou(120, 150, fs=34), w=120, bg=NB2, pin=False), gap(38, NB),
                 td(noir_logo(96), w=96, bg=NB, valign="middle", pin=False), gap(56, NB)], W)

def noir2():
    def col(lab, val, w): return td(span(lab, NW, 8, fw=700, ls="1px") + "&#160;&#160;" + val, w=w, bg=NB3, fs=10, lh=14, color=NW, align="center", valign="middle")
    footer = cols([col("WEB", a(WEB_HREF, WEB, NW, 10), 200), col("TEL", a(TEL_HREF, TEL, NW, 10), 200), col("MAIL", a(MAIL_HREF, MAIL, NW, 10), 200)], W)
    return card([band(noir_sus(True), W, NB, "0"),
                 band(footer, W, NB3, "9px 0 9px 0", extra="border-top:1px solid #333333;")], W, bg=NB)

def noir3():
    return card([band(noir_sus(False), W, NB, "0"),
                 band(stack([td(discipl(DOT), bg=NB, fs=8, lh=12, color=NG, ls="2px", fw=700, extra="border-top:1px solid #333333;", pad="8px 0 0 0")], W - 48), W, NB, "0 24px 14px 24px")], W, bg=NB)

# ============================ MONO 1-3 =======================================
MB, MB2, MW, MG, MG2 = "#1c1c1c", "#2a2a2a", "#ffffff", "#bdbdbd", "#e0e0e0"
def mono_bloc(w, bg, brokerage=False, nume_fs=22, tagline=True):
    parts = [(TITLU_CAPS, 8, 12, MG, {"ls": "3px"}),
             (NUME_CAPS, nume_fs, nume_fs + 6, MW, {"ls": "2px", "ff": SERIF}),
             ("&#160;", 8, 10, bg),
             (a(TEL_HREF, TEL, MG2, 10), 10, 15, MG2), (a(MAIL_HREF, MAIL, MG2, 10), 10, 15, MG2),
             (a(WEB_HREF, WEB, MG2, 10), 10, 15, MG2), (a(MAPS, ADR, MG, 9), 9, 13, MG)]
    if brokerage: parts += [("&#160;", 6, 8, bg), (BRAND + DOT + TAGLINE, 8, 12, MW, {"ls": "2px", "fw": 700})]
    elif tagline: parts += [("&#160;", 6, 8, bg), (TAGLINE, 8, 12, MG, {"ls": "2px"})]
    parts += [(discipl(DOT), 8, 12, MG, {"ls": "1px", "extra": "border-top:1px solid #3a3a3a;", "pad": "8px 0 0 0"})]
    return lines(parts, w, bg)
def mono_panou(w, h, bg=MB2, fs=48):
    if FOTO: return cols([foto("foto-mono-1.jpg" if w == 220 else "foto-mono-2.jpg", w, h, bg)], w)
    return cols([td("MZ", w=w, h=h, align="center", valign="middle", bg=bg, fs=fs, lh=fs + 6, color=MW, ff=SERIF, ls="4px")], w)
def mono_logo_alb(size=72):
    return cols([td(span("IT", MB, 30, ff=SERIF) + "<br>" + span(BRAND, MB, 7, ls="2px", fw=700), w=size, h=size, align="center", valign="middle",
                    bg=MW, fs=30, lh=32, color=MB, ff=SERIF)], size)

def mono1():
    row = cols([gap(26, MB), td(mono_bloc(250, MB), w=250, bg=MB, valign="middle", pin=False),
                td(mono_logo_alb(72), w=90, bg=MB, valign="middle", pin=False, align="center"), gap(14, MB),
                td(mono_panou(220, 176), w=220, bg=MB2, pin=False)], W)
    return card([band(row, W, MB, "0")], W, bg=MB)

def mono2():
    vert = "<br>".join(span(ch, MW, 9, ls="0", ff=SERIF) for ch in "ITISTUL")
    row = cols([gap(26, MB), td(mono_bloc(300, MB, brokerage=True), w=300, bg=MB, valign="middle", pin=False),
                td(mono_panou(200, 176, fs=44), w=200, bg=MB2, pin=False), gap(10, MB),
                td("&#160;", w=1, bg="#4a4a4a", fs=0, lh=0, color="#4a4a4a"), gap(10, MB),
                td(vert, w=20, bg=MB, fs=9, lh=12, color=MW, ff=SERIF, align="center", valign="middle"), gap(33, MB)], W)
    return card([band(row, W, MB, "0")], W, bg=MB)

def mono3():
    med = medalion(64, MB, MW, "#5a5a5a", "MZ", MW, SERIF, 20, inset=2, poza="foto-mono-3.jpg")
    stanga = cols([gap(26, MB), td(med, w=64, bg=MB, valign="middle", pin=False), gap(16, MB),
                   td(mono_bloc(268, MB, nume_fs=20, tagline=False), w=268, bg=MB, valign="middle", pin=False), gap(26, MB)], 400)
    dreapta = lines([("IT", 34, 40, MB, {"ff": SERIF}),
                     (BRAND, 9, 13, MB, {"ls": "3px", "fw": 700}),
                     (TAGLINE, 8, 12, "#555555", {"ls": "1px", "italic": True, "ff": SERIF})], 200, MW, align="center")
    row = cols([td(stanga, w=400, bg=MB, pin=False), td(dreapta, w=200, bg=MW, valign="middle", pin=False)], W)
    return card([band(row, W, MB, "0")], W, bg=MB)

# ============================ AUR ============================================
AB, AB2 = "#141414", "#141414"
def aur():
    med = medalion(80, AB, GOLD_HI, GOLD_LO, "MZ", GOLD_HI, SERIF, 26, poza="foto-aur.jpg")
    nume = lines([(span("MIHAI", IVORY, 19, fw=700, ls="1px") + " " + span("ZAMFIR", GOLD_HI, 19, fw=700, ls="1px"), 19, 24, IVORY, {"fw": 700}),
                  (TITLU, 11, 16, IVORY2), ("&#160;", 6, 8, AB),
                  (discipl(" / "), 7, 11, GOLD, {"ls": "1px", "fw": 700})], 160, AB)
    cont = contacte(150, AB, SANS, GOLD, IVORY, lab_fs=8, val_fs=11, lh=15, lab_w=36, gapw=6)
    brand = lines([(BRAND, 11, 15, IVORY, {"fw": 700, "ls": "1px"}),
                   (TAGLINE, 7, 11, GOLD, {"ls": "1px"}), ("&#160;", 6, 8, AB),
                   (a(WEB_HREF, WEB, GOLD_HI, 10, fw=700), 10, 14, GOLD_HI)], 87, AB)
    row = cols([gap(22, AB), td(med, w=80, bg=AB, valign="middle", pin=False), gap(18, AB),
                td(nume, w=160, bg=AB, valign="middle", pin=False), gap(12, AB),
                td("&#160;", w=4, bg=GOLD, fs=0, lh=0, color=GOLD), gap(12, AB),
                td(cont, w=150, bg=AB, valign="middle", pin=False), gap(12, AB),
                td("&#160;", w=1, bg=GOLD_LO, fs=0, lh=0, color=GOLD_LO), gap(12, AB),
                td(brand, w=87, bg=AB, valign="middle", pin=False)], 570)
    # doua rame concentrice: aur deschis, apoi aur inchis
    inner = td(row, bg=AB, pad="18px 0 18px 0", pin=False, extra="border:1px solid %s;" % GOLD_LO)
    frame = td(stack([inner], 570), bg=AB, pad="3px", pin=False, extra="border:1px solid %s;" % GOLD)
    cadru = stack([frame], 578)
    return card([band(cadru, W, AB, "10px 11px 10px 11px", extra="border-top:1px solid %s;" % AB)], W, bg=AB)

# ============================ scriere ========================================
def aur_mini():
    """Semnatura de raspuns: acelasi limbaj negru/auriu ca Aur, un singur rand, zero imagini."""
    left = lines([(span("MIHAI", IVORY, 14, fw=700, ls="1px") + " " + span("ZAMFIR", GOLD_HI, 14, fw=700, ls="1px"), 14, 18, IVORY, {"fw": 700}),
                  (TITLU + DOT + BRAND + DOT + TAGLINE, 8, 12, GOLD)], 290, AB)
    right = lines([(a(TEL_HREF, TEL, IVORY, 10) + DOT + a(MAIL_HREF, MAIL, IVORY, 10), 10, 14, IVORY),
                   (a(WEB_HREF, WEB, GOLD_HI, 10, fw=700), 10, 14, GOLD_HI)], 260, AB)
    row = cols([td("&#160;", w=4, bg=GOLD, fs=0, lh=0, color=GOLD), gap(14, AB),
                td(left, w=290, bg=AB, valign="middle", pin=False), gap(12, AB),
                td(right, w=260, bg=AB, valign="middle", pin=False), gap(20, AB)], W)
    return card([band(row, W, AB, "9px 0 9px 0", extra="border-top:1px solid %s;border-bottom:1px solid %s;" % (GOLD_LO, GOLD_LO))], W, bg=AB)

DESIGNS = [("lux-1", "Lux 1", lux1, SERIF), ("lux-2", "Lux 2", lux2, SERIF), ("lux-3", "Lux 3", lux3, SERIF),
           ("lux-4", "Lux 4", lux4, SERIF), ("lux-5", "Lux 5", lux5, SERIF), ("lux-6", "Lux 6", lux6, SERIF),
           ("lux-7", "Lux 7", lux7, SERIF), ("lux-8", "Lux 8", lux8, SERIF), ("lux-9", "Lux 9", lux9, SERIF),
           ("rose", "Rose", rose, VERD), ("noir-1", "Noir 1", noir1, THIN), ("noir-2", "Noir 2", noir2, THIN),
           ("noir-3", "Noir 3", noir3, THIN), ("mono-1", "Mono 1", mono1, SERIF), ("mono-2", "Mono 2", mono2, SERIF),
           ("mono-3", "Mono 3", mono3, SERIF), ("aur", "Aur", aur, SERIF), ("aur-mini", "Aur mini", aur_mini, SANS)]

HEAD = ('﻿<!doctype html>\r\n<html>\r\n<head>\r\n'
        '<meta http-equiv="Content-Type" content="text/html; charset=utf-8">\r\n<meta charset="utf-8">\r\n'
        '</head>\r\n<body style="margin:0;padding:0;background-color:#ffffff;">\r\n')
TXT = open("/home/user/test/email-signature/semnatura-signet/Mihai Zamfir - Signet.txt", "rb").read()

def rtf(ff):
    fam = "Palatino Linotype" if "Palatino" in ff else ("Verdana" if "Verdana" in ff else "Segoe UI")
    kind = "\\froman" if fam == "Palatino Linotype" else "\\fswiss"
    return ("{\\rtf1\\ansi\\ansicpg1252\\deff0\\uc1{\\fonttbl{\\f0%s\\fcharset0 %s;}{\\f1\\fswiss\\fcharset0 Segoe UI;}}"
            "{\\colortbl;\\red17\\green17\\blue17;\\red91\\green107\\blue124;}\\viewkind4\\pard\\sa0\\sb0\n"
            "\\f0\\b\\cf1\\fs40 Mihai Zamfir\\b0\\par\n\\f1\\cf2\\fs20 Consultant IT\\par\n\\f1\\fs20\\par\n"
            "\\f1\\cf1\\fs20 +40 742 932 686   |   mihai@itistul.ro   |   www.itistul.ro\\par\n"
            "\\f1\\cf2\\fs18 Strada Samuil Vulcan, nr. 12D, et. 1, biroul 15, Bucure\\u537sti, Rom\\u226ania\\par\n\\f1\\fs14\\par\n"
            "\\f0\\cf1\\fs18 I T I S T U L . R O\\par\n\\f1\\cf2\\fs14 MENTENAN\\u538T\\u258A ECHIPAMENTE IT\\par\n"
            "\\f1\\cf2\\fs14 INFRASTRUCTUR\\u258A \\'b7 SUPORT \\'b7 NETWORKING \\'b7 CLOUD \\'b7 SECURITY\\par\n}\n") % (kind, fam)

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for slug, short, fn, ff in DESIGNS:
        used.clear(); used_foto.clear()
        frag = fn()
        assert all(ord(c) < 128 for c in frag), slug
        d = os.path.join(OUT, slug); os.makedirs(d, exist_ok=True)
        nume = f"Mihai Zamfir - {short}"
        open(os.path.join(d, "fragment.html"), "w", encoding="ascii", newline="\n").write(frag)
        open(os.path.join(d, nume + ".htm"), "w", encoding="utf-8", newline="").write(HEAD + frag.replace("\n", "\r\n") + "\r\n</body>\r\n</html>\r\n")
        open(os.path.join(d, nume + ".txt"), "wb").write(TXT)
        open(os.path.join(d, nume + ".rtf"), "w", encoding="ascii", newline="\n").write(rtf(ff))
        for u in used: assert os.path.isfile(os.path.join(ASSETS, "lux", u)), u
        for u in used_foto: assert os.path.isfile(os.path.join(ASSETS, "foto", u)), u
        print(f"{slug:8s} {len(frag.encode()):6d} B  {frag.count('<td'):3d} celule  {frag.count('<table'):2d} tabele  imagini: {sorted(used | used_foto)}")
