# -*- coding: utf-8 -*-
"""Ornamente mandala aurii, generate procedural, coapte pe fundalul exact al
celulei care le va contine (fara transparenta => fara surprize in Word)."""
import math, os
from PIL import Image, ImageDraw

SS = 4                                   # supersampling pentru antialiasing
NEGRU, PRUNA = (17, 17, 17), (27, 20, 36)
GOLD_HI, GOLD, GOLD_LO = (238, 218, 160), (201, 169, 97), (128, 100, 44)

def lerp(a, b, t): return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))

class Mandala:
    def __init__(self, draw, cx, cy, R, bg, faint=None, light=-70):
        self.d, self.cx, self.cy, self.R, self.bg = draw, cx * SS, cy * SS, R * SS, bg
        self.faint, self.light = faint, math.radians(light)
    def gold(self, ang, depth=0.0):
        """Ton metalic: variaza cu unghiul (lumina din dreapta-sus) si cu adancimea."""
        if self.faint: return self.faint
        f = 0.5 + 0.5 * math.cos(ang - self.light)
        c = lerp(GOLD_LO, GOLD_HI, f ** 1.4)
        return lerp(c, GOLD_LO, depth)
    def pt(self, r, ang): return (self.cx + r * math.cos(ang), self.cy + r * math.sin(ang))
    def ring(self, rf, w, depth=0.0, segs=96):
        r, ww = rf * self.R, max(1, w * self.R)
        for i in range(segs):
            a0, a1 = 2 * math.pi * i / segs, 2 * math.pi * (i + 1) / segs
            self.d.line([self.pt(r, a0), self.pt(r, a1 + 0.01)], fill=self.gold((a0 + a1) / 2, depth), width=int(ww))
    def dots(self, rf, n, radf, rot=0.0, depth=0.0):
        r, rad = rf * self.R, radf * self.R
        for i in range(n):
            a = 2 * math.pi * i / n + rot
            x, y = self.pt(r, a)
            self.d.ellipse([x - rad, y - rad, x + rad, y + rad], fill=self.gold(a, depth))
    def petal_poly(self, r0f, r1f, ang, wf, pointed_in=0.55):
        r0, r1 = r0f * self.R, r1f * self.R
        W = wf * self.R
        pts_a, pts_b = [], []
        for k in range(25):
            t = k / 24
            r = r0 + (r1 - r0) * t
            w = W * math.sin(math.pi * t) ** pointed_in
            ca, sa = math.cos(ang), math.sin(ang)
            x, y = self.cx + r * ca, self.cy + r * sa
            pts_a.append((x - w * sa, y + w * ca)); pts_b.append((x + w * sa, y - w * ca))
        return pts_a + pts_b[::-1]
    def petals(self, r0f, r1f, n, wf, rot=0.0, fill=True, vein=True, depth=0.0, width=1.0):
        for i in range(n):
            a = 2 * math.pi * i / n + rot
            poly = self.petal_poly(r0f, r1f, a, wf)
            if fill and not self.faint:
                self.d.polygon(poly, fill=self.gold(a, depth))
                if vein:   # petala interioara mai inchisa: adancime, ca in referinte
                    inner = self.petal_poly(r0f + (r1f - r0f) * 0.14, r1f - (r1f - r0f) * 0.12, a, wf * 0.5)
                    self.d.polygon(inner, fill=self.gold(a, min(1, depth + 0.55)))
                    tip = self.petal_poly(r0f + (r1f - r0f) * 0.30, r1f - (r1f - r0f) * 0.28, a, wf * 0.2)
                    self.d.polygon(tip, fill=self.gold(a, depth))
            else:
                self.d.line(poly + [poly[0]], fill=self.gold(a, depth), width=max(1, int(width * SS)), joint="curve")
    def spikes(self, r0f, r1f, n, wf, rot=0.0, depth=0.0):
        r0, r1, W = r0f * self.R, r1f * self.R, wf * self.R
        for i in range(n):
            a = 2 * math.pi * i / n + rot
            ca, sa = math.cos(a), math.sin(a)
            bx, by = self.cx + r0 * ca, self.cy + r0 * sa
            tip = self.pt(r1, a)
            poly = [(bx - W * sa, by + W * ca), tip, (bx + W * sa, by - W * ca)]
            if self.faint: self.d.line(poly + [poly[0]], fill=self.faint, width=SS)
            else: self.d.polygon(poly, fill=self.gold(a, depth))
    def lace(self, rf, n, radf, rot=0.0, depth=0.0):
        r, rad = rf * self.R, radf * self.R
        for i in range(n):
            a = 2 * math.pi * i / n + rot
            x, y = self.pt(r, a)
            self.d.ellipse([x - rad, y - rad, x + rad, y + rad], outline=self.gold(a, depth), width=max(1, int(0.9 * SS)))
    def disc(self, rf, depth=0.0):
        r = rf * self.R
        self.d.ellipse([self.cx - r, self.cy - r, self.cx + r, self.cy + r], fill=self.gold(self.light, depth))

def recipe_filled(m, rot=0.0):
    h = math.pi / 24
    m.ring(1.00, 0.012)
    m.lace(0.968, 48, 0.022, rot=rot, depth=0.15)          # dantela: cerculete goale
    m.dots(0.935, 48, 0.009, rot=rot + math.pi / 48)
    m.ring(0.905, 0.007, depth=0.2)
    m.spikes(0.60, 0.86, 24, 0.010, rot=rot, depth=0.45)   # spini fini intre petale
    m.petals(0.58, 0.885, 24, 0.052, rot=rot + h)
    m.dots(0.895, 24, 0.011, rot=rot, depth=0.05)
    m.ring(0.565, 0.010); m.ring(0.54, 0.005, depth=0.3)
    m.petals(0.30, 0.525, 12, 0.095, rot=rot, depth=0.05)
    m.dots(0.535, 12, 0.014, rot=rot + math.pi / 12, depth=0.1)
    m.petals(0.20, 0.36, 12, 0.036, rot=rot + math.pi / 12, depth=0.25, vein=False)
    m.ring(0.19, 0.008, depth=0.2)
    m.spikes(0.11, 0.18, 24, 0.018, rot=rot)
    m.disc(0.105, depth=0.4); m.ring(0.105, 0.007); m.dots(0.07, 8, 0.012, rot=rot, depth=0.1)
    m.disc(0.035)

def recipe_mini(m, rot=0.0):
    m.ring(1.0, 0.06); m.dots(0.78, 8, 0.11, rot=rot, depth=0.1)
    m.spikes(0.28, 0.62, 8, 0.10, rot=rot + math.pi / 8, depth=0.3); m.disc(0.3, depth=0.2); m.disc(0.14)

def recipe_outline(m, rot=0.0):
    h = math.pi / 20
    m.ring(1.00, 0.006); m.lace(0.965, 48, 0.022, rot=rot); m.ring(0.93, 0.004)
    m.petals(0.56, 0.90, 24, 0.052, rot=rot + h, fill=False, width=0.9)
    m.dots(0.935, 20, 0.010, rot=rot)
    m.ring(0.545, 0.005)
    m.petals(0.26, 0.52, 10, 0.11, rot=rot, fill=False, width=0.9)
    m.petals(0.30, 0.46, 10, 0.05, rot=rot, fill=False, width=0.7)
    m.ring(0.25, 0.004)
    m.spikes(0.13, 0.23, 16, 0.028, rot=rot)
    m.ring(0.12, 0.004); m.dots(0.0, 1, 0.03)

def canvas(w, h, bg): 
    im = Image.new("RGB", (w * SS, h * SS), bg); return im, ImageDraw.Draw(im)
def finish(im, w, h, path, colors=48):
    out = im.resize((w, h), Image.LANCZOS).quantize(colors=colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    out.save(path, optimize=True); return os.path.getsize(path)

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets", "lux")
os.makedirs(OUT, exist_ok=True)
sizes = {}

# 1. L1: jumatate de mandala pe marginea stanga + panou usor mai deschis, delimitat de o curba aurie
w, h = 200, 190
im, d = canvas(w, h, NEGRU)
curve = [(150 * SS + 32 * SS * math.sin(math.pi * t), t * h * SS) for t in [k / 60 for k in range(61)]]
d.polygon([(0, 0)] + curve + [(0, h * SS)], fill=(24, 24, 24))
d.line(curve, fill=GOLD, width=int(1.4 * SS), joint="curve")
recipe_filled(Mandala(d, 4, 95, 92, NEGRU))
sizes["lux-stanga.png"] = finish(im, w, h, os.path.join(OUT, "lux-stanga.png"))

# 2. L2/L7: benzi ornamentale sus/jos (mandale taiate de marginea imaginii)
w, h = 600, 44
im, d = canvas(w, h, NEGRU)
for cx in (40, 200, 360, 520): recipe_filled(Mandala(d, cx, -46, 88, NEGRU), rot=math.pi / 40)
for cx in (120, 280, 440): recipe_mini(Mandala(d, cx, 16, 11, NEGRU))
top = im.resize((w, h), Image.LANCZOS)
sizes["lux-banda-sus.png"] = finish(im, w, h, os.path.join(OUT, "lux-banda-sus.png"))
bot = top.transpose(Image.FLIP_TOP_BOTTOM).quantize(colors=48, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
bot.save(os.path.join(OUT, "lux-banda-jos.png"), optimize=True); sizes["lux-banda-jos.png"] = os.path.getsize(os.path.join(OUT, "lux-banda-jos.png"))

# 3. L3/L8: mandala mare, plina, in stanga (trei sferturi vizibila)
w, h = 250, 190
im, d = canvas(w, h, NEGRU)
recipe_filled(Mandala(d, 62, 95, 132, NEGRU), rot=math.pi / 20)
sizes["lux-mare-stanga.png"] = finish(im, w, h, os.path.join(OUT, "lux-mare-stanga.png"))

# 3b. mandala mare decupata la 200 (Lux 8)
w, h = 200, 190
im, d = canvas(w, h, NEGRU)
recipe_filled(Mandala(d, 30, 95, 126, NEGRU), rot=math.pi / 20)
sizes["lux-mare-stanga-200.png"] = finish(im, w, h, os.path.join(OUT, "lux-mare-stanga-200.png"))

# 4. contururi discrete (negru si pruna), la latimile cerute de fiecare design
def contur(tag, bg, side, w, h=190):
    faint = lerp(bg, GOLD, 0.34 if tag == "negru" else 0.38)
    im, d = canvas(w, h, bg)
    cx = (w - 180) if side == "dreapta" else 40
    recipe_outline(Mandala(d, cx, 95, 118, bg, faint=faint), rot=0.0)
    cx2 = cx + (150 if side == "stanga" else -150)
    recipe_outline(Mandala(d, cx2, 175, 58, bg, faint=lerp(bg, GOLD, 0.22)), rot=math.pi / 24)
    name = f"lux-contur-{tag}-{side}-{w}.png"
    sizes[name] = finish(im, w, h, os.path.join(OUT, name), colors=16)
contur("negru", NEGRU, "dreapta", 220)   # Lux 4
contur("negru", NEGRU, "dreapta", 128)   # Lux 6
contur("pruna", PRUNA, "stanga", 80)     # Lux 5
contur("pruna", PRUNA, "dreapta", 80)    # Lux 5
contur("pruna", PRUNA, "stanga", 120)    # Lux 9
contur("pruna", PRUNA, "dreapta", 140)   # Lux 9

# fisa de contact
files = sorted(sizes)
ims = [Image.open(os.path.join(OUT, f)).convert("RGB") for f in files]
W = max(i.width for i in ims) + 40; H = sum(i.height + 34 for i in ims) + 20
sheet = Image.new("RGB", (W, H), (60, 60, 60)); dd = ImageDraw.Draw(sheet); y = 10
for f, i in zip(files, ims):
    dd.text((20, y), f"{f}  {i.width}x{i.height}  {sizes[f]} B", fill=(255, 255, 255)); y += 18
    sheet.paste(i, (20, y)); y += i.height + 16
sheet.save(os.path.join(os.path.dirname(os.path.abspath(__file__)), "documentatie", "fisa-mandale.png"))
for f in files: print(f"{f:34s} {sizes[f]:6d} B")
