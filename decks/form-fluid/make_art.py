"""Generate marbled-paint textures in pink / blue / white for the form-fluid deck.

Usage: python decks/form-fluid/make_art.py            (writes art/marble_*.jpg next to this file)
Needs: numpy, pillow

How it works: a stack of horizontal colour bands is pushed around by several
rounds of smooth domain warping (like combing paint on water), then pink
"tongues" are dragged downward and small white cells are dropped on top.
Each variant only changes the seed, the band order and the warp strength.
"""
import os

import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "art")

WHITE = (247, 247, 245)
PALE_B = (196, 210, 244)
BLUE = (140, 166, 232)
DEEP_B = (104, 132, 214)
PALE_P = (246, 196, 208)
PINK = (238, 128, 150)


def value_noise(h, w, cell, rng):
    gh, gw = h // cell + 3, w // cell + 3
    g = rng.random((gh, gw)).astype(np.float32)
    y = np.arange(h, dtype=np.float32) / cell
    x = np.arange(w, dtype=np.float32) / cell
    yi, xi = y.astype(int), x.astype(int)
    fy, fx = y - yi, x - xi
    fy = fy * fy * (3 - 2 * fy)
    fx = fx * fx * (3 - 2 * fx)
    a = g[yi][:, xi]
    b = g[yi][:, xi + 1]
    c = g[yi + 1][:, xi]
    d = g[yi + 1][:, xi + 1]
    top = a + (b - a) * fx[None, :]
    bot = c + (d - c) * fx[None, :]
    return top + (bot - top) * fy[:, None]


def fbm(h, w, cell, rng, octaves=4):
    out = np.zeros((h, w), np.float32)
    amp, tot = 1.0, 0.0
    for _ in range(octaves):
        out += amp * value_noise(h, w, max(cell, 2), rng)
        tot += amp
        amp *= 0.5
        cell //= 2
    return out / tot


def sample(img, yy, xx):
    h, w = img.shape[:2]
    yy = np.clip(yy, 0, h - 1).astype(int)
    xx = np.clip(xx, 0, w - 1).astype(int)
    return img[yy, xx]


def marble(w, h, seed, bands, warp=1.0, tongues=1.0, cells=1.0):
    rng = np.random.default_rng(seed)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)

    u, v = xx.copy(), yy.copy()

    # 1. vortices: rotate the field around a few centres (angle fades with distance)
    for _ in range(int(5 * warp) + 1):
        cx, cy = rng.uniform(0, w), rng.uniform(0, h)
        rad = rng.uniform(180, 420)
        ang = rng.uniform(1.2, 3.2) * rng.choice([-1, 1]) * warp
        dx, dy = u - cx, v - cy
        a = ang * np.exp(-(dx * dx + dy * dy) / (2 * rad * rad))
        ca, sa = np.cos(a), np.sin(a)
        u, v = cx + dx * ca - dy * sa, cy + dx * sa + dy * ca

    # 2. tongues: smooth rounded drags, like ink pulled down by a stylus
    for _ in range(int(9 * tongues)):
        cx = rng.uniform(0, w)
        sx = rng.uniform(22, 70)
        y0 = rng.uniform(0, h * 0.7)
        length = rng.uniform(160, 420)
        across = np.exp(-((xx - cx) / sx) ** 2)
        along = np.clip((yy - y0) / length, 0, 1)
        along = np.sin(along * np.pi / 2) * (yy > y0)
        v = v - across * along * length * 0.9

    # 3. gentle large-scale warp so bands never run perfectly straight
    for cell, amp in ((400, 120), (140, 22)):
        u = u + (fbm(h, w, cell, rng) - 0.5) * amp * 2
        v = v + (fbm(h, w, cell, rng) - 0.5) * amp * 2

    # 3. map warped height to bands with soft edges
    t = (v / h) * len(bands) * 0.9 + (fbm(h, w, 300, rng) - 0.5) * 0.6
    t = np.mod(t, len(bands))
    i0 = np.floor(t).astype(int) % len(bands)
    i1 = (i0 + 1) % len(bands)
    f = t - np.floor(t)
    f = np.clip((f - 0.78) / 0.22, 0, 1)  # mostly flat colour, thin blend at edges
    pal = np.array(bands, np.float32)
    img = pal[i0] * (1 - f[..., None]) + pal[i1] * f[..., None]

    # 4. thin white veins where the warp is strongest
    vein = np.abs(np.sin(u / 23.0 + v / 61.0))
    vein = np.clip((0.06 - vein) / 0.06, 0, 1) * (fbm(h, w, 160, rng) > 0.55)
    img = img * (1 - vein[..., None] * 0.65) + np.array(WHITE) * vein[..., None] * 0.65

    # 5. small cells (oil drops): pale rings with darker rim
    n = int(w * h / 9000 * cells)
    for _ in range(n):
        cx, cy = rng.integers(0, w), rng.integers(0, h)
        r = float(rng.choice([2, 3, 4, 6, 9, 14], p=[.3, .25, .2, .13, .08, .04]))
        x0, x1 = max(0, int(cx - r - 2)), min(w, int(cx + r + 3))
        y0, y1 = max(0, int(cy - r - 2)), min(h, int(cy + r + 3))
        if x1 <= x0 or y1 <= y0:
            continue
        d = np.hypot(xx[y0:y1, x0:x1] - cx, yy[y0:y1, x0:x1] - cy)
        inside = np.clip(r - d, 0, 1)
        rim = np.clip(1 - np.abs(d - r) / 1.2, 0, 1)
        patch = img[y0:y1, x0:x1]
        patch[:] = patch * (1 - inside[..., None] * .55) + np.array(WHITE) * inside[..., None] * .55
        patch[:] = patch * (1 - rim[..., None] * .18)

    im = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))
    im = im.filter(ImageFilter.GaussianBlur(0.8))
    # light paper grain
    g = (rng.normal(0, 4, (h, w, 1))).astype(np.float32)
    arr = np.clip(np.asarray(im, np.float32) + g, 0, 255).astype(np.uint8)
    return Image.fromarray(arr)


VARIANTS = {
    # name: (seed, bands, warp, tongues, cells)
    "marble_mix": (7, [WHITE, PALE_B, BLUE, PINK, PALE_P, BLUE, DEEP_B, PALE_B], 1.0, 1.0, 1.0),
    "marble_blue": (21, [WHITE, PALE_B, BLUE, PALE_B, DEEP_B, PALE_B, WHITE, PALE_P], 0.9, 0.4, 1.2),
    "marble_pink": (33, [PALE_P, WHITE, PINK, PALE_P, WHITE, PALE_B, PINK, PALE_P], 0.8, 0.3, 0.6),
}

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for name, (seed, bands, warp, tongues, cells) in VARIANTS.items():
        im = marble(1600, 1200, seed, bands, warp, tongues, cells)
        im.save(os.path.join(OUT, f"{name}.jpg"), quality=88)
        print("wrote", name)
