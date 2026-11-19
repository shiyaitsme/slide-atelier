// Extract every <section class="s"> of a deck into a JSON list of shapes, text boxes and
// images (positions in px on a 1920x1080 canvas) for tools/build_from_html.py.
// Usage: node tools/extract_layout.js decks/<name> [out.json]   (same env vars as shot.js)
const fs = require('fs'), path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const deck = path.resolve(process.argv[2] || '.');
const out = path.resolve(process.argv[3] || path.join(deck, 'layout.json'));

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_BIN });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await p.goto('file://' + path.join(deck, 'index.html'), { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  await p.addStyleTag({ content: '.st,.tw{animation:none!important;opacity:1!important}' });
  const slides = await p.evaluate(() => {
    const INLINE = new Set(['SPAN', 'B', 'I', 'STRONG', 'EM', 'BR']);
    const parse = c => { const m = c.match(/[\d.]+/g).map(Number); return { r: m[0], g: m[1], b: m[2], a: m.length > 3 ? m[3] : 1 }; };
    const hex = ({ r, g, b }) => '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
    const mix = (c, bg, a) => ({ r: c.r * a + bg.r * (1 - a), g: c.g * a + bg.g * (1 - a), b: c.b * a + bg.b * (1 - a) });
    const opacityOf = el => { let o = 1; for (let e = el; e && e.nodeType === 1; e = e.parentElement) o *= +getComputedStyle(e).opacity; return o; };
    // colour a painted background shows from behind `el` (nearest ancestor with a solid bg)
    const backdrop = el => {
      const stack = [];
      for (let e = el; e && e.nodeType === 1; e = e.parentElement) stack.push(e);
      let bg = { r: 255, g: 255, b: 255 };
      for (const e of stack.reverse()) {
        const c = parse(getComputedStyle(e).backgroundColor);
        if (c.a > 0) bg = mix(c, bg, c.a * 1);
      }
      return bg;
    };
    const backdropOf = el => backdrop(el.parentElement || el);
    const sections = [...document.querySelectorAll('section.s')];
    return sections.map(sec => {
      const sr = sec.getBoundingClientRect();
      const items = [];
      const box = el => { const r = el.getBoundingClientRect(); return { x: r.left - sr.left, y: r.top - sr.top, w: r.width, h: r.height }; };
      const hidden = el => { const cs = getComputedStyle(el); return cs.display === 'none' || cs.visibility === 'hidden'; };

      function textRuns(el, out, paras) {
        for (const n of el.childNodes) {
          if (n.nodeType === 3) {
            const t = n.textContent.replace(/\s+/g, ' ');
            if (!t.trim() && !(t === ' ' && out.length)) continue;
            const pe = n.parentElement, cs = getComputedStyle(pe);
            const col = parse(cs.color), al = col.a * opacityOf(pe);
            out.push({
              t, size: parseFloat(cs.fontSize), bold: +cs.fontWeight >= 600,
              color: hex(mix(col, backdrop(pe), al)),
              font: cs.fontFamily.split(',')[0].replace(/["']/g, '').trim(),
              ls: cs.letterSpacing === 'normal' ? 0 : parseFloat(cs.letterSpacing)
            });
          } else if (n.nodeType === 1) {
            if (n.tagName === 'BR') { paras.push(out.splice(0)); continue; }
            if (INLINE.has(n.tagName) && !hidden(n)) textRuns(n, out, paras);
          }
        }
      }

      function walk(el) {
        if (hidden(el)) return;
        const cs = getComputedStyle(el);
        const bx = box(el);
        if (bx.w < 0.5 || bx.h < 0.5) return;
        if (el !== sec) {
          const bg = parse(cs.backgroundColor);
          if (bg.a > 0) {
            const op = opacityOf(el) * bg.a;
            items.push({ type: 'rect', ...bx, color: hex(mix(bg, backdropOf(el), op)),
              radius: Math.min(parseFloat(cs.borderTopLeftRadius) || 0, bx.w / 2, bx.h / 2) });
          }
          const bw = parseFloat(cs.borderBottomWidth);
          if (bw > 0 && cs.borderBottomStyle !== 'none') {
            const bc = parse(cs.borderBottomColor);
            if (bc.a > 0) items.push({ type: 'rect', x: bx.x, y: bx.y + bx.h - bw, w: bx.w, h: bw, color: hex(bc), radius: 0 });
          }
        }
        if (el.tagName === 'IMG') {
          let clip = null;
          for (let a = el.parentElement; a && a !== sec; a = a.parentElement) {
            const ac = getComputedStyle(a);
            if (ac.overflow === 'hidden') { clip = { ...box(a), radius: parseFloat(ac.borderTopLeftRadius) || 0 }; break; }
          }
          const pl = parseFloat(cs.paddingLeft), pt = parseFloat(cs.paddingTop), pr = parseFloat(cs.paddingRight), pb = parseFloat(cs.paddingBottom);
          items.push({ type: 'img', src: el.src, x: bx.x + pl, y: bx.y + pt, w: bx.w - pl - pr, h: bx.h - pt - pb,
            fit: cs.objectFit, pos: cs.objectPosition, nw: el.naturalWidth, nh: el.naturalHeight,
            radius: parseFloat(cs.borderTopLeftRadius) || 0, clip });
          return;
        }
        const directText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
        if (directText && el !== sec) {
          const runs = [], paras = [];
          textRuns(el, runs, paras);
          paras.push(runs);
          const pl = parseFloat(cs.paddingLeft), pt = parseFloat(cs.paddingTop), pr = parseFloat(cs.paddingRight), pb = parseFloat(cs.paddingBottom);
          const fs = parseFloat(cs.fontSize);
          const lh = cs.lineHeight === 'normal' ? fs * 1.45 : parseFloat(cs.lineHeight);
          // trim edge whitespace of each paragraph
          for (const pr_ of paras) { if (pr_.length) { pr_[0].t = pr_[0].t.replace(/^\s+/, ''); pr_[pr_.length - 1].t = pr_[pr_.length - 1].t.replace(/\s+$/, ''); } }
          items.push({ type: 'text', x: bx.x + pl, y: bx.y + pt, w: bx.w - pl - pr, h: bx.h - pt - pb,
            align: cs.textAlign === 'center' ? 'center' : (cs.textAlign === 'right' ? 'right' : 'left'),
            lh, lines: Math.max(1, Math.round((bx.h - pt - pb) / lh)), paras: paras.filter(x => x.length) });
          return;
        }
        for (const c of el.children) walk(c);
      }
      const sbg = parse(getComputedStyle(sec).backgroundColor);
      for (const c of sec.children) walk(c);
      return { bg: hex(sbg), items };
    });
  });
  fs.writeFileSync(out, JSON.stringify(slides, null, 1));
  await b.close();
  console.log('wrote', out, slides.length, 'slides');
})();
