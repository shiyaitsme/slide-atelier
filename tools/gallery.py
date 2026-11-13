#!/usr/bin/env python3
"""Generate the top-level index.html: a gallery of every effect and deck.

Usage: python3 tools/gallery.py        (run from anywhere; writes <repo>/index.html)

Effects: any effects/<name>/index.html. Thumbnail = png/s1.png, a preview.mp4 link if present,
and the one-line technique text is read from the table in effects/README.md.
Decks:   any decks/<name>/ with index.html (opened in the browser) plus its PDF / PPTX files.
"""
import html
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def effect_notes():
    """name -> technique text from the table in effects/README.md."""
    notes = {}
    readme = ROOT / "effects" / "README.md"
    if not readme.exists():
        return notes
    for line in readme.read_text(encoding="utf-8").splitlines():
        m = re.match(r"\|\s*`([\w-]+)`\s*\|\s*(.+?)\s*\|", line)
        if m:
            notes[m.group(1)] = re.sub(r"[`*]", "", m.group(2))
    return notes


def card(href, thumb, title, desc="", links=()):
    img = (f'<img loading="lazy" src="{html.escape(thumb)}" alt="">' if thumb
           else '<div class="nothumb">no preview</div>')
    extra = "".join(f'<a class="chip" href="{html.escape(u)}">{html.escape(t)}</a>' for t, u in links)
    d = f'<p>{html.escape(desc)}</p>' if desc else ""
    return (f'<article><a class="th" href="{html.escape(href)}">{img}</a>'
            f'<h3><a href="{html.escape(href)}">{html.escape(title)}</a></h3>{d}'
            f'<div class="chips">{extra}</div></article>')


def effects_cards():
    notes = effect_notes()
    out = []
    for d in sorted((ROOT / "effects").iterdir()):
        if not (d / "index.html").exists():
            continue
        n = d.name
        thumb = f"effects/{n}/png/s1.png" if (d / "png" / "s1.png").exists() else ""
        links = []
        if (d / "preview.mp4").exists():
            links.append(("video", f"effects/{n}/preview.mp4"))
        if n == "glitch-slice":
            links.append(("?live", f"effects/{n}/?live"))
        if n == "magic-move":
            links.append(("?present", f"effects/{n}/?present"))
        out.append(card(f"effects/{n}/", thumb, n, notes.get(n, ""), links))
    return "\n".join(out)


def decks_cards():
    out = []
    for d in sorted((ROOT / "decks").iterdir()):
        if not d.is_dir():
            continue
        n = d.name
        has_html = (d / "index.html").exists()
        thumb = f"decks/{n}/png/s1.png" if (d / "png" / "s1.png").exists() else ""
        links = [(f.suffix[1:], f"decks/{n}/{f.name}") for f in sorted(d.iterdir())
                 if f.suffix in (".pdf", ".pptx")]
        href = f"decks/{n}/" if has_html else (links[0][1] if links else f"decks/{n}/")
        out.append(card(href, thumb, n, "", links))
    return "\n".join(out)


PAGE = """<!doctype html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>slide-atelier</title>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Space+Mono:wght@400;700&family=Noto+Sans+SC:wght@300;500;900&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a0a0a;color:#f2f2f0;font-family:'Noto Sans SC',sans-serif;padding:56px 48px 96px}
a{color:inherit;text-decoration:none}
h1{font-family:'Anton',sans-serif;font-weight:400;font-size:96px;line-height:.9;letter-spacing:.005em}
.sub{font-family:'Space Mono','Noto Sans SC',monospace;font-size:13px;letter-spacing:.16em;text-transform:uppercase;color:#8d8d90;margin:18px 0 56px}
h2{font-family:'Space Mono','Noto Sans SC',monospace;font-size:14px;letter-spacing:.16em;text-transform:uppercase;font-weight:400;color:#8d8d90;margin:48px 0 20px;border-top:1px solid #333;padding-top:20px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:28px 24px}
article .th{display:block;aspect-ratio:16/9;background:#161616;overflow:hidden}
article img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .35s}
article .th:hover img{transform:scale(1.04)}
.nothumb{height:100%;display:grid;place-items:center;font-family:'Space Mono',monospace;font-size:12px;letter-spacing:.14em;color:#555;text-transform:uppercase}
h3{font-family:'Space Mono','Noto Sans SC',monospace;font-size:15px;font-weight:700;margin:12px 0 4px}
h3 a:hover{text-decoration:underline}
article p{font-size:13px;line-height:1.55;color:#a5a5a8;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.chips{display:flex;gap:6px;margin-top:8px;flex-wrap:wrap}
.chip{font-family:'Space Mono',monospace;font-size:11px;letter-spacing:.08em;border:1px solid #444;padding:2px 8px;color:#cfcfcf}
.chip:hover{background:#f2f2f0;color:#0a0a0a}
footer{margin-top:72px;font-family:'Space Mono','Noto Sans SC',monospace;font-size:12px;color:#666}
</style>
</head>
<body>
<h1>SLIDE ATELIER</h1>
<div class="sub">effects · decks &mdash; 点缩略图打开页面,chip 是视频、PDF、PPTX</div>
<h2>effects</h2>
<div class="grid">
@@EFFECTS@@
</div>
<h2>decks</h2>
<div class="grid">
@@DECKS@@
</div>
<footer>由 tools/gallery.py 生成,新增效果或 deck 后重跑一次。</footer>
</body>
</html>
"""


if __name__ == "__main__":
    page = PAGE.replace("@@EFFECTS@@", effects_cards()).replace("@@DECKS@@", decks_cards())
    (ROOT / "index.html").write_text(page, encoding="utf-8")
    print("wrote", ROOT / "index.html")
