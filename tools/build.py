"""Assemble rendered slide PNGs into PPTX (with speaker notes) and PDF.
Usage: python tools/build.py decks/<name> <output-basename>
Requires: python-pptx, pillow
"""
import json
import os
import sys

from PIL import Image
from pptx import Presentation
from pptx.util import Inches

deck = sys.argv[1]
base = sys.argv[2] if len(sys.argv) > 2 else os.path.basename(deck.rstrip("/"))
pngs = sorted(
    (f for f in os.listdir(f"{deck}/png") if f.startswith("s") and f.endswith(".png")),
    key=lambda f: int(f[1:-4]),
)
notes_path = f"{deck}/notes.json"
notes = json.load(open(notes_path, encoding="utf-8")) if os.path.exists(notes_path) else []

prs = Presentation()
prs.slide_width, prs.slide_height = Inches(13.333), Inches(7.5)
for i, f in enumerate(pngs):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    s.shapes.add_picture(f"{deck}/png/{f}", 0, 0, prs.slide_width, prs.slide_height)
    if i < len(notes):
        s.notes_slide.notes_text_frame.text = notes[i]
prs.save(f"{deck}/{base}.pptx")

ims = [Image.open(f"{deck}/png/{f}").convert("RGB") for f in pngs]
ims[0].save(f"{deck}/{base}.pdf", save_all=True, append_images=ims[1:], resolution=144)
print(f"built {len(pngs)} slides -> {deck}/{base}.pptx, .pdf")
