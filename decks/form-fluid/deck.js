// Draws the two art layers of the form-fluid deck from data attributes, so every
// shape is reproducible from a seed and can be changed in index.html alone.
//
// Marble blob (inside <svg class="art">):
//   <g data-blob="cx cy r seed" data-src="art/marble_mix.jpg"
//      data-hole="dx dy r seed"        optional white hole inside the blob (offset from centre)
//      data-cut="x1,y1 x2,y2 ..."      optional polygon the blob is cut to (hard straight edge)
//      data-wobble="0.22"></g>         optional, how far the outline strays from a circle
// Tangled lines:
//   <svg class="art lines" data-lines="seed count" data-color="#111"></svg>
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const rnd = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const el = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };

  // closed Catmull-Rom spline through pts -> cubic Bezier path
  function closed(pts) {
    const n = pts.length; let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += `C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
    }
    return d + 'Z';
  }

  function blobPts(cx, cy, r, seed, wob) {
    const R = rnd(seed), terms = [2, 3, 4, 5].map(k => [k, (R() - .5) * 2 * wob / k * 1.6, R() * 6.283]);
    const pts = [], N = 14;
    for (let i = 0; i < N; i++) {
      const a = i / N * 6.283;
      let k = 1; for (const [f, amp, ph] of terms) k += amp * Math.sin(f * a + ph);
      pts.push([cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * k * .92]);
    }
    return pts;
  }

  let uid = 0;
  function drawBlob(g) {
    const [cx, cy, r, seed] = g.dataset.blob.trim().split(/\s+/).map(Number);
    const wob = +(g.dataset.wobble || .22);
    let d = closed(blobPts(cx, cy, r, seed, wob));
    if (g.dataset.hole) {
      const [dx, dy, hr, hs] = g.dataset.hole.trim().split(/\s+/).map(Number);
      d += closed(blobPts(cx + dx, cy + dy, hr, hs, .34));
    }
    const svg = g.ownerSVGElement, defs = svg.querySelector('defs') || svg.insertBefore(el('defs', {}), svg.firstChild);
    const id = 'ff' + (uid++);
    const cp = el('clipPath', { id }); cp.appendChild(el('path', { d, 'clip-rule': 'evenodd' })); defs.appendChild(cp);
    let target = g;
    if (g.dataset.cut) {
      const cid = id + 'c'; const cc = el('clipPath', { id: cid }); cc.appendChild(el('polygon', { points: g.dataset.cut })); defs.appendChild(cc);
      const inner = el('g', { 'clip-path': `url(#${cid})` }); g.appendChild(inner); target = inner;
    }
    const pad = r * 1.6;
    const img = el('image', { href: g.dataset.src, x: cx - pad, y: cy - pad * .8, width: pad * 2, height: pad * 1.6, preserveAspectRatio: 'xMidYMid slice', 'clip-path': `url(#${id})` });
    target.appendChild(img);
    // thin outline, as in the poster where each colour field has a drawn edge
    if (g.dataset.outline !== 'none') target.appendChild(el('path', { d, fill: 'none', stroke: g.dataset.outline || '#111', 'stroke-width': 1.2, 'fill-rule': 'evenodd' }));
  }

  function drawLines(svg) {
    const [seed, count] = svg.dataset.lines.trim().split(/\s+/).map(Number);
    const color = svg.dataset.color || getComputedStyle(svg.closest('.s')).color;
    const R = rnd(seed);
    for (let c = 0; c < count; c++) {
      // each loop is a lopsided ellipse; swapping two neighbouring points makes one
      // twist (a small crossing), which gives the poster's knotted look
      const n = 6 + Math.floor(R() * 3), pts = [];
      const cx = 200 + R() * 1520, cy = 150 + R() * 780;
      const rx = 380 + R() * 700, ry = 260 + R() * 420, rot = R() * 3.14;
      for (let i = 0; i < n; i++) {
        const a = (i + (R() - .5) * .5) / n * 6.283, k = .55 + R() * .75;
        const x = Math.cos(a) * rx * k, y = Math.sin(a) * ry * k;
        pts.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
      }
      if (R() < .7) { const i = Math.floor(R() * n), j = (i + 1) % n; [pts[i], pts[j]] = [pts[j], pts[i]]; }
      svg.appendChild(el('path', { d: closed(pts), fill: 'none', stroke: color, 'stroke-width': getComputedStyle(document.documentElement).getPropertyValue('--line').trim() || 1.6 }));
    }
  }

  document.querySelectorAll('[data-blob]').forEach(drawBlob);
  document.querySelectorAll('svg[data-lines]').forEach(drawLines);
})();
