# -*- coding: utf-8 -*-
"""Banda animata pentru designul clasic ITISTUL.RO.

Fundalul este exact #f8fbfd, culoarea celulei care o contine, ca la imagini
lipsa sa nu ramana o gaura. Cadrul 1 este desenat sa arate complet.
"""
from PIL import Image, ImageDraw
import os, sys

W, H = 638, 26
BG    = (248, 251, 253)   # #f8fbfd - identic cu bgcolor-ul celulei
TRACK = (214, 227, 238)   # #d6e3ee
NODE  = (169, 189, 204)   # #a9bdcc
MID   = (13, 132, 216)    # #0d84d8
HOT   = (22, 138, 214)    # #168ad6
PAL   = [BG, TRACK, NODE, MID, HOT]

MIDY   = H // 2
WRAP   = 700
FRAMES = 50               # 700/50 = 14 px/cadru
PACKETS = [(  0, 14, 52, 3), (240, 28, 38, 3),
           (420, 14, 52, 3), (580, 28, 30, 2)]
NODES = [52, 150, 248, 346, 444, 542]

def draw(f):
    im = Image.new("P", (W, H), 0)
    im.putpalette([c for rgb in PAL for c in rgb] + [0] * (256 * 3 - len(PAL) * 3))
    d = ImageDraw.Draw(im)
    d.rectangle([0, MIDY, W - 1, MIDY], fill=1)
    for x in NODES:
        d.rectangle([x, MIDY - 4, x, MIDY + 4], fill=2)
        d.rectangle([x - 1, MIDY - 1, x + 1, MIDY + 1], fill=2)
    for start, step, length, thick in PACKETS:
        x = (start + f * step) % WRAP - 62
        t = thick // 2
        d.rectangle([x, MIDY - t, x + length, MIDY + t], fill=4)
        d.rectangle([x + length - 14, MIDY - t, x + length, MIDY + t], fill=3)
    return im

frames = [draw(f) for f in range(FRAMES)]
out = sys.argv[1] if len(sys.argv) > 1 else "itistul-pulse-clasic.gif"
frames[0].save(out, save_all=True, append_images=frames[1:], duration=70,
               loop=0, optimize=True, disposal=1)
print("%s  %d cadre  %dx%d  %d octeti" % (out, FRAMES, W, H, os.path.getsize(out)))
frames[0].convert("RGB").save("frame1_clasic.png")
