// Screenshot a WebGL page with software GL. Usage: node tools/gl-shot.js <html> <out.png> [t] [page]
// <out.png> may contain %d; with page=all pages 1..$PAGES (default 6) are rendered.
const path = require('path');
const core = process.env.PLAYWRIGHT_CORE || 'playwright-core';
const { chromium } = require(core);
(async () => {
  const [html, out, t = '8', page = ''] = process.argv.slice(2);
  const b = await chromium.launch({
    executablePath: process.env.CHROME_BIN,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  p.on('console', m => console.log('[page]', m.text()));
  const shoot = async (pg, file) => {
    await p.goto('file://' + path.resolve(html) + '?t=' + t + (pg ? '&p=' + pg : ''), { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    await p.waitForSelector('body[data-ready]', { timeout: 180000 });
    await p.waitForTimeout(500);
    console.log('title:', await p.title());
    await p.screenshot({ path: file });
  };
  if (page === 'all') {
    const n = +(process.env.PAGES || 6);
    for (let i = 1; i <= n; i++) await shoot(i, out.replace('%d', i));
  } else await shoot(page, out.replace('%d', page || 1));
  await b.close();
})();
