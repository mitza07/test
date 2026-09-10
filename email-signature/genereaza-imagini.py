# -*- coding: utf-8 -*-
"""Colectia-imagine: cele 17 referinte redate ca imagini, cu datele lui Mihai.

    python3 genereaza-imagini.py [--foto portret.jpg] [--fisa fisa.png]

Fiecare design e desenat vectorial (PIL) la 4x si redus la 2x fata de latimea
afisata (600 px) => 1200 px, clar pe HiDPI. Fara fotografie, in locul ei sta
un medalion cu monograma; cu --foto, portretul intra in rama fiecarui design.
Fonturile sunt OFL (Google Fonts), coapte in imagine; destinatarul nu are
nevoie de ele.
"""
import argparse, importlib.util, math, os
from PIL import Image, ImageDraw, ImageFont

BASE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(BASE, "assets", "imagini")
FONTS = os.path.join(BASE, "fonturi")
S = 4                                    # scara de desen; iesirea e S/2 = 2x
W = 600

# ---- date --------------------------------------------------------------------
NUME, TITLU, BRAND = "Mihai Zamfir", "Consultant IT", "ITISTUL.RO"
TAGLINE = "Mentenanță echipamente IT"
TEL, MAIL, WEB = "+40 742 932 686", "mihai@itistul.ro", "www.itistul.ro"
ADR1, ADR2 = "Strada Samuil Vulcan, nr. 12D, et. 1, biroul 15", "București, România"
DISCIPL = "Infrastructură · Suport · Networking · Cloud · Security"

# ---- culori ------------------------------------------------------------------
GOLD, GOLD_HI, GOLD_LO, GOLD_TXT = (201, 169, 97), (238, 218, 160), (128, 100, 44), (212, 178, 94)
IVORY = (233, 222, 190)
NEGRU, NEGRU_L, GRI_INCHIS, PRUNA, PRUNA2 = (18, 18, 18), (27, 27, 27), (30, 30, 30), (26, 18, 32), (44, 28, 50)

# ---- mandale (din genereaza-mandale.py) ---------------------------------------
_spec = importlib.util.spec_from_file_location("mand", os.path.join(BASE, "genereaza-mandale.py"))
mand = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(mand)
assert mand.SS == S

def lerp(a, b, t): return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))

# ---- fonturi -----------------------------------------------------------------
_fc = {}
def font(name, size, var=None):
    key = (name, size, var)
    if key in _fc: return _fc[key]
    f = ImageFont.truetype(os.path.join(FONTS, name), int(round(size * S)))
    if var:
        try: f.set_variation_by_name(var)
        except Exception: f.set_variation_by_name(var.encode())
    _fc[key] = f; return f

MONT_B = lambda s: font("Montserrat.ttf", s, "Bold")
MONT_SB = lambda s: font("Montserrat.ttf", s, "SemiBold")
MONT_M = lambda s: font("Montserrat.ttf", s, "Medium")
MONT_R = lambda s: font("Montserrat.ttf", s, "Regular")
MONT_L = lambda s: font("Montserrat.ttf", s, "Light")
JOS_R = lambda s: font("JosefinSans.ttf", s, "Regular")
JOS_L = lambda s: font("JosefinSans.ttf", s, "Light")
CORM = lambda s: font("Cormorant.ttf", s, "SemiBold")
CORM_R = lambda s: font("Cormorant.ttf", s, "Regular")
SCRIPT = lambda s: font("GreatVibes.ttf", s)
ALLURA = lambda s: font("Allura.ttf", s)
LATO_B = lambda s: font("Lato-Bold.ttf", s)
LATO_R = lambda s: font("Lato-Regular.ttf", s)
DEJA_B = lambda s: ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", int(s * S))
DEJA_R = lambda s: ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", int(s * S))

# ---- panza -------------------------------------------------------------------
class Canvas:
    def __init__(self, h, bg):
        self.w, self.h = W, h
        self.im = Image.new("RGB", (W * S, h * S), bg)
        self.d = ImageDraw.Draw(self.im)
    def p(self, x, y): return (x * S, y * S)
    # text cu letter-spacing (in unitati 1x)
    def text(self, x, y, s, f, fill, ls=0.0, anchor="ls"):
        if not ls:
            self.d.text(self.p(x, y), s, font=f, fill=fill, anchor=anchor); return self.tw(s, f)
        if anchor[0] == "m": x -= self.tw(s, f, ls) / 2
        elif anchor[0] == "r": x -= self.tw(s, f, ls)
        cx = x * S
        for ch in s:
            self.d.text((cx, y * S), ch, font=f, fill=fill, anchor="l" + anchor[1])
            cx += f.getlength(ch) + ls * S
        return self.tw(s, f, ls)
    def tw(self, s, f, ls=0.0):
        return (sum(f.getlength(ch) for ch in s) + max(0, len(s) - 1) * ls * S) / S if ls else f.getlength(s) / S
    def wrap(self, s, f, maxw):
        words, lines, cur = s.split(), [], ""
        for w_ in words:
            t = (cur + " " + w_).strip()
            if self.tw(t, f) <= maxw or not cur: cur = t
            else: lines.append(cur); cur = w_
        if cur: lines.append(cur)
        return lines
    def rect(self, x0, y0, x1, y1, fill=None, outline=None, width=1, r=0):
        if r: self.d.rounded_rectangle([x0 * S, y0 * S, x1 * S, y1 * S], radius=r * S, fill=fill, outline=outline, width=int(width * S))
        else: self.d.rectangle([x0 * S, y0 * S, x1 * S, y1 * S], fill=fill, outline=outline, width=int(width * S))
    def circle(self, cx, cy, r, fill=None, outline=None, width=1):
        self.d.ellipse([(cx - r) * S, (cy - r) * S, (cx + r) * S, (cy + r) * S], fill=fill, outline=outline, width=int(width * S))
    def line(self, pts, fill, width=1):
        self.d.line([self.p(*q) for q in pts], fill=fill, width=int(width * S), joint="curve")
    def hgrad(self, c0, c1, x0=0, x1=None, y0=0, y1=None):
        x1 = x1 or self.w; y1 = y1 or self.h
        for x in range(x0 * S, x1 * S):
            self.d.line([(x, y0 * S), (x, y1 * S)], fill=lerp(c0, c1, (x - x0 * S) / max(1, (x1 - x0) * S)))
    def mandala(self, cx, cy, R, kind="filled", bg=NEGRU, faint=None, rot=0.0):
        m = mand.Mandala(self.d, cx, cy, R, bg, faint=faint)
        (mand.recipe_filled if kind == "filled" else mand.recipe_outline)(m, rot=rot)
    def rotated_text(self, cx, cy, s, f, fill, angle=90):
        w, h = int(f.getlength(s)) + 20, int(f.size * 1.6)
        tmp = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        ImageDraw.Draw(tmp).text((10, h // 2), s, font=f, fill=fill + (255,), anchor="lm")
        tmp = tmp.rotate(angle, expand=True, resample=Image.BICUBIC)
        self.im.paste(tmp, (int(cx * S - tmp.width / 2), int(cy * S - tmp.height / 2)), tmp)
    def ring_text(self, cx, cy, r, s, f, fill, start=-90, spread=360):
        """Text pe cerc (sigle rotunde)."""
        total = sum(f.getlength(ch) for ch in s)
        circ = 2 * math.pi * r * S
        ang = math.radians(start) + (spread / 360 * 2 * math.pi - total / (r * S)) / 2 if spread < 360 else math.radians(start)
        for ch in s:
            wch = f.getlength(ch); a = ang + wch / 2 / (r * S)
            tmp = Image.new("RGBA", (int(wch) + 8, int(f.size * 1.4)), (0, 0, 0, 0))
            ImageDraw.Draw(tmp).text((4, tmp.height / 2), ch, font=f, fill=fill + (255,), anchor="lm")
            tmp = tmp.rotate(-math.degrees(a) - 90, expand=True, resample=Image.BICUBIC)
            px, py = cx * S + r * S * math.cos(a), cy * S + r * S * math.sin(a)
            self.im.paste(tmp, (int(px - tmp.width / 2), int(py - tmp.height / 2)), tmp)
            ang += wch / (r * S)
    def paste_photo(self, portrait, box, shape="rect", r=0, zoom=1.0, face=(0.5, 0.42)):
        """Portretul (sau un substitut) decupat in dreptunghi / cerc / colturi rotunjite."""
        x0, y0, x1, y1 = [v * S for v in box]
        w, h = int(x1 - x0), int(y1 - y0)
        if portrait is None:
            ph = Image.new("RGB", (w, h), (36, 36, 36)); dd = ImageDraw.Draw(ph)
            for yy in range(h): dd.line([(0, yy), (w, yy)], fill=lerp((52, 52, 52), (24, 24, 24), yy / h))
            f = font("Cormorant.ttf", min(w, h) / S * 0.42, "SemiBold")
            dd.text((w / 2, h / 2), "MZ", font=f, fill=GOLD, anchor="mm")
        else:
            Wp, Hp = portrait.size; ratio = w / h
            cw, ch = (Wp, Wp / ratio) if Wp / Hp <= ratio else (Hp * ratio, Hp)
            cw, ch = cw / zoom, ch / zoom
            cx, cy = face[0] * Wp, face[1] * Hp
            sx = min(max(cx - cw / 2, 0), Wp - cw); sy = min(max(cy - ch / 2, 0), Hp - ch)
            ph = portrait.crop((int(sx), int(sy), int(sx + cw), int(sy + ch))).resize((w, h), Image.LANCZOS)
        mask = Image.new("L", (w, h), 255)
        if shape == "circle": mask = Image.new("L", (w, h), 0); ImageDraw.Draw(mask).ellipse([0, 0, w - 1, h - 1], fill=255)
        elif shape == "round": mask = Image.new("L", (w, h), 0); ImageDraw.Draw(mask).rounded_rectangle([0, 0, w - 1, h - 1], radius=int(r * S), fill=255)
        self.im.paste(ph, (int(x0), int(y0)), mask)
    def flower(self, cx, cy, r, portrait, bg, n=14):
        """Rama 'floare' aurie cu portret circular (Lux)."""
        def gold(ang, depth=0.0):
            f = 0.5 + 0.5 * math.cos(ang - math.radians(-70))
            return lerp(lerp(GOLD_LO, GOLD_HI, f ** 1.4), GOLD_LO, depth)
        def petal(r0, r1, ang, Wd):
            pa, pb = [], []
            for k in range(25):
                t = k / 24; rr = r0 + (r1 - r0) * t; ww = Wd * math.sin(math.pi * t) ** 0.55
                ca, sa = math.cos(ang), math.sin(ang); x, y = cx * S + rr * S * ca, cy * S + rr * S * sa
                pa.append((x - ww * S * sa, y + ww * S * ca)); pb.append((x + ww * S * sa, y - ww * S * ca))
            return pa + pb[::-1]
        for i in range(n):
            a = 2 * math.pi * i / n
            self.d.polygon(petal(r * 0.52, r * 0.99, a, r * 0.11), fill=gold(a))
            self.d.polygon(petal(r * 0.60, r * 0.90, a, r * 0.045), fill=gold(a, 0.5))
        for i in range(n):
            a = 2 * math.pi * (i + 0.5) / n
            self.d.polygon(petal(r * 0.56, r * 0.86, a, r * 0.07), fill=gold(a, 0.2))
        rr = r * 0.70
        self.paste_photo(portrait, (cx - rr, cy - rr, cx + rr, cy + rr), shape="circle", zoom=1.15)
        self.circle(cx, cy, rr, outline=GOLD_HI, width=1.6)
        self.circle(cx, cy, rr * 0.965, outline=GOLD_LO, width=0.8)
    def leaf_frame(self, cx, cy, r, portrait):
        """Rama cu frunze (Lux 6): petale lungi, rare."""
        self.flower(cx, cy, r, portrait, None, n=8)
    # pictograme liniare, in unitati 1x
    def ic_phone(self, x, y, s, c):
        self.line([(x + s * 0.2, y + s * 0.15), (x + s * 0.35, y + s * 0.45), (x + s * 0.55, y + s * 0.65), (x + s * 0.85, y + s * 0.8)], c, s * 0.16)
        self.circle(x + s * 0.2, y + s * 0.15, s * 0.14, fill=c); self.circle(x + s * 0.85, y + s * 0.8, s * 0.14, fill=c)
    def ic_mail(self, x, y, s, c):
        self.rect(x + s * 0.05, y + s * 0.2, x + s * 0.95, y + s * 0.8, outline=c, width=s * 0.09)
        self.line([(x + s * 0.05, y + s * 0.22), (x + s * 0.5, y + s * 0.55), (x + s * 0.95, y + s * 0.22)], c, s * 0.09)
    def ic_globe(self, x, y, s, c):
        self.circle(x + s / 2, y + s / 2, s * 0.42, outline=c, width=s * 0.09)
        self.d.ellipse([(x + s * 0.3) * S, (y + s * 0.08) * S, (x + s * 0.7) * S, (y + s * 0.92) * S], outline=c, width=int(s * 0.07 * S))
        self.line([(x + s * 0.1, y + s / 2), (x + s * 0.9, y + s / 2)], c, s * 0.07)
    def ic_pin(self, x, y, s, c):
        self.circle(x + s / 2, y + s * 0.38, s * 0.3, fill=c)
        self.d.polygon([((x + s * 0.24) * S, (y + s * 0.5) * S), ((x + s * 0.76) * S, (y + s * 0.5) * S), ((x + s * 0.5) * S, (y + s * 0.98) * S)], fill=c)
        self.circle(x + s / 2, y + s * 0.38, s * 0.12, fill=(20, 20, 20))
    def ic_send(self, x, y, s, c):
        self.d.polygon([((x + s * 0.05) * S, (y + s * 0.45) * S), ((x + s * 0.95) * S, (y + s * 0.1) * S), ((x + s * 0.6) * S, (y + s * 0.95) * S), ((x + s * 0.45) * S, (y + s * 0.58) * S)], fill=c)
    def ic_home(self, x, y, s, c):
        self.d.polygon([((x + s * 0.5) * S, (y + s * 0.08) * S), ((x + s * 0.95) * S, (y + s * 0.5) * S), ((x + s * 0.8) * S, (y + s * 0.5) * S), ((x + s * 0.8) * S, (y + s * 0.92) * S),
                        ((x + s * 0.2) * S, (y + s * 0.92) * S), ((x + s * 0.2) * S, (y + s * 0.5) * S), ((x + s * 0.05) * S, (y + s * 0.5) * S)], fill=c)
    def ic_chat(self, x, y, s, c):
        self.rect(x + s * 0.05, y + s * 0.12, x + s * 0.95, y + s * 0.72, fill=c, r=s * 0.18)
        self.d.polygon([((x + s * 0.25) * S, (y + s * 0.7) * S), ((x + s * 0.45) * S, (y + s * 0.7) * S), ((x + s * 0.22) * S, (y + s * 0.95) * S)], fill=c)
    def icon(self, kind, x, y, s, c):
        getattr(self, "ic_" + kind)(x, y, s, c)
    def out(self, path, photo_mode):
        im = self.im.resize((self.w * 2, self.h * 2), Image.LANCZOS)
        if path.endswith(".jpg"):
            im.save(path, "JPEG", quality=86, optimize=True, progressive=False)
        else:
            im.quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG if photo_mode else Image.Dither.NONE).save(path, optimize=True)
        return im

# ---- blocuri comune Lux --------------------------------------------------------
def lux_name(c, x, y, size=17, ls=2.5, color=GOLD_TXT, title_color=(196, 176, 128), brand=True, align="l"):
    c.text(x, y, NUME.upper(), MONT_B(size), color, ls=ls, anchor=align + "s")
    c.text(x, y + 18, TITLU, MONT_R(10.5), title_color, anchor=align + "s")
    if brand: c.text(x, y + 38, BRAND, MONT_M(6.5), GOLD_LO, ls=4, anchor=align + "s")

def lux_contacts(c, x, y, colw, size=10, gapy=21, color=(214, 200, 160), icon_c=GOLD, address=True, sep_lines=False):
    f = MONT_R(size); rows = [("phone", TEL), ("mail", MAIL), ("globe", WEB)]
    if address: rows.append(("pin", ADR1 + ", " + ADR2))
    yy = y
    for kind, val in rows:
        lines = c.wrap(val, f, colw - 22) if kind == "pin" else [val]
        c.icon(kind, x, yy - size * 0.95, size * 1.05, icon_c)
        for i, ln in enumerate(lines):
            c.text(x + 18, yy + i * (size + 3), ln, f, color)
        yy += gapy + (len(lines) - 1) * (size + 3)
    return yy

def lux_logo(c, x, y, color=GOLD_TXT):
    """'LOGO / slogan here' din referinte -> sigla IT + brand + tagline."""
    c.rect(x, y - 13, x + 26, y + 3, fill=GOLD, r=3)
    c.text(x + 13, y - 5, "IT", MONT_B(9), NEGRU, anchor="mm")
    c.text(x + 33, y - 3, BRAND, MONT_B(9.5), color, ls=1)
    c.text(x + 33, y + 6, TAGLINE.upper(), MONT_M(4.8), GOLD_LO, ls=1.2)

# ---- cele 9 Lux --------------------------------------------------------------
def lux1(P):
    c = Canvas(190, NEGRU)
    curve = [(150 + 34 * math.sin(math.pi * t), t * 190) for t in [k / 80 for k in range(81)]]
    c.d.polygon([c.p(0, 0)] + [c.p(*q) for q in curve] + [c.p(0, 190)], fill=NEGRU_L)
    c.line(curve, GOLD, 1.4)
    c.mandala(2, 95, 92, "filled", NEGRU_L)
    c.flower(238, 95, 44, P, NEGRU)
    lux_name(c, 300, 88)
    lux_contacts(c, 458, 58, 142, address=True, size=9.5, gapy=21)
    return c

def lux2(P):
    c = Canvas(190, NEGRU)
    for cx in (40, 200, 360, 520):
        c.mandala(cx, -46, 88, "filled", NEGRU, rot=math.pi / 40); c.mandala(cx, 236, 88, "filled", NEGRU, rot=math.pi / 40)
    for cx in (120, 280, 440):
        mand.recipe_mini(mand.Mandala(c.d, cx, 16, 11, NEGRU)); mand.recipe_mini(mand.Mandala(c.d, cx, 174, 11, NEGRU))
    c.rect(0, 42, 600, 148, fill=(14, 14, 14)); c.line([(0, 42), (600, 42)], GOLD_LO, 0.6); c.line([(0, 148), (600, 148)], GOLD_LO, 0.6)
    c.flower(92, 95, 42, P, (14, 14, 14))
    lux_name(c, 150, 86, size=16, brand=False)
    lux_logo(c, 150, 128)
    lux_contacts(c, 350, 68, 240, address=True, gapy=20)
    return c

def lux3(P):
    c = Canvas(190, NEGRU)
    c.mandala(62, 95, 132, "filled", NEGRU, rot=math.pi / 20)
    c.flower(252, 95, 44, P, NEGRU)
    lux_name(c, 312, 72, size=18)
    lux_contacts(c, 312, 124, 280, address=False, gapy=16, size=9.5)
    c.text(312, 172, ADR1 + ", " + ADR2, MONT_R(8), (190, 178, 145))
    return c

def lux4(P):
    c = Canvas(190, GRI_INCHIS)
    faint = lerp(GRI_INCHIS, GOLD, 0.30)
    c.mandala(470, 95, 150, "outline", GRI_INCHIS, faint=faint)
    c.mandala(600, 200, 90, "outline", GRI_INCHIS, faint=lerp(GRI_INCHIS, GOLD, 0.18))
    lux_name(c, 40, 92, size=16)
    lux_contacts(c, 220, 66, 200, address=True, gapy=22)
    return c

def lux5(P):
    c = Canvas(190, PRUNA); c.hgrad(PRUNA2, PRUNA)
    faint = lerp(PRUNA, GOLD, 0.34)
    c.mandala(30, 95, 110, "outline", PRUNA, faint=faint); c.mandala(575, 95, 110, "outline", PRUNA, faint=faint)
    lux_name(c, 108, 84, size=16)
    c.flower(304, 95, 43, P, PRUNA)
    lux_contacts(c, 372, 68, 200, address=True, gapy=22)
    return c

def lux6(P):
    c = Canvas(190, NEGRU_L)
    faint = lerp(NEGRU_L, GOLD, 0.26)
    c.mandala(520, 100, 128, "outline", NEGRU_L, faint=faint)
    lux_name(c, 40, 76, size=16, brand=False)
    lux_logo(c, 40, 128)
    c.leaf_frame(300, 95, 44, P)
    lux_contacts(c, 378, 68, 200, address=True, gapy=22)
    return c

def lux7(P):
    c = Canvas(190, NEGRU)
    for cx in (40, 200, 360, 520):
        c.mandala(cx, -40, 92, "filled", NEGRU, rot=math.pi / 40); c.mandala(cx, 230, 92, "filled", NEGRU, rot=math.pi / 40)
    for cx in (120, 280, 440):
        mand.recipe_mini(mand.Mandala(c.d, cx, 22, 12, NEGRU)); mand.recipe_mini(mand.Mandala(c.d, cx, 168, 12, NEGRU))
    c.rect(0, 50, 600, 140, fill=NEGRU)
    c.flower(92, 95, 40, P, NEGRU)
    lux_name(c, 150, 84, size=16, brand=False)
    lux_logo(c, 150, 124)
    lux_contacts(c, 350, 64, 240, address=True, gapy=20)
    return c

def lux8(P):
    c = Canvas(190, NEGRU)
    c.mandala(30, 95, 126, "filled", NEGRU, rot=math.pi / 20)
    c.mandala(560, 95, 120, "outline", NEGRU, faint=lerp(NEGRU, GOLD, 0.24))
    c.flower(218, 95, 44, P, NEGRU)
    lux_name(c, 280, 86, size=15, ls=2)
    lux_contacts(c, 432, 60, 168, address=True, gapy=21, size=9.5)
    return c

def lux9(P):
    c = Canvas(190, PRUNA); c.hgrad(PRUNA, PRUNA2)
    faint = lerp(PRUNA, GOLD, 0.34)
    c.mandala(50, 95, 120, "outline", PRUNA, faint=faint); c.mandala(590, 95, 120, "outline", PRUNA, faint=faint)
    lux_name(c, 190, 78, size=18)
    f = MONT_R(9)
    c.text(190, 132, TEL + "   " + MAIL + "   " + WEB, f, (214, 200, 160))
    c.text(190, 148, ADR1 + ", " + ADR2, MONT_R(8), (170, 160, 130))
    c.flower(480, 95, 44, P, PRUNA)
    return c

# ---- Rose ----------------------------------------------------------------------
ROSE, ROSE_TXT, GRI, GRI2, ALB = (200, 150, 138), (192, 130, 118), (78, 78, 78), (110, 110, 110), (255, 255, 255)
def rose(P):
    c = Canvas(262, ALB)
    c.rect(0, 0, 600, 262, outline=(232, 224, 220), width=1)
    c.paste_photo(P, (36, 32, 186, 182), shape="round", r=6)
    c.rect(36, 196, 186, 224, fill=ROSE, r=14)
    c.icon("chat", 62, 202, 15, ALB); c.text(84, 214, "Contactează-mă", DEJA_B(10.5), ALB)
    c.rect(204, 32, 207, 226, fill=ROSE)
    c.text(222, 58, NUME, DEJA_B(23), ROSE_TXT)
    c.text(222, 78, TITLU, DEJA_B(12), GRI)
    fl, fv = DEJA_R(12.5), DEJA_R(12.5)
    y = 108
    for lab, val in (("Telefon:", TEL), ("Website", WEB), ("E-mail:", MAIL)):
        w = c.text(222, y, lab, fl, ROSE_TXT); c.text(222 + w + 6, y, val, fv, GRI); y += 21
    c.text(222, y, "Adresă:", fl, ROSE_TXT); c.text(222 + c.tw("Adresă:", fl) + 6, y, ADR1 + ",", fv, GRI); c.text(222, y + 16, ADR2, fv, GRI)
    y += 44
    c.text(222, y, BRAND + ":", DEJA_B(11), GRI)
    for i, k in enumerate(("phone", "mail", "globe")):
        x = 222 + i * 32; c.rect(x, y + 8, x + 24, y + 32, fill=ROSE, r=4); c.icon(k, x + 5, y + 13, 14, ALB)
    c.text(330, y + 25, TAGLINE, DEJA_R(10), GRI2)
    return c

# ---- Noir (Emma Johnson) --------------------------------------------------------
NB, NW, NG, NG2 = (0, 0, 0), (255, 255, 255), (165, 165, 165), (215, 215, 215)
def noir_left(c, x, y, name_size=21, socials=True, address=True):
    c.text(x, y, NUME.upper(), JOS_R(name_size), NW, ls=2.5)
    c.text(x, y + 20, TITLU.upper(), JOS_L(9), NG, ls=2.5)
    f = JOS_L(9.5); yy = y + 52
    for val in (MAIL, TEL, WEB): c.text(x, yy, val, f, NG2); yy += 14
    if address: c.text(x, yy, ADR1 + ", " + ADR2, JOS_L(8), NG); yy += 14
    if socials:
        yy += 12
        for i, k in enumerate(("phone", "mail", "globe")):
            cx = x + 8 + i * 24; c.circle(cx, yy, 8, outline=NW, width=0.9); c.icon(k, cx - 5, yy - 5, 10, NW)
        c.text(x + 80, yy + 3, BRAND.lower(), JOS_L(9), NG)
    return yy

def noir_logo(c, cx, cy, r=40, fill=None):
    c.circle(cx, cy, r, outline=NW, width=1.2); c.circle(cx, cy, r - 4, outline=NW, width=0.6)
    c.ring_text(cx, cy, r - 11, "MENTENANȚĂ ECHIPAMENTE IT", JOS_R(5.5), NW, start=-180, spread=180)
    c.text(cx, cy - 2, BRAND, JOS_R(7.5), NW, ls=1, anchor="ms")
    c.text(cx, cy + 16, "IT", ALLURA(22), NW, anchor="ms")

def noir1(P):
    c = Canvas(170, NB)
    c.paste_photo(P, (300, 0, 600, 170), face=(0.5, 0.45))
    noir_left(c, 40, 46)
    return c

def noir2(P):
    c = Canvas(200, NB)
    c.paste_photo(P, (300, 0, 420, 170), face=(0.5, 0.4))
    c.rotated_text(437, 85, NUME, SCRIPT(22), NW)
    noir_logo(c, 522, 85)
    noir_left(c, 40, 46, socials=False)
    c.rect(0, 170, 600, 200, fill=(128, 128, 128))
    f = JOS_R(8.5)
    for i, (k, val) in enumerate((("globe", WEB), ("phone", TEL), ("mail", MAIL))):
        x = 40 + i * 195; c.circle(x + 7, 185, 7, outline=NW, width=0.8); c.icon(k, x + 3, 181, 8, NW); c.text(x + 22, 188, val, f, NW)
    return c

def noir3(P):
    c = Canvas(170, NB)
    c.paste_photo(P, (300, 0, 420, 170), face=(0.5, 0.4))
    c.rotated_text(437, 85, NUME, SCRIPT(22), NW)
    noir_logo(c, 522, 85)
    noir_left(c, 40, 40, address=False)
    return c

# ---- Mono (Jessica Roche) -----------------------------------------------------
MB, MW, MG = (22, 22, 22), (255, 255, 255), (200, 200, 200)
def mono_left(c, x, y, brokerage=False, socials=True):
    c.text(x, y, TITLU.upper(), MONT_L(7), MW, ls=2.5)
    c.text(x, y + 22, NUME.upper(), CORM(24), MW, ls=1.5)
    f = MONT_L(9); yy = y + 44
    for val in (TEL, MAIL, WEB): c.text(x, yy, val, f, MW); yy += 13
    c.text(x, yy, ADR1 + ", " + ADR2, MONT_L(7.5), MG); yy += 13
    if brokerage: yy += 6; c.text(x, yy, BRAND + " · " + TAGLINE.upper(), MONT_M(7.5), MW, ls=1); yy += 13
    if socials:
        yy += 10
        for i, k in enumerate(("phone", "mail", "globe")):
            cx = x + 7 + i * 20; c.circle(cx, yy, 7, outline=MW, width=0.8); c.icon(k, cx - 4.5, yy - 4.5, 9, MW)
        c.text(x + 70, yy + 3, "@" + BRAND.lower(), MONT_L(8.5), MW)
    return yy

def mono_logo(c, cx, cy, r=38, ink=MB, paper=MW, filled=True):
    if filled: c.circle(cx, cy, r, fill=paper)
    else: c.circle(cx, cy, r, outline=ink, width=1)
    c.text(cx, cy + 9, "IT", CORM(30), ink, anchor="ms")
    c.ring_text(cx, cy, r - 8, "ITISTUL.RO • MENTENANȚĂ ECHIPAMENTE IT •", MONT_R(4.6), ink, start=-90)

def mono1(P):
    c = Canvas(160, MB)
    c.paste_photo(P, (400, 0, 600, 160), face=(0.5, 0.42))
    mono_logo(c, 330, 80)
    mono_left(c, 40, 32)
    return c

def mono2(P):
    c = Canvas(175, MB)
    c.paste_photo(P, (330, 0, 500, 175), face=(0.5, 0.42))
    c.rotated_text(528, 87, NUME, SCRIPT(24), MW)
    mono_left(c, 40, 34, brokerage=True)
    return c

def mono3(P):
    c = Canvas(160, MB)
    c.rect(400, 0, 600, 160, fill=MW)
    c.paste_photo(P, (36, 32, 132, 128), shape="circle", zoom=1.1)
    mono_left(c, 156, 34)
    mono_logo(c, 500, 60, r=30, ink=MB, paper=MW, filled=False)
    c.text(500, 118, TAGLINE, ALLURA(17), MB, anchor="ms")
    c.text(500, 134, BRAND, MONT_M(7), MB, ls=2.5, anchor="ms")
    return c

# ---- Aur (Theo Wilton) ---------------------------------------------------------
AB = (20, 20, 20)
def aur(P):
    c = Canvas(190, AB)
    # rama-stadion aurie, cu capatul stang in jurul fotografiei
    c.rect(118, 36, 512, 154, outline=GOLD, width=1.8, r=59)
    c.rect(122, 40, 508, 150, outline=GOLD_LO, width=0.8, r=55)
    c.circle(120, 95, 60, fill=AB)
    c.circle(120, 95, 56, outline=GOLD_HI, width=2.2); c.circle(120, 95, 50, outline=GOLD_LO, width=0.8)
    c.paste_photo(P, (72, 47, 168, 143), shape="circle", zoom=1.1)
    # curba aurie din dreapta, sectiunea firmei
    c.d.arc([c.p(430, -60)[0], c.p(430, -60)[1], c.p(700, 250)[0], c.p(700, 250)[1]], 120, 240, fill=GOLD, width=int(1.4 * S))
    w = c.text(192, 90, "MIHAI ", MONT_B(19), NW, ls=1); c.text(192 + w, 90, "ZAMFIR", MONT_B(19), GOLD_TXT, ls=1)
    c.text(192 + c.tw("MIHAI ZAMFIR", MONT_B(19), 1) / 2, 108, TITLU, MONT_R(10), (225, 225, 225), anchor="ms")
    c.rect(342, 56, 354, 134, fill=GOLD, r=6)
    for i, k in enumerate(("phone", "mail", "home")): c.icon(k, 343.5, 61 + i * 27, 9, AB)
    f = MONT_R(9)
    c.text(366, 69, TEL, f, NW); c.text(366, 96, MAIL, f, NW)
    for i, ln in enumerate(c.wrap(ADR1 + ", " + ADR2, MONT_R(8.5), 96)): c.text(366, 118 + i * 11, ln, MONT_R(8.5), NW)
    # sigla firmei: doua inele aurii
    c.circle(521, 62, 9, outline=GOLD, width=2.2); c.circle(535, 62, 9, outline=GOLD_HI, width=2.2)
    c.text(528, 92, BRAND, MONT_B(10.5), NW, anchor="ms"); c.text(528, 103, TAGLINE, MONT_R(6.5), GOLD_TXT, anchor="ms")
    for i, k in enumerate(("phone", "mail", "globe")):
        cx = 508 + i * 20; c.circle(cx, 120, 7, outline=GOLD, width=0.9); c.icon(k, cx - 4.5, 115.5, 9, GOLD)
    return c

DESIGNS = [("lux-1", lux1, "jpg"), ("lux-2", lux2, "jpg"), ("lux-3", lux3, "jpg"), ("lux-4", lux4, "png"), ("lux-5", lux5, "jpg"),
           ("lux-6", lux6, "png"), ("lux-7", lux7, "jpg"), ("lux-8", lux8, "jpg"), ("lux-9", lux9, "jpg"), ("rose", rose, "png"),
           ("noir-1", noir1, "png"), ("noir-2", noir2, "png"), ("noir-3", noir3, "png"), ("mono-1", mono1, "png"),
           ("mono-2", mono2, "png"), ("mono-3", mono3, "png"), ("aur", aur, "png")]

if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("--foto"); ap.add_argument("--fisa"); a = ap.parse_args()
    P = Image.open(a.foto).convert("RGB") if a.foto else None
    os.makedirs(OUT, exist_ok=True)
    outs = []
    for slug, fn, ext in DESIGNS:
        if P is not None and ext == "png": ext = "jpg"          # cu fotografie, paleta de 256 nu ajunge
        c = fn(P); path = os.path.join(OUT, f"{slug}.{ext}")
        im = c.out(path, P is not None); outs.append((slug, im, os.path.getsize(path), c.h))
        print(f"{slug:8s} {c.w}x{c.h} -> {im.size[0]}x{im.size[1]} {ext} {os.path.getsize(path):7d} B")
    if a.fisa:
        Wf = max(o[1].width for o in outs) // 2 + 40; Hf = sum(o[1].height // 2 + 34 for o in outs) + 20
        sheet = Image.new("RGB", (Wf, Hf), (235, 238, 242)); dd = ImageDraw.Draw(sheet); y = 10
        for slug, im, n, h in outs:
            dd.text((20, y), f"{slug}  {im.width}x{im.height}  {n} B", fill=(60, 60, 60)); y += 16
            sheet.paste(im.resize((im.width // 2, im.height // 2), Image.LANCZOS), (20, y)); y += im.height // 2 + 18
        sheet.save(a.fisa)
