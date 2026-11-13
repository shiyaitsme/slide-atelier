// Static checks on a rendered deck. Usage: node tools/check.js decks/<name>
// Flags (1) text cut off by the slide edge, (2) text overflowing its own box.
// Elements that bleed on purpose carry data-bleed and are skipped.
// Deliberate overlaps (blend-mode titles, outline words over art) are NOT checked.
const path = require('path');
const core = process.env.PLAYWRIGHT_CORE || 'playwright-core';
const { chromium } = require(core);
const fs = require('fs');

const deck = path.resolve(process.argv[2] || '.');
const exe = process.env.CHROME_BIN || (() => {
  const base = '/opt/playwright';
  const d = fs.readdirSync(base).find(x => x.startsWith('chromium_headless_shell'));
  return `${base}/${d}/chrome-headless-shell-linux64/chrome-headless-shell`;
})();

(async () => {
  const b = await chromium.launch({ executablePath: exe });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await p.goto('file://' + path.join(deck, 'index.html'), { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);

  const issues = await p.evaluate(() => {
    const out = [];
    document.querySelectorAll('section.s').forEach(sec => {
      const S = sec.getBoundingClientRect();
      sec.querySelectorAll('*').forEach(el => {
        if (el.closest('[data-bleed]') || el.tagName === 'IMG' || el.tagName === 'svg') return;
        const hasText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
        if (!hasText) return;
        const r = document.createRange();
        r.selectNodeContents(el);
        const R = r.getBoundingClientRect();
        const label = `${sec.id} "${el.textContent.trim().slice(0, 18)}"`;
        const tol = 2;
        const cut = [];
        if (R.left < S.left - tol) cut.push('left');
        if (R.right > S.right + tol) cut.push('right');
        if (R.top < S.top - tol) cut.push('top');
        if (R.bottom > S.bottom + tol) cut.push('bottom');
        if (cut.length) out.push(`${label} 超出页面: ${cut.join(',')}`);
        const cs = getComputedStyle(el);
        if (cs.position === 'absolute' && cs.writingMode === 'horizontal-tb' && el.scrollWidth > el.clientWidth + 2 && cs.whiteSpace !== 'nowrap')
          out.push(`${label} 横向溢出容器`);
      });
    });
    return out;
  });

  await b.close();
  if (issues.length) { console.log(issues.join('\n')); process.exit(1); }
  console.log('check passed');
})();
