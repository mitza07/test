#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Verifica semnatura fata de toate constrangerile Outlook / anti-blocare.

    python3 verifica.py

Ruleaza-l dupa ORICE modificare adusa fisierelor din semnatura/.
"""
import os, re, sys

BASE = os.path.dirname(os.path.abspath(__file__))
SIG  = os.path.join(BASE, "semnatura")
fails, checks = [], 0

def ck(cond, msg):
    global checks; checks += 1
    if not cond: fails.append(msg)

FORBIDDEN = ["<div", "<style", "<script", "<form", "<iframe", "<link", "<meta",
             "class=", "id=", "@media", "<!--", "border-radius", "box-shadow",
             "gradient", "float:", "position:", "opacity", "transform",
             "max-width", "display:flex", "display:grid", "margin-left"]
NO_IMAGE  = ["<img", "src=", "background-image", "url(", "data:", "srcset"]

def check_fragment(path, allow_image=False):
    raw = open(path, "rb").read(); t = raw.decode("utf-8")
    name = os.path.relpath(path, BASE)
    ck(all(b < 128 for b in raw), f"{name}: contine octeti non-ASCII")
    ck(t.startswith("<table") and t.rstrip().endswith("</table>"),
       f"{name}: nu este fragment curat (<table ... </table>)")
    for bad in FORBIDDEN:
        ck(bad not in t, f"{name}: contine constructia interzisa {bad!r}")
    if not allow_image:
        for bad in NO_IMAGE:
            ck(bad not in t, f"{name}: contine referinta la imagine {bad!r}")
    ck(not re.search(r"\son\w+\s*=", t), f"{name}: contine handler on*=")
    ck(t.count("line-height:") == t.count("mso-line-height-rule:exactly;line-height:"),
       f"{name}: exista line-height fara mso-line-height-rule:exactly")
    ck(re.search(r"font-weight:(?!400|700)", t) is None,
       f"{name}: font-weight in afara de 400/700")
    ck(re.search(r":\s*\.\d", t) is None, f"{name}: valoare CSS fara zero initial")
    ck(re.search(r"font-size:\d+\.\d", t) is None, f"{name}: font-size fractionar")

    for tb in re.findall(r"<table[^>]*>", t):
        for a in ['cellpadding="0"', 'cellspacing="0"', 'border="0"',
                  'role="presentation"', "border-collapse:collapse",
                  "mso-table-lspace:0pt", "mso-table-rspace:0pt", "font-family:"]:
            ck(a in tb, f"{name}: <table> fara {a}")

    tds = re.findall(r"<td[^>]*>", t)
    for c in tds:
        ck("font-family:" in c, f"{name}: <td> fara font-family inline")
        m = re.search(r'bgcolor="([^"]+)"', c)
        ck(bool(m), f"{name}: <td> fara atribut bgcolor")
        if m: ck(f"background-color:{m.group(1)};" in c,
                 f"{name}: bgcolor != background-color ({m.group(1)})")
        for attr, prop in (("width", "width"), ("height", "height")):
            m2 = re.search(rf'{attr}="(\d+)"', c)
            if m2: ck(f"{prop}:{m2.group(1)}px;" in c,
                      f"{name}: {attr}={m2.group(1)} nedeclarat si in CSS")
    ck(len(re.findall(r"<td[^>]*>\s*<p ", t)) == len(tds) - 1,
       f"{name}: nu toate celulele cu continut au <p> de fixare")
    ck(all(s.startswith('<p style="margin:0;padding:0;') for s in re.findall(r"<p [^>]*>", t)),
       f"{name}: exista <p> fara margin:0;padding:0")

    for a in re.findall(r"<a [^>]*>.*?</a>", t, re.S):
        ck(a.count("text-decoration:none") >= 2, f"{name}: <a> fara <span> care repeta stilul")
        ck(a.count("font-family:") >= 2, f"{name}: <a> nu repeta font-family pe <span>")

    ents = set(int(x) for x in re.findall(r"&#(\d+);", t))
    ck(ents <= {160, 183, 194, 226, 206, 238, 258, 259, 536, 537, 538, 539},
       f"{name}: entitati neasteptate {sorted(ents - {160,183,194,226,206,238,258,259,536,537,538,539})}")
    dec = re.sub(r"&#(\d+);", lambda m: chr(int(m.group(1))), t)
    for want in ["Mihai Zamfir", "Consultant IT", "ITISTUL.RO",
                 "MENTENANȚĂ ECHIPAMENTE IT", "INFRASTRUCTURĂ", "SECURITY",
                 "+40 742 932 686", "mihai@itistul.ro", "www.itistul.ro",
                 "Strada Samuil Vulcan, nr. 12D, et. 1, biroul 15, București, România"]:
        ck(want in dec, f"{name}: lipseste continutul {want!r}")
    for h in ["tel:+40742932686", "mailto:mihai@itistul.ro", "https://www.itistul.ro/"]:
        ck(h in t, f"{name}: lipseste href {h}")
    ck(t.count("<td") == t.count("</td>") and t.count("<tr") == t.count("</tr>")
       and t.count("<table") == t.count("</table>"), f"{name}: taguri dezechilibrate")
    ck("border-top:1px solid" in t, f"{name}: linia despartitoare nu e border-top")
    if allow_image:
        imgs = re.findall(r"<img [^>]*>", t)
        ck(len(imgs) == 1, f"{name}: se asteapta exact o imagine, gasite {len(imgs)}")
        for im in imgs:
            ck('src="https://' in im, f"{name}: <img> fara sursa HTTPS")
            ck('alt="' in im, f"{name}: <img> fara atribut alt")
            ck('border="0"' in im and "display:block" in im,
               f"{name}: <img> fara border=0 / display:block")
            for at, pr in (("width", "width"), ("height", "height")):
                m = re.search(rf'{at}="(\d+)"', im)
                ck(bool(m) and f"{pr}:{m.group(1)}px;" in im,
                   f"{name}: <img> {at} nedeclarat si ca atribut si in CSS")
        # celula care contine banda trebuie sa aiba acelasi fundal ca banda,
        # ca starea blocata sa arate ca spatiu, nu ca o gaura
        cell = re.search(r'<td([^>]*)>\s*<p[^>]*>\s*<img', t)
        ck(bool(cell), f"{name}: <img> nu e intr-un <p> fixat")
        if cell:
            bg = re.search(r'bgcolor="([^"]+)"', cell.group(1))
            ck(bool(bg) and bg.group(1).lower() == "#0a1628",
               f"{name}: celula benzii nu are fundalul navy al GIF-ului")
    ck("+40&#160;742&#160;932&#160;686" in t, f"{name}: telefonul nu e lipit cu nbsp")
    print(f"  {name}: {len(raw)} B, {len(tds)} celule")

def check_htm(path):
    d = open(path, "rb").read(); name = os.path.relpath(path, BASE)
    ck(d[:3] == b"\xef\xbb\xbf", f"{name}: lipseste BOM UTF-8")
    ck(b"http-equiv" in d[:1024], f"{name}: lipseste <meta http-equiv> in primii 1024 B")
    ck(b"<!doctype html>" in d[:200], f"{name}: lipseste doctype")
    ck(all(b < 128 for b in d[3:]), f"{name}: octeti non-ASCII in corp")
    ck(b"\n" not in d.replace(b"\r\n", b""), f"{name}: linii care nu sunt CRLF")
    print(f"  {name}: {len(d)} B")

print("Verificare semnatura ITISTUL.RO\n")
check_fragment(os.path.join(SIG, "fragment.html"), allow_image=True)
check_htm(os.path.join(SIG, "Mihai Zamfir.htm"))
check_fragment(os.path.join(SIG, "varianta-fara-imagini", "fragment.html"))
check_htm(os.path.join(SIG, "varianta-fara-imagini", "Mihai Zamfir.htm"))

rtf = open(os.path.join(SIG, "Mihai Zamfir.rtf"), "rb").read()
ck(rtf.startswith(b"{\\rtf1"), "RTF: nu incepe cu {\\rtf1 (BOM?)")
ck(rtf.count(b"{") == rtf.count(b"}"), "RTF: acolade dezechilibrate")
ck(b"\\sa0" in rtf, "RTF: space-after nu e zero")
ck(all(b < 128 for b in rtf), "RTF: octeti non-ASCII (foloseste \\uN escapes)")
print(f"  semnatura/Mihai Zamfir.rtf: {len(rtf)} B")

txt = open(os.path.join(SIG, "Mihai Zamfir.txt"), "rb").read()
ck(txt[:3] == b"\xef\xbb\xbf", "TXT: lipseste BOM UTF-8")
ck(b"+40 742 932 686" in txt and b"mihai@itistul.ro" in txt, "TXT: date de contact lipsa")
print(f"  semnatura/Mihai Zamfir.txt: {len(txt)} B")

for p in ["instalare/INSTALEAZA-SEMNATURA.cmd", "instalare/DEZINSTALEAZA.cmd"]:
    d = open(os.path.join(BASE, p), "rb").read()
    ck(all(b < 128 for b in d), f"{p}: octeti non-ASCII (batch trebuie ASCII)")
    ck(b"\n" not in d.replace(b"\r\n", b""), f"{p}: linii care nu sunt CRLF")
    ck(not re.search(rb"powershell(\.exe)?\s+[-/]", d.lower()),
       f"{p}: invoca PowerShell")

gif = os.path.join(SIG, "itistul-signal.gif")
if os.path.exists(gif):
    n = os.path.getsize(gif)
    ck(n < 20000, f"GIF: {n} B, peste pragul de 20 KB")
    g = open(gif, "rb").read()
    ck(g[:6] in (b"GIF89a", b"GIF87a"), "GIF: antet invalid")
    ck(b"NETSCAPE2.0" in g, "GIF: nu are extensia de buclare (nu se repeta)")
    import struct
    gw, gh = struct.unpack("<HH", g[6:10])
    ck((gw, gh) == (508, 28), f"GIF: {gw}x{gh}, se astepta 508x28")
    frag = open(os.path.join(SIG, "fragment.html"), encoding="utf-8").read()
    ck(f'width="{gw}"' in frag and f'height="{gh}"' in frag,
       "GIF: dimensiunile reale nu corespund cu cele declarate in HTML")
    print(f"  semnatura/itistul-signal.gif: {n} B")

print(f"\n{checks} verificari, {len(fails)} esecuri")
for f in fails: print("  ESEC:", f)
sys.exit(1 if fails else 0)
