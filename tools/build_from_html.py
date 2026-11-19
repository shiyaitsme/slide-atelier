"""Build an editable PPTX (real text boxes, rounded rectangles, pictures) from a deck's
index.html, using the layout that tools/extract_layout.js measured in Chromium.

Usage: python tools/build_from_html.py decks/<name> <layout.json> <output.pptx> [--latin FONT] [--ea FONT]
Needs: python-pptx, pillow
Coordinates: the 1920x1080 px canvas maps to 13.333x7.5 in, so 1 px = 0.5 pt.
Fonts (Noto Sans SC, Poppins) must be installed where the file is opened.
"""
import io
import json
import os
import sys
from urllib.parse import unquote, urlparse

from PIL import Image, ImageDraw
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.util import Emu, Pt

deck, layout_path, out = sys.argv[1], sys.argv[2], sys.argv[3]
# Optional font overrides: --latin "Helvetica Neue" --ea "PingFang SC"
def _opt(name, default):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else default
LATIN = _opt("--latin", None)
EA = _opt("--ea", None)
layout = json.load(open(layout_path, encoding="utf-8"))
notes_path = os.path.join(deck, "notes.json")
notes = json.load(open(notes_path, encoding="utf-8")) if os.path.exists(notes_path) else []

EMU_PX = 914400 // 144  # 1 px = 1/144 in


def E(v):
    return Emu(int(round(v * EMU_PX)))


def rgb(h):
    h = h.lstrip("#")
    return RGBColor(int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


def pos_frac(token, free):
    token = token.strip()
    if token.endswith("%"):
        return float(token[:-1]) / 100 * free
    if token.endswith("px"):
        return float(token[:-2])
    return free / 2


def render_image(it):
    """Return PNG bytes of the image as drawn (fit + object-position + rounded clip)."""
    path = unquote(urlparse(it["src"]).path)
    im = Image.open(path).convert("RGBA")
    S = 2  # output scale (px of canvas -> px of image)
    W, H = int(round(it["w"] * S)), int(round(it["h"] * S))
    canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    nw, nh = im.size
    fit = it["fit"]
    if fit == "cover":
        sc = max(W / nw, H / nh)
    elif fit == "contain":
        sc = min(W / nw, H / nh)
    else:
        sc = W / nw
    dw, dh = int(round(nw * sc)), int(round(nh * sc))
    im = im.resize((dw, dh), Image.LANCZOS)
    px, py = (it["pos"].split() + ["50%"])[:2]
    ox, oy = pos_frac(px, W - dw), pos_frac(py, H - dh)
    canvas.paste(im, (int(round(ox)), int(round(oy))), im)
    # clip to the nearest overflow:hidden ancestor (rounded corners) and to its own box
    clip = it.get("clip")
    box = (it["x"], it["y"], it["x"] + it["w"], it["y"] + it["h"])
    cx0, cy0, cx1, cy1 = box
    r = it["radius"]
    if clip:
        cx0, cy0 = max(cx0, clip["x"]), max(cy0, clip["y"])
        cx1, cy1 = min(cx1, clip["x"] + clip["w"]), min(cy1, clip["y"] + clip["h"])
        r = clip["radius"]
    mask = Image.new("L", (W * 2, H * 2), 0)
    d = ImageDraw.Draw(mask)
    if clip and r:
        # rounded rect of the clip box in image-local coordinates (x2 supersample)
        lx0, ly0 = (clip["x"] - it["x"]) * S * 2, (clip["y"] - it["y"]) * S * 2
        lx1, ly1 = lx0 + clip["w"] * S * 2, ly0 + clip["h"] * S * 2
        d.rounded_rectangle((lx0, ly0, lx1, ly1), radius=r * S * 2, fill=255)
    else:
        d.rectangle((0, 0, W * 2, H * 2), fill=255)
    mask = mask.resize((W, H), Image.LANCZOS)
    a = canvas.getchannel("A")
    from PIL import ImageChops
    canvas.putalpha(ImageChops.multiply(a, mask))
    buf = io.BytesIO()
    canvas.save(buf, "PNG")
    buf.seek(0)
    return buf


prs = Presentation()
prs.slide_width, prs.slide_height = Emu(1920 * EMU_PX), Emu(1080 * EMU_PX)

for i, sl in enumerate(layout):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    s.background.fill.solid()
    s.background.fill.fore_color.rgb = rgb(sl["bg"])
    for it in sl["items"]:
        t = it["type"]
        if t == "rect":
            if it["radius"] > 0.5:
                sh = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, E(it["x"]), E(it["y"]), E(it["w"]), E(it["h"]))
                sh.adjustments[0] = min(0.5, it["radius"] / min(it["w"], it["h"]))
            else:
                sh = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, E(it["x"]), E(it["y"]), E(it["w"]), E(it["h"]))
            sh.fill.solid()
            sh.fill.fore_color.rgb = rgb(it["color"])
            sh.line.fill.background()
            sh.shadow.inherit = False
        elif t == "img":
            buf = render_image(it)
            s.shapes.add_picture(buf, E(it["x"]), E(it["y"]), E(it["w"]), E(it["h"]))
        elif t == "text":
            single = it["lines"] <= 1 and len(it["paras"]) <= 1
            pad = 0 if single else it["w"] * 0.03
            x = it["x"] - (pad / 2 if it["align"] == "center" else 0)
            tb = s.shapes.add_textbox(E(x), E(it["y"]), E(it["w"] + pad), E(it["h"]))
            tf = tb.text_frame
            tf.word_wrap = not single
            tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
            tf.vertical_anchor = MSO_ANCHOR.TOP
            for k, runs in enumerate(it["paras"]):
                p = tf.paragraphs[0] if k == 0 else tf.add_paragraph()
                p.line_spacing = Pt(it["lh"] * 0.5)
                p.alignment = {"left": PP_ALIGN.LEFT, "center": PP_ALIGN.CENTER, "right": PP_ALIGN.RIGHT}[it["align"]]
                for rn in runs:
                    r = p.add_run()
                    r.text = rn["t"]
                    f = r.font
                    f.size = Pt(rn["size"] * 0.5)
                    f.bold = rn["bold"]
                    f.name = LATIN or rn["font"]
                    f.color.rgb = rgb(rn["color"])
                    rPr = r._r.get_or_add_rPr()
                    if rn["ls"]:
                        rPr.set("spc", str(int(round(rn["ls"] * 0.5 * 100))))
                    # make CJK text use the same face
                    from pptx.oxml.ns import qn
                    ea = rPr.makeelement(qn("a:ea"), {"typeface": EA or "Noto Sans SC"})
                    rPr.append(ea)
    if i < len(notes):
        s.notes_slide.notes_text_frame.text = notes[i]

prs.save(out)
print(f"built {len(layout)} slides -> {out}")
