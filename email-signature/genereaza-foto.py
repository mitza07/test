# -*- coding: utf-8 -*-
"""Decupajele fotografiei pentru colectie, din portretul-sursa.

    python3 genereaza-foto.py <portret.jpg>

Scrie in assets/foto/ cate un fisier pentru fiecare loc din colectie, la 2x
fata de dimensiunea afisata (clar pe ecrane HiDPI; Outlook scaleaza dupa
width/height). JPEG baseline fara EXIF pentru fotografii; PNG copt pe fundalul
celulei pentru rama "floare" aurie din Lux (are colturi de fundal, nu de poza).

Centrul fetei: implicit (0.50, 0.42) din inaltime - un portret bust, fata sus.
"""
import math, os, sys
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance

BASE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(BASE, "assets", "foto")
GOLD_HI, GOLD, GOLD_LO = (238, 218, 160), (201, 169, 97), (128, 100, 44)
NEGRU, NEGRU2, PRUNA = (17, 17, 17), (24, 24, 24), (27, 20, 36)
FACE = (0.50, 0.42)      # centrul fetei, fractiuni din latime/inaltime
SS = 4

def lerp(a, b, t): return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))

def crop(src, w, h, zoom=1.0):
    """Decupaj cu raportul w:h centrat pe fata, apoi redimensionat la (w, h)."""
    W, H = src.size
    ratio = w / h
    cw, ch = (W, W / ratio) if W / H <= ratio else (H * ratio, H)
    cw, ch = cw / zoom, ch / zoom
    cx, cy = FACE[0] * W, FACE[1] * H
    x0 = min(max(cx - cw / 2, 0), W - cw); y0 = min(max(cy - ch / 2, 0), H - ch)
    return src.crop((int(x0), int(y0), int(x0 + cw), int(y0 + ch))).resize((w, h), Image.LANCZOS)

def contain(src, w, h, dark=0.6):
    """Poza intreaga (bust) in w x h; golurile se umplu din marginea ei oglindita si blurata."""
    Wp, Hp = src.size; sc = min(w / Wp, h / Hp); pw, ph = max(1, int(Wp * sc)), max(1, int(Hp * sc))
    fg = src.resize((pw, ph), Image.LANCZOS); out = Image.new("RGB", (w, h), (20, 20, 20))
    gx, gy = (w - pw) // 2, (h - ph) // 2; blur = ImageFilter.GaussianBlur(radius=max(6, min(w, h) // 30))
    if gx > 0:
        left = fg.crop((0, 0, min(gx, pw), ph)).transpose(Image.FLIP_LEFT_RIGHT).resize((gx, ph), Image.LANCZOS)
        right = fg.crop((max(0, pw - gx), 0, pw, ph)).transpose(Image.FLIP_LEFT_RIGHT).resize((w - pw - gx, ph), Image.LANCZOS)
        for im_, x in ((left, 0), (right, gx + pw)): out.paste(ImageEnhance.Brightness(im_.filter(blur)).enhance(dark), (x, gy))
    if gy > 0:
        top = fg.crop((0, 0, pw, min(gy, ph))).transpose(Image.FLIP_TOP_BOTTOM).resize((pw, gy), Image.LANCZOS)
        bot = fg.crop((0, max(0, ph - gy), pw, ph)).transpose(Image.FLIP_TOP_BOTTOM).resize((pw, h - ph - gy), Image.LANCZOS)
        for im_, y in ((top, 0), (bot, gy + ph)): out.paste(ImageEnhance.Brightness(im_.filter(blur)).enhance(dark), (gx, y))
    out.paste(fg, (gx, gy)); return out

def jpeg(im, name, q=84):
    p = os.path.join(OUT, name); im.convert("RGB").save(p, "JPEG", quality=q, optimize=True, progressive=False)
    return os.path.getsize(p)

def floare(src, size, bg, name):
    """Rama 'floare': petale aurii in jurul unui decupaj circular, pe fundalul celulei."""
    S = size * SS
    im = Image.new("RGB", (S, S), bg); d = ImageDraw.Draw(im)
    cx = cy = S / 2; R = S * 0.5
    def gold(ang, depth=0.0):
        f = 0.5 + 0.5 * math.cos(ang - math.radians(-70))
        return lerp(lerp(GOLD_LO, GOLD_HI, f ** 1.4), GOLD_LO, depth)
    def petal(r0, r1, ang, W):
        pa, pb = [], []
        for k in range(25):
            t = k / 24; r = r0 + (r1 - r0) * t; w = W * math.sin(math.pi * t) ** 0.55
            ca, sa = math.cos(ang), math.sin(ang); x, y = cx + r * ca, cy + r * sa
            pa.append((x - w * sa, y + w * ca)); pb.append((x + w * sa, y - w * ca))
        return pa + pb[::-1]
    n = 14
    for i in range(n):          # petale exterioare, apoi un rand interior decalat
        a = 2 * math.pi * i / n
        d.polygon(petal(R * 0.52, R * 0.99, a, R * 0.11), fill=gold(a))
        d.polygon(petal(R * 0.60, R * 0.90, a, R * 0.045), fill=gold(a, 0.5))
    for i in range(n):
        a = 2 * math.pi * (i + 0.5) / n
        d.polygon(petal(R * 0.56, R * 0.86, a, R * 0.07), fill=gold(a, 0.2))
    rr = R * 0.70               # discul fotografiei
    photo = crop(src, int(2 * rr), int(2 * rr), zoom=1.15).convert("RGB")
    mask = Image.new("L", photo.size, 0); ImageDraw.Draw(mask).ellipse([0, 0, photo.size[0] - 1, photo.size[1] - 1], fill=255)
    im.paste(photo, (int(cx - rr), int(cy - rr)), mask)
    d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], outline=GOLD_HI, width=int(1.6 * SS))
    d.ellipse([cx - rr * 0.965, cy - rr * 0.965, cx + rr * 0.965, cy + rr * 0.965], outline=GOLD_LO, width=int(0.8 * SS))
    out = im.resize((size, size), Image.LANCZOS)
    p = os.path.join(OUT, name); out.save(p, optimize=True); return os.path.getsize(p)

if __name__ == "__main__":
    src = Image.open(sys.argv[1]).convert("RGB")
    os.makedirs(OUT, exist_ok=True)
    sizes = {}
    sizes["foto-lux-negru.png"] = floare(src, 160, NEGRU, "foto-lux-negru.png")   # Lux 1-4, 6-8: medalion 80
    sizes["foto-lux-negru2.png"] = floare(src, 160, NEGRU2, "foto-lux-negru2.png")  # Lux 2: banda din mijloc e #181818
    sizes["foto-lux-pruna.png"] = floare(src, 160, PRUNA, "foto-lux-pruna.png")   # Lux 5, 9
    sizes["foto-aur.jpg"]    = jpeg(crop(src, 144, 144, 1.1), "foto-aur.jpg")     # Aur: nucleu 72
    sizes["foto-rose.jpg"]   = jpeg(crop(src, 280, 280), "foto-rose.jpg")         # Rose: nucleu 140
    sizes["foto-noir-1.jpg"] = jpeg(contain(src, 600, 360), "foto-noir-1.jpg")    # Noir 1: panou 300x180, bust
    sizes["foto-noir-2.jpg"] = jpeg(crop(src, 240, 300), "foto-noir-2.jpg")       # Noir 2-3: panou 120x150
    sizes["foto-mono-1.jpg"] = jpeg(contain(src, 440, 352), "foto-mono-1.jpg")    # Mono 1: panou 220x176, bust
    sizes["foto-mono-2.jpg"] = jpeg(contain(src, 400, 352), "foto-mono-2.jpg")    # Mono 2: panou 200x176, bust
    sizes["foto-mono-3.jpg"] = jpeg(crop(src, 116, 116, 1.1), "foto-mono-3.jpg")  # Mono 3: nucleu 58
    for k in sorted(sizes): print(f"{k:22s} {sizes[k]:6d} B")
    print("total", sum(sizes.values()), "B")
