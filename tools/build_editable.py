"""Build a PPTX with real, editable text boxes over background art.

Usage: python tools/build_editable.py decks/<name>/editable.json
Needs: python-pptx

Spec format (editable.json):
{
  "output": "name.pptx",
  "slides": [
    {
      "bg_color": "#0A0A0C",
      "bg_image": "art/foam_dark.png",          # optional, path relative to the spec
      "notes": "speaker notes",
      "items": [
        {"type": "text", "x": 1.0, "y": 1.0, "w": 6, "h": 1.5,   # inches
         "text": "有机生物", "size": 66, "color": "#F2F2F0",
         "bold": true, "font": "Noto Sans SC", "spacing": 0},
        {"type": "line", "x1": 1, "y1": 3, "x2": 2.5, "y2": 3, "color": "#F2F2F0", "width": 1.5},
        {"type": "image", "src": "art/chrome_c.png", "x": 8, "y": 0, "w": 5.3, "h": 7.5}
      ]
    }
  ]
}

Fonts must be installed on the machine that opens the file (Anton, Space Mono,
Noto Sans SC). Blend modes and outline text are not available here, which is
why the image-based pipeline (shot.js + build.py) exists for the poster look.
"""
import json
import os
import sys

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.util import Inches, Pt


def rgb(h):
    h = h.lstrip("#")
    return RGBColor(int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


spec_path = sys.argv[1]
base = os.path.dirname(os.path.abspath(spec_path))
spec = json.load(open(spec_path, encoding="utf-8"))

prs = Presentation()
prs.slide_width, prs.slide_height = Inches(13.333), Inches(7.5)

for sl in spec["slides"]:
    s = prs.slides.add_slide(prs.slide_layouts[6])
    fill = s.background.fill
    fill.solid()
    fill.fore_color.rgb = rgb(sl.get("bg_color", "#FFFFFF"))
    if sl.get("bg_image"):
        s.shapes.add_picture(os.path.join(base, sl["bg_image"]), 0, 0, prs.slide_width, prs.slide_height)
    for it in sl.get("items", []):
        t = it["type"]
        if t == "text":
            tb = s.shapes.add_textbox(Inches(it["x"]), Inches(it["y"]), Inches(it["w"]), Inches(it["h"]))
            tf = tb.text_frame
            tf.word_wrap = True
            tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
            for i, line in enumerate(it["text"].split("\n")):
                p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
                p.line_spacing = it.get("line_spacing", 1.15)
                r = p.add_run()
                r.text = line
                f = r.font
                f.size = Pt(it.get("size", 18))
                f.bold = it.get("bold", False)
                f.name = it.get("font", "Noto Sans SC")
                f.color.rgb = rgb(it.get("color", "#000000"))
                if it.get("spacing"):
                    r._r.get_or_add_rPr().set("spc", str(it["spacing"]))
        elif t == "line":
            c = s.shapes.add_connector(1, Inches(it["x1"]), Inches(it["y1"]), Inches(it["x2"]), Inches(it["y2"]))
            c.line.color.rgb = rgb(it.get("color", "#000000"))
            c.line.width = Pt(it.get("width", 1))
        elif t == "image":
            s.shapes.add_picture(os.path.join(base, it["src"]), Inches(it["x"]), Inches(it["y"]),
                                 Inches(it["w"]), Inches(it["h"]))
        elif t == "rect":
            r = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(it["x"]), Inches(it["y"]), Inches(it["w"]), Inches(it["h"]))
            r.fill.solid()
            r.fill.fore_color.rgb = rgb(it.get("color", "#000000"))
            r.line.fill.background()
    if sl.get("notes"):
        s.notes_slide.notes_text_frame.text = sl["notes"]

out = os.path.join(base, spec.get("output", "editable.pptx"))
prs.save(out)
print(f"built {len(spec['slides'])} slides -> {out}")
