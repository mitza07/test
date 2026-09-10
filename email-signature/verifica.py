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
    # mso-line-height-rule:exactly face motorul Word sa TAIE ce depaseste
    # inaltimea de rand. Corect pe text, fatal pe o celula cu imagine: cu
    # line-height:0 imaginea e taiata complet si nu se vede nimic.
    has_img = "<img" in t
    for st in re.findall(r'style="([^"]*)"', t):
        if "line-height:" in st and "mso-line-height-rule:exactly;line-height:" not in st:
            ck("font-size:0" in st,
               f"{name}: line-height fara mso-line-height-rule pe un stil cu text vizibil: {st[:90]}")
    if has_img:
        m = re.search(r"<td([^>]*)>\s*<p([^>]*)>\s*<img", t)
        ck(bool(m), f"{name}: <img> nu e intr-un <td><p> asteptat")
        if m:
            ck("mso-line-height-rule" not in m.group(1) + m.group(2),
               f"{name}: celula imaginii are mso-line-height-rule:exactly, "
               f"care taie imaginea in Outlook")
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
    def _inner_cells(html):
        """Perechi (atribute, continut) pentru fiecare <td>, gestionand imbricarea."""
        out, i = [], 0
        while True:
            m = re.compile(r"<td([^>]*)>").search(html, i)
            if not m: return out
            depth, j = 1, m.end()
            for tag in re.finditer(r"</?td\b[^>]*>", html[m.end():]):
                depth += 1 if not tag.group(0).startswith("</") else -1
                if depth == 0:
                    j = m.end() + tag.start(); break
            out.append((m.group(1), html[m.end():j]))
            i = j + 1
    for attrs, inner in _inner_cells(t):
        bare = re.sub(r"<table.*?</table>", "", inner, flags=re.S)   # ignora tabelele imbricate
        bare = re.sub(r"<p\b.*?</p>", "", bare, flags=re.S)         # ignora ce e deja fixat
        ck(not re.search(r"[A-Za-z0-9]", re.sub(r"<[^>]+>", "", bare)),
           f"{name}: text nefixat intr-un <td> (lipseste <p style=margin:0;padding:0>)")
    ck(all(s.startswith('<p style="margin:0;padding:0;') for s in re.findall(r"<p [^>]*>", t)),
       f"{name}: exista <p> fara margin:0;padding:0")

    for a in re.findall(r"<a [^>]*>.*?</a>", t, re.S):
        ck(a.count("text-decoration:none") >= 2, f"{name}: <a> fara <span> care repeta stilul")
        ck(a.count("font-family:") >= 2, f"{name}: <a> nu repeta font-family pe <span>")

    ents = set(int(x) for x in re.findall(r"&#(\d+);", t))
    ck(ents <= {160, 183, 194, 226, 206, 238, 258, 259, 536, 537, 538, 539, 8226, 8594},
       f"{name}: entitati neasteptate "
       f"{sorted(ents - {160,183,194,226,206,238,258,259,536,537,538,539,8226,8594})}")
    dec = re.sub(r"&#(\d+);", lambda m: chr(int(m.group(1))), t)
    for want in ["Mihai Zamfir", "Consultant IT", "ITISTUL.RO",
                 "MENTENANȚĂ ECHIPAMENTE IT", "INFRASTRUCTURĂ", "SECURITY",
                 "+40 742 932 686", "mihai@itistul.ro", "www.itistul.ro",
                 "Strada Samuil Vulcan, nr. 12D, et. 1, biroul 15",
                 "București, România"]:
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
            ck("https://raw.githubusercontent.com/mitza07/test/" in im,
               f"{name}: <img> nu trimite la GIF-ul gazduit pe GitHub")
            ck(re.search(r"/test/[0-9a-f]{40}/", im) is not None,
               f"{name}: URL-ul imaginii nu e fixat pe un SHA de commit "
               f"(o adresa pe ramura se strica daca ramura dispare)")
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
            ck(bool(bg), f"{name}: celula benzii nu declara bgcolor")
            if bg:
                import struct as _s
                gp = os.path.join(BASE, "assets",
                                  re.search(r'src="([^"]+)"', im).group(1).rsplit("/", 1)[1])
                ck(os.path.isfile(gp), f"{name}: GIF-ul referit nu exista: {gp}")
                if os.path.isfile(gp):
                    g = open(gp, "rb").read()
                    # prima intrare din tabela globala de culori = fundalul GIF-ului
                    r, gg, b = g[13], g[14], g[15]
                    want = "#%02x%02x%02x" % (r, gg, b)
                    ck(want == bg.group(1).lower(),
                       f"{name}: fundalul GIF-ului {want} != bgcolor-ul celulei {bg.group(1)}")
                    gw, gh = _s.unpack("<HH", g[6:10])
                    ck(f'width="{gw}"' in im and f'height="{gh}"' in im,
                       f"{name}: GIF-ul e {gw}x{gh}, HTML-ul declara altceva")
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
CLASIC = os.path.join(BASE, "semnatura-clasic")
for root, nume in ((SIG, "Mihai Zamfir"), (CLASIC, "Mihai Zamfir - Clasic")):
    check_fragment(os.path.join(root, "fragment.html"), allow_image=True)
    check_htm(os.path.join(root, f"{nume}.htm"))
    alt = os.path.join(root, "varianta-banda-html")
    check_fragment(os.path.join(alt, "fragment.html"))
    check_htm(os.path.join(alt, f"{nume}.htm"))
    # nicio semnatura nu mai depinde de un folder companion local: mecanismul
    # de incorporare al Outlook producea legaturi file:/// moarte
    ck(not os.path.exists(os.path.join(root, f"{nume}_files")),
       f"{nume}: folderul companion local nu ar mai trebui sa existe")
    for f in (os.path.join(root, f"{nume}.htm"), os.path.join(alt, f"{nume}.htm")):
        ck(b"File-List" not in open(f, "rb").read(),
           f"{os.path.relpath(f, BASE)}: <link rel=File-List> fara folder companion")
    # varianta alternativa: banda construita din celule, zero imagini
    bara = open(os.path.join(alt, "fragment.html"), encoding="utf-8").read()
    ck("<img" not in bara, f"{nume} banda-html: contine o imagine")
    barre = re.findall(r'<td width="(\d+)" height="3"[^>]*bgcolor="([^"]+)"', bara)
    ck(len(barre) >= 8, f"{nume} banda-html: doar {len(barre)} celule de banda")
    latime = sum(int(w) for w, _ in barre)
    astept = 508 if nume == "Mihai Zamfir" else 638
    ck(latime == astept,
       f"{nume} banda-html: celulele insumeaza {latime}px, se astepta {astept}px")
    for ext in ("rtf", "txt"):
        for d in (root, alt):
            ck(os.path.isfile(os.path.join(d, f"{nume}.{ext}")),
               f"{nume}: lipseste {os.path.relpath(d, BASE)}/{nume}.{ext}")

SIGNET = os.path.join(BASE, "semnatura-signet")
NS = "Mihai Zamfir - Signet"
check_fragment(os.path.join(SIGNET, "fragment.html"))            # nicio imagine permisa
check_htm(os.path.join(SIGNET, f"{NS}.htm"))
ck(not os.path.exists(os.path.join(SIGNET, f"{NS}_files")), f"{NS}: nu ar trebui sa aiba folder companion")
ck(b"File-List" not in open(os.path.join(SIGNET, f"{NS}.htm"), "rb").read(), f"{NS}.htm: File-List fara folder companion")
for ext in ("rtf", "txt"):
    ck(os.path.isfile(os.path.join(SIGNET, f"{NS}.{ext}")), f"{NS}: lipseste {NS}.{ext}")
sg = open(os.path.join(SIGNET, "fragment.html"), encoding="utf-8").read()
ck("Georgia" in sg, f"{NS}: numele nu foloseste Georgia (identitatea executiva)")
ck(re.search(r"font-weight:700", sg) is None, f"{NS}: designul executiv nu foloseste bold")
ck(len(re.findall(r"<table", sg)) <= 4, f"{NS}: prea multe tabele imbricate")
ck(len(sg.encode()) < 14000, f"{NS}: {len(sg.encode())} B, peste bugetul de 14 KB")
rs = open(os.path.join(SIGNET, f"{NS}.rtf"), "rb").read()
ck(rs.startswith(b"{\\rtf1") and rs.count(b"{") == rs.count(b"}") and b"Georgia" in rs,
   f"{NS}.rtf: invalid sau fara Georgia")

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

gif = os.path.join(BASE, "assets", "itistul-signal.gif")
if os.path.exists(gif):
    n = os.path.getsize(gif)
    ck(n < 20000, f"GIF: {n} B, peste pragul de 20 KB")
    g = open(gif, "rb").read()
    ck(g[:6] in (b"GIF89a", b"GIF87a"), "GIF: antet invalid")
    ck(b"NETSCAPE2.0" in g, "GIF: nu are extensia de buclare (nu se repeta)")
    import struct
    gw, gh = struct.unpack("<HH", g[6:10])
    ck((gw, gh) == (508, 28), f"GIF: {gw}x{gh}, se astepta 508x28")
    print(f"  assets/itistul-signal.gif: {n} B")
g2 = os.path.join(BASE, "assets", "itistul-pulse-clasic.gif")
if os.path.exists(g2):
    n2 = os.path.getsize(g2)
    ck(n2 < 20000, f"GIF clasic: {n2} B, peste pragul de 20 KB")
    d2 = open(g2, "rb").read()
    ck(d2[:6] in (b"GIF89a", b"GIF87a"), "GIF clasic: antet invalid")
    ck(b"NETSCAPE2.0" in d2, "GIF clasic: nu are extensia de buclare")
    print(f"  assets/itistul-pulse-clasic.gif: {n2} B")

# --- instalatorul: fiecare cale pe care o construieste trebuie sa existe ---
# Scriptul ruleaza pe masina utilizatorului, unde nu putem interveni. O cale
# gresita = instalare esuata acolo, fara diagnostic.
inst = open(os.path.join(BASE, "instalare", "INSTALEAZA-SEMNATURA.cmd"),
            encoding="ascii").read()
SEMNATURI = [("semnatura", "Mihai Zamfir"), ("semnatura-clasic", "Mihai Zamfir - Clasic")]
for arg_sub, sub in [("(fara argument)", ""), ("banda-html", "varianta-banda-html")]:
    for folder, nume in SEMNATURI:
        d = os.path.join(BASE, folder, sub)
        for ext in ("htm", "rtf", "txt"):
            f = os.path.join(d, f"{nume}.{ext}")
            ck(os.path.isfile(f), f"instalator [{arg_sub}]: lipseste {folder}/{sub}/{nume}.{ext}")
        ck(not os.path.exists(os.path.join(d, f"{nume}_files")),
           f"instalator [{arg_sub}]: {folder}/{sub} nu ar trebui sa aiba folder companion")
# Signet: fara variante, calea nu primeste %SUB%
for ext in ("htm", "rtf", "txt"):
    ck(os.path.isfile(os.path.join(BASE, "semnatura-signet", f"Mihai Zamfir - Signet.{ext}")),
       f"instalator: lipseste semnatura-signet/Mihai Zamfir - Signet.{ext}")
ck('"Mihai Zamfir - Signet"' in inst, "instalator: nu instaleaza semnatura Signet")
ck('set "IMPLICITA=Mihai Zamfir - Signet"' in inst, "instalator: argumentul signet nu seteaza implicita")
ck('\\semnatura-signet"' in inst and '\\semnatura-signet%SUB%' not in inst,
   "instalator: calea Signet nu trebuie sa primeasca %SUB%")
ck('"Mihai Zamfir - Signet"' in open(os.path.join(BASE, "instalare", "DEZINSTALEAZA.cmd"), encoding="ascii").read(),
   "dezinstalator: nu elimina semnatura Signet")
# numele semnaturilor din script trebuie sa fie exact cele de pe disc
for folder, nume in SEMNATURI:
    ck(f'"{nume}"' in inst, f"instalator: nu instaleaza semnatura {nume!r}")
    ck(f"\\{folder}%SUB%" in inst or f"\\{folder}" in inst,
       f"instalator: nu refera folderul {folder}")
ck('set "SUB=\\varianta-banda-html"' in inst,
   "instalator: argumentul banda-html nu mapeaza pe folderul corect")
ck('set "IMPLICITA=Mihai Zamfir - Clasic"' in inst,
   "instalator: argumentul clasic nu seteaza implicita corect")
# fiecare subrutina apelata trebuie sa existe si sa se termine cu exit /b
for lab in set(re.findall(r"call :(\w+)", inst)):
    ck(f"\n:{lab}\n" in inst.replace("\r\n", "\n"),
       f"instalator: se apeleaza :{lab}, dar eticheta nu exista")
for lab in set(re.findall(r"goto :(\w+)", inst)):
    if lab.lower() != "eof":
        ck(f"\n:{lab}\n" in inst.replace("\r\n", "\n"),
           f"instalator: goto :{lab}, dar eticheta nu exista")
uninst = open(os.path.join(BASE, "instalare", "DEZINSTALEAZA.cmd"), encoding="ascii").read()
for folder, nume in SEMNATURI:
    ck(f'"{nume}"' in uninst, f"dezinstalator: nu elimina semnatura {nume!r}")
for lab in set(re.findall(r"call :(\w+)", uninst)):
    ck(f"\n:{lab}\n" in uninst.replace("\r\n", "\n"),
       f"dezinstalator: se apeleaza :{lab}, dar eticheta nu exista")
ck(open(os.path.join(BASE, "instalare", "INSTALEAZA-SEMNATURA.cmd.txt"), "rb").read()
   == open(os.path.join(BASE, "instalare", "INSTALEAZA-SEMNATURA.cmd"), "rb").read(),
   "copia .cmd.txt a ramas in urma fata de .cmd")

print(f"\n{checks} verificari, {len(fails)} esecuri")
for f in fails: print("  ESEC:", f)
sys.exit(1 if fails else 0)
