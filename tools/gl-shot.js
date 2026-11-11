// Screenshot a WebGL page with software GL. Usage: node tools/gl-shot.js <html> <out.png> [t]
const path = require('path');
const core = process.env.PLAYWRIGHT_CORE || 'playwright-core';
const { chromium } = require(core);
(async () => {
  const [html, out, t = '8'] = process.argv.slice(2);
  const b = await chromium.launch({
    executablePath: process.env.CHROME_BIN,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  p.on('console', m => console.log('[page]', m.text()));
  await p.goto('file://' + path.resolve(html) + '?t=' + t, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForSelector('body[data-ready]', { timeout: 120000 });
  await p.waitForTimeout(500);
  console.log('title:', await p.title());
  await p.screenshot({ path: out });
  await b.close();
})();
