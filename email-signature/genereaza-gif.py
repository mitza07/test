# -*- coding: utf-8 -*-
"""Banda animata "signal" pentru semnatura ITISTUL.RO.

Fundalul GIF-ului este EXACT navy-ul celulei care il contine, ca la imagini
blocate sa nu ramana o gaura vizibila, ci doar bleed navy.
Primul cadru este desenat sa arate complet, pentru ca Outlook Classic
deseneaza numai cadrul 1.
"""
from PIL import Image, ImageDraw
import os, sys

W, H = 508, 28
NAVY  = (10, 22, 40)      # #0a1628 - identic cu bgcolor-ul celulei
TRACK = (28, 51, 80)      # #1c3350
NODE  = (42, 74, 107)     # #2a4a6b
MID   = (13, 132, 216)    # #0d84d8
HOT   = (121, 214, 255)   # #79d6ff
PAL   = [NAVY, TRACK, NODE, MID, HOT]

MIDY   = H // 2
WRAP   = 560              # 508 + 52 de coada, ca bucla sa fie perfecta
FRAMES = 56               # 560/56 = 10 px/cadru pentru pachetele lente

# (start, pasi_pe_cadru, lungime, grosime)
PACKETS = [(  0, 10, 46, 3),
           (190, 20, 34, 3),
           (330, 10, 46, 3),
           (455, 20, 26, 2)]

NODES = [40, 118, 196, 274, 352, 430]   # marcaje statice pe traseu

def draw(f):
    im = Image.new("P", (W, H), 0)
    im.putpalette([c for rgb in PAL for c in rgb] + [0] * (256 * 3 - len(PAL) * 3))
    d = ImageDraw.Draw(im)

    # traseul continuu - prezent in fiecare cadru, deci banda arata "construita"
    d.rectangle([0, MIDY, W - 1, MIDY], fill=1)
    # marcaje verticale, ca niste porturi pe traseu
    for x in NODES:
        d.rectangle([x, MIDY - 4, x, MIDY + 4], fill=2)
        d.rectangle([x - 1, MIDY - 1, x + 1, MIDY + 1], fill=2)

    for start, step, length, thick in PACKETS:
        x = (start + f * step) % WRAP - 52          # intra din stanga, iese in dreapta
        t = thick // 2
        # coada mai stinsa
        d.rectangle([x, MIDY - t, x + length, MIDY + t], fill=3)
        # capul aprins
        d.rectangle([x + length - 12, MIDY - t, x + length, MIDY + t], fill=4)
        # halou vertical in dreptul capului

    return im

frames = [draw(f) for f in range(FRAMES)]
out = sys.argv[1] if len(sys.argv) > 1 else "itistul-signal.gif"
frames[0].save(out, save_all=True, append_images=frames[1:], duration=70,
               loop=0, optimize=True, disposal=1)
print("%s  %d cadre  %dx%d  %d octeti" % (out, FRAMES, W, H, os.path.getsize(out)))
frames[0].convert("RGB").resize((W * 2, H * 2), Image.NEAREST).save("frame1.png")
