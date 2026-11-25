#!/usr/bin/env python3
"""Farbverlauf je Animation für das Hue-Licht: alle 0,5 s die zwei Hauptfarben (Spot 1 / Spot 2).
Aufruf: python3 werkzeuge/farben.py  → medien/animationen/farben.json"""
import json, subprocess, colorsys, os, glob
D = os.path.join(os.path.dirname(__file__), '..', 'medien', 'animationen')
W, H = 36, 64
def frames(f):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-vf', f'fps=2,scale={W}:{H}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True).stdout
    n = W * H * 3
    return [raw[i:i + n] for i in range(0, len(raw) - n + 1, n)]
def hexf(r, g, b):
    m = max(r, g, b) or 1
    return '#%02x%02x%02x' % tuple(int(255 * c / m) for c in (r, g, b))
def hauptfarben(fr):
    bins = [[0, 0, 0, 0] for _ in range(24)]  # gewicht, r, g, b
    hell = 0
    for i in range(0, len(fr), 3):
        r, g, b = fr[i], fr[i + 1], fr[i + 2]
        h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
        if v < 0.25: continue
        hell += v
        if s < 0.3: continue
        w = s * v; k = int(h * 24) % 24
        bins[k][0] += w; bins[k][1] += r * w; bins[k][2] += g * w; bins[k][3] += b * w
    ges = sum(x[0] for x in bins)
    if ges < 3:
        return ['#ffe6c4', '#ffe6c4'] if hell > 40 else None
    ord_ = sorted(range(24), key=lambda k: -bins[k][0])
    a = ord_[0]
    b = next((k for k in ord_[1:] if min((k - a) % 24, (a - k) % 24) >= 3 and bins[k][0] > ges * 0.08), a)
    f = lambda k: hexf(bins[k][1] / bins[k][0], bins[k][2] / bins[k][0], bins[k][3] / bins[k][0])
    return [f(a), f(b)]
aus = {}
for f in sorted(glob.glob(os.path.join(D, '*.mp4'))):
    n = os.path.basename(f)[:-4]
    if n.endswith('-quer'): continue
    aus[n] = [hauptfarben(fr) for fr in frames(f)]
json.dump(aus, open(os.path.join(D, 'farben.json'), 'w'), separators=(',', ':'))
print(len(aus), 'Animationen')
