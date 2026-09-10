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

def _strip_tables(html):
    """Elimina blocurile <table>...</table> echilibrate (regex-ul non-greedy
    se oprea la primul </table>, deci lasa in urma celule ale tabelului exterior)."""
    out, i = [], 0
    while True:
        m = re.compile(r"<table\b").search(html, i)
        if not m: out.append(html[i:]); return "".join(out)
        out.append(html[i:m.start()])
        depth, j = 0, m.start()
        for tag in re.finditer(r"</?table\b", html[m.start():]):
            depth += 1 if not tag.group(0).startswith("</") else -1
            if depth == 0: j = m.start() + tag.end(); break
        i = html.find(">", j) + 1

def check_fragment(path, allow_image=False, caps=False):
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
        bare = _strip_tables(inner)                                   # ignora tabelele imbricate
        # o celula direct in alta celula, fara tabel intre ele, e HTML invalid:
        # browserul o scoate afara din card (bug intalnit la subsolurile colectiei)
        ck("<td" not in bare and "<tr" not in bare,
           f"{name}: <td> pus direct intr-un <td>, fara tabel intre ele")
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
    dec = re.sub(r"<[^>]+>", "", re.sub(r"&#(\d+);", lambda m: chr(int(m.group(1))), t))  # doar textul
    for want in ["Mihai Zamfir", "Consultant IT", "ITISTUL.RO",
                 "MENTENANȚĂ ECHIPAMENTE IT", "INFRASTRUCTURĂ", "SECURITY",
                 "+40 742 932 686", "mihai@itistul.ro", "www.itistul.ro",
                 "Strada Samuil Vulcan, nr. 12D, et. 1, biroul 15",
                 "București, România"]:
        ck((want.upper() in dec.upper()) if caps else (want in dec),
           f"{name}: lipseste continutul {want!r}")
    for h in ["tel:+40742932686", "mailto:mihai@itistul.ro", "https://www.itistul.ro/"]:
        ck(h in t, f"{name}: lipseste href {h}")
    ck(t.count("<td") == t.count("</td>") and t.count("<tr") == t.count("</tr>")
       and t.count("<table") == t.count("</table>"), f"{name}: taguri dezechilibrate")
    ck("border-top:1px solid" in t, f"{name}: linia despartitoare nu e border-top")
    if allow_image:
        imgs = re.findall(r"<img [^>]*>", t)
        if allow_image == "png":
            ck(1 <= len(imgs) <= 3, f"{name}: se asteapta 1-3 imagini (ornamente + fotografie), gasite {len(imgs)}")
        else:
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
        if allow_image == "png":
            # fiecare ornament e copt pe fundalul exact al celulei: pixelul din colt
            # trebuie sa fie egal cu bgcolor-ul, iar dimensiunile cu cele declarate
            from PIL import Image as _I
            for cattrs, im in re.findall(r'<td([^>]*)>\s*<p[^>]*>\s*(<img [^>]*>)', t):
                bg = re.search(r'bgcolor="([^"]+)"', cattrs)
                ck(bool(bg), f"{name}: celula imaginii nu declara bgcolor")
                src = re.search(r'src="([^"]+)"', im).group(1)
                dw = int(re.search(r'width="(\d+)"', im).group(1)); dh = int(re.search(r'height="(\d+)"', im).group(1))
                if "/assets/foto/" in src:
                    # fotografia: fisier la 2x fata de dimensiunea afisata (clar pe HiDPI), JPEG baseline sau
                    # PNG copt pe fundalul celulei (rama "floare"), sub 60 KB
                    gp = os.path.join(BASE, "assets", "foto", src.rsplit("/", 1)[1])
                    ck(os.path.isfile(gp), f"{name}: fotografia referita nu exista: {gp}")
                    if os.path.isfile(gp):
                        pic = _I.open(gp); raw_ = open(gp, "rb").read()
                        ck(pic.size == (2 * dw, 2 * dh), f"{name}: fotografia e {pic.size}, se astepta {(2 * dw, 2 * dh)} (2x)")
                        ck(len(raw_) < 60000, f"{name}: fotografie peste 60 KB: {gp}")
                        if gp.endswith(".png") and bg:
                            px = "#%02x%02x%02x" % pic.convert("RGB").getpixel((0, 0))
                            ck(px == bg.group(1).lower(), f"{name}: fundalul ramei {px} != bgcolor-ul celulei {bg.group(1)}")
                        if gp.endswith(".jpg"):
                            ck(raw_[:2] == b"\xff\xd8" and b"\xff\xc2" not in raw_, f"{name}: JPEG progresiv sau invalid: {gp}")
                            ck(b"Exif" not in raw_[:64], f"{name}: JPEG cu EXIF: {gp}")
                    continue
                gp = os.path.join(BASE, "assets", "lux", src.rsplit("/", 1)[1])
                ck(os.path.isfile(gp), f"{name}: ornamentul referit nu exista: {gp}")
                if bg and os.path.isfile(gp):
                    pic = _I.open(gp).convert("RGB")
                    px = "#%02x%02x%02x" % pic.getpixel((pic.width - 1, pic.height // 2))
                    ck(px == bg.group(1).lower(), f"{name}: fundalul PNG {px} != bgcolor-ul celulei {bg.group(1)}")
                    ck(pic.size == (dw, dh), f"{name}: PNG-ul e {pic.size}, HTML-ul declara {(dw, dh)}")
                    ck(os.path.getsize(gp) < 20000, f"{name}: ornament peste 20 KB: {gp}")
            cell = None
        else:
            cell = re.search(r'<td([^>]*)>\s*<p[^>]*>\s*<img', t)
        ck(allow_image == "png" or bool(cell), f"{name}: <img> nu e intr-un <p> fixat")
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

PULS = os.path.join(BASE, "semnatura-puls")
NP = "Mihai Zamfir - Puls"
check_fragment(os.path.join(PULS, "fragment.html"))              # nicio imagine permisa
check_htm(os.path.join(PULS, f"{NP}.htm"))
ck(not os.path.exists(os.path.join(PULS, f"{NP}_files")), f"{NP}: nu ar trebui sa aiba folder companion")
ck(b"File-List" not in open(os.path.join(PULS, f"{NP}.htm"), "rb").read(), f"{NP}.htm: File-List fara folder companion")
for ext in ("rtf", "txt"):
    ck(os.path.isfile(os.path.join(PULS, f"{NP}.{ext}")), f"{NP}: lipseste {NP}.{ext}")
pg = open(os.path.join(PULS, "fragment.html"), encoding="utf-8").read()
ck(pg.count("<table") == 1, f"{NP}: se astepta un singur tabel (adancime 1), gasite {pg.count('<table')}")
ck(len(pg.encode()) < 16000, f"{NP}: {len(pg.encode())} B, peste bugetul de 16 KB")
ck(len(re.findall(r'<td[^>]*height="\d+"', pg)) <= 60, f"{NP}: prea multe celule grafice")


# --- colectia: 17 variante dupa referintele trimise ---------------------------
COL = os.path.join(BASE, "colectie")
COLECTIE = [("lux-%d" % i, "Lux %d" % i) for i in range(1, 10)] + [("rose", "Rose")] + \
           [("noir-%d" % i, "Noir %d" % i) for i in range(1, 4)] + \
           [("mono-%d" % i, "Mono %d" % i) for i in range(1, 4)] + [("aur", "Aur")]
folosite, foto_folosite = set(), set()
for slug, short in COLECTIE:
    d = os.path.join(COL, slug); nume = f"Mihai Zamfir - {short}"
    frag = os.path.join(d, "fragment.html")
    ck(os.path.isfile(frag), f"colectie/{slug}: lipseste fragment.html")
    if not os.path.isfile(frag): continue
    fg = open(frag, encoding="utf-8").read()
    cu_foto = "/assets/foto/" in fg
    check_fragment(frag, allow_image=("png" if (slug.startswith("lux") or cu_foto) else False), caps=True)
    check_htm(os.path.join(d, f"{nume}.htm"))
    for ext in ("rtf", "txt"):
        ck(os.path.isfile(os.path.join(d, f"{nume}.{ext}")), f"colectie/{slug}: lipseste {nume}.{ext}")
    ck(not os.path.exists(os.path.join(d, f"{nume}_files")), f"colectie/{slug}: nu ar trebui sa aiba folder companion")
    ck(b"File-List" not in open(os.path.join(d, f"{nume}.htm"), "rb").read(), f"colectie/{slug}: File-List fara folder companion")
    ck(len(fg.encode()) < 17000, f"colectie/{slug}: {len(fg.encode())} B, peste bugetul de 17 KB")
    ck(fg.count("<table") <= 10, f"colectie/{slug}: {fg.count('<table')} tabele, prea multe")
    if slug != "lux-4":   # referinta Lux 4 e singura fara fotografie
        ck(">MZ<" in fg or cu_foto, f"colectie/{slug}: lipseste medalionul-monograma (locul fotografiei)")
    ck('width="600"' in fg.split(">", 1)[0], f"colectie/{slug}: latimea exterioara nu e 600")
    if not slug.startswith("lux"):   # in afara fotografiei, niciun fel de imagine
        ck(all("/assets/foto/" in u for u in re.findall(r'<img [^>]*src="([^"]+)"', fg)),
           f"colectie/{slug}: designul trebuie sa fie fara imagini (in afara fotografiei)")
    folosite |= set(re.findall(r'/assets/lux/([^"]+)"', fg))
    foto_folosite |= set(re.findall(r'/assets/foto/([^"]+)"', fg))
    rs = open(os.path.join(d, f"{nume}.rtf"), "rb").read()
    ck(rs.startswith(b"{\\rtf1") and rs.count(b"{") == rs.count(b"}") and all(b < 128 for b in rs),
       f"colectie/{slug}: RTF invalid")
lux_dir = os.path.join(BASE, "assets", "lux")
pe_disc = set(os.listdir(lux_dir)) if os.path.isdir(lux_dir) else set()
ck(folosite <= pe_disc, f"colectie: ornamente referite dar inexistente: {sorted(folosite - pe_disc)}")
ck(pe_disc <= folosite, f"colectie: ornamente orfane in assets/lux: {sorted(pe_disc - folosite)}")
foto_dir = os.path.join(BASE, "assets", "foto")
foto_disc = set(os.listdir(foto_dir)) if os.path.isdir(foto_dir) else set()
ck(foto_folosite <= foto_disc, f"colectie: fotografii referite dar inexistente: {sorted(foto_folosite - foto_disc)}")
ck(foto_disc <= foto_folosite, f"colectie: fotografii orfane in assets/foto: {sorted(foto_disc - foto_folosite)}")
# ori toate variantele cu fotografie, ori niciuna (in afara de Lux 4, care nu are loc de fotografie)
cu = [slug for slug, _ in COLECTIE if slug != "lux-4" and os.path.isfile(os.path.join(COL, slug, "fragment.html"))
      and "/assets/foto/" in open(os.path.join(COL, slug, "fragment.html"), encoding="utf-8").read()]
ck(len(cu) in (0, len(COLECTIE) - 1), f"colectie: fotografia e montata doar in {len(cu)} din {len(COLECTIE) - 1} variante")

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
for ext in ("htm", "rtf", "txt"):
    ck(os.path.isfile(os.path.join(BASE, "semnatura-puls", f"Mihai Zamfir - Puls.{ext}")),
       f"instalator: lipseste semnatura-puls/Mihai Zamfir - Puls.{ext}")
ck('"Mihai Zamfir - Puls"' in inst, "instalator: nu instaleaza semnatura Puls")
ck('set "IMPLICITA=Mihai Zamfir - Puls"' in inst, "instalator: argumentul puls nu seteaza implicita")
ck('\\semnatura-puls"' in inst and '\\semnatura-puls%SUB%' not in inst, "instalator: calea Puls nu trebuie sa primeasca %SUB%")
ck('"Mihai Zamfir - Puls"' in open(os.path.join(BASE, "instalare", "DEZINSTALEAZA.cmd"), encoding="ascii").read(),
   "dezinstalator: nu elimina semnatura Puls")
for slug, short in COLECTIE:
    nume = f"Mihai Zamfir - {short}"
    ck(f'"{nume}"' in inst, f"instalator: nu instaleaza semnatura {nume!r}")
    ck(f'\\colectie\\{slug}"' in inst and f'\\colectie\\{slug}%SUB%' not in inst,
       f"instalator: calea colectie/{slug} lipseste sau primeste %SUB%")
    ck(f'set "IMPLICITA={nume}"' in inst, f"instalator: argumentul {slug} nu seteaza implicita")
    ck(f'"{nume}"' in open(os.path.join(BASE, "instalare", "DEZINSTALEAZA.cmd"), encoding="ascii").read(),
       f"dezinstalator: nu elimina semnatura {nume!r}")
    for ext in ("htm", "rtf", "txt"):
        ck(os.path.isfile(os.path.join(BASE, "colectie", slug, f"{nume}.{ext}")),
           f"instalator: lipseste colectie/{slug}/{nume}.{ext}")
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
