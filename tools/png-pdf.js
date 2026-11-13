// Bundle rendered slide PNGs into a PDF, one 1920x1080 page per image.
// For WebGL decks, where printing the DOM (tools/pdf.js) would not capture the canvas.
// Usage: node tools/png-pdf.js <out.pdf> <s1.png> <s2.png> ...   (same env vars as pdf.js)
const fs = require('fs'), path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const [out, ...imgs] = process.argv.slice(2);
if (!out || !imgs.length) { console.error('usage: png-pdf.js out.pdf img1.png img2.png ...'); process.exit(1); }
(async () => {
  const body = imgs.map(f => `<img src="data:image/png;base64,${fs.readFileSync(f).toString('base64')}">`).join('');
  const html = `<style>@page{size:1920px 1080px;margin:0}html,body{margin:0;background:#fff}img{display:block;width:1920px;height:1080px;break-after:page}img:last-child{break-after:auto}</style>${body}`;
  const b = await chromium.launch({ executablePath: process.env.CHROME_BIN });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await p.setContent(html, { waitUntil: 'load' });
  await p.pdf({ path: path.resolve(out), width: '1920px', height: '1080px', printBackground: true, preferCSSPageSize: true });
  await b.close();
  console.log('wrote', path.resolve(out), imgs.length, 'pages');
})();
