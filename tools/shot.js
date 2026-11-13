// Render every <section class="s" id="sN"> of a deck to PNG.
// Usage: node tools/shot.js decks/<name>
// Needs playwright-core (set PLAYWRIGHT_CORE to its path) and a chromium
// headless shell (set CHROME_BIN, or it is searched under /opt/playwright).
const fs = require('fs');
const path = require('path');
const core = process.env.PLAYWRIGHT_CORE || 'playwright-core';
const { chromium } = require(core);

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
  await p.waitForTimeout(+(process.env.WAIT||2000));
  const out = path.join(deck, 'png');
  fs.mkdirSync(out, { recursive: true });
  const n = await p.$$eval('section.s', els => els.length);
  for (let i = 1; i <= n; i++) {
    const el = await p.$('#s' + i);
    await el.screenshot({ path: path.join(out, `s${i}.png`) });
  }
  await b.close();
  console.log(`rendered ${n} slides -> ${out}`);
})();
