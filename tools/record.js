// Record one slide of an effect demo to MP4, frame by frame (deterministic, no jitter).
// Usage: node tools/record.js effects/<name> [seconds=4] [slideId=s1] [fps=24]
// Env:   PRESS   comma list of seconds at which ArrowRight is pressed (for ?present pages), e.g. '0.5,2.5'
//        slideId 'page' records the whole viewport instead of one slide
//        TSCALE  multiply time for shader pages (slow shaders look static otherwise), default 1
//        QUERY  appended to the page URL, e.g. '?res=0.5'
//        PLAYWRIGHT_CORE, CHROME_BIN as in shot.js;  FFMPEG_BIN path to ffmpeg (npm i ffmpeg-static)
// CSS animations are driven through the Web Animations API; WebGL pages read window.__t.
const fs = require('fs'), path = require('path'), os = require('os');
const { execFileSync } = require('child_process');
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');

const dir = path.resolve(process.argv[2] || '.');
const secs = +(process.argv[3] || 4), id = process.argv[4] || 's1', fps = +(process.argv[5] || 24);
const tscale = +(process.env.TSCALE || 1);
const ffmpeg = process.env.FFMPEG_BIN || 'ffmpeg';
const exe = process.env.CHROME_BIN;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rec-'));

(async () => {
  const b = await chromium.launch(exe ? { executablePath: exe } : {});
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await p.goto('file://' + path.join(dir, 'index.html') + (process.env.QUERY || ''), { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  await p.evaluate(() => document.getAnimations().forEach(a => a.pause()));
  const el = id === 'page' ? p : await p.$('#' + id);
  const press = (process.env.PRESS || '').split(',').filter(Boolean).map(Number);
  await p.evaluate(() => { window.__starts = new Map(); });
  const n = Math.round(secs * fps);
  for (let i = 0; i < n; i++) {
    const t = i / fps;
    while (press.length && press[0] <= t) { press.shift(); await p.keyboard.press('ArrowRight'); }
    await p.evaluate(([t, k]) => {
      window.__t = t * k;
      document.getAnimations().forEach(a => { a.pause(); if (!window.__starts.has(a)) window.__starts.set(a, t); a.currentTime = (t - window.__starts.get(a)) * 1000; });
      return new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    }, [t, tscale]);
    await el.screenshot({ path: path.join(tmp, `f${String(i).padStart(4, '0')}.png`) });
    if (i % 12 === 0) console.log('frame', i, '/', n, new Date().toISOString().slice(11, 19));
  }
  await b.close();
  const out = path.join(dir, 'preview.mp4');
  execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', path.join(tmp, 'f%04d.png'),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '22', '-movflags', '+faststart', out]);
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`recorded ${n} frames -> ${out} (${(fs.statSync(out).size / 1024).toFixed(0)} KB)`);
})();
