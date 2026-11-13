// Export a deck to PDF (one 1920x1080 page per slide) via Chromium print.
// Usage: node tools/pdf.js decks/<name> [out.pdf]   (same env vars as shot.js)
const fs = require('fs'), path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const deck = path.resolve(process.argv[2] || '.');
const out = path.resolve(process.argv[3] || path.join(deck, 'preview.pdf'));
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_BIN });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await p.goto('file://' + path.join(deck, 'index.html'), { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  await p.addStyleTag({ content: '.s{margin:0!important;break-after:page;page-break-after:always}.st,.tw{animation:none!important;opacity:1!important}body{background:none!important}' });
  await p.pdf({ path: out, width: '1920px', height: '1080px', printBackground: true });
  await b.close(); console.log('wrote', out);
})();
