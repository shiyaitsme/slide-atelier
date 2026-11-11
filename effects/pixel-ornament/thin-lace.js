/* EFFECT: thin-lace — 细线像素蕾丝(2 格宽的卷草 + 小花 + 叶)。
   用法:<canvas class="lace" data-w="48" data-h="90" data-cell="8" data-color="#fff" style="left:..;top:..;"></canvas>
   然后 <script src="thin-lace.js">。纯 canvas 自绘,不读取图片,所以 file:// 下也能用。
   data-flip="1" 左右镜像;data-seed 改变形状。 */
(function () {
  function rng(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
  document.querySelectorAll('canvas.lace').forEach(c => {
    const W = +c.dataset.w || 48, H = +c.dataset.h || 90, K = +c.dataset.cell || 8;
    const col = c.dataset.color || '#fff', rand = rng(+c.dataset.seed || 7);
    const g = new Uint8Array(W * H);
    const put = (x, y) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < W && y < H) g[y * W + x] = 1; };
    const dot = (x, y) => { put(x, y); put(x + 1, y); }; // 2 格宽的笔
    const line = (x0, y0, x1, y1) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2 + 1; for (let i = 0; i <= n; i++) dot(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n); };
    const curl = (cx, cy, R, dir, turns) => { // 对数螺线,越卷越小
      const N = 160;
      for (let i = 0; i <= N; i++) { const t = i / N, a = t * turns * 2 * Math.PI * dir, r = R * (1 - .86 * t); dot(cx + r * Math.cos(a), cy + r * Math.sin(a)); }
    };
    const flower = (x, y, r) => { put(x, y); for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { put(x + dx * 2, y + dy * 2); put(x + dx * 3, y + dy * 3); } if (r > 1) for (const [dx, dy] of [[2,2],[-2,2],[2,-2],[-2,-2]]) put(x + dx, y + dy); };
    const leaf = (x, y, dx, dy) => { for (let i = 0; i < 5; i++) { put(x + dx * i, y + dy * i + (i > 1 && i < 4 ? 1 : 0)); } };
    // 主藤:正弦波,每个波峰外侧长一个卷
    const P = 22, A = W * .16, cx0 = W / 2;
    const vx = y => cx0 + A * Math.sin(2 * Math.PI * y / P);
    for (let y = 0; y < H; y++) dot(vx(y), y);
    let side = 1;
    for (let y = P / 4; y < H - 8; y += P / 2) {
      const x = vx(y), R = 5 + rand() * 2.5;
      curl(x + side * R, y - 1, R, -side, 1.35);
      if (rand() > .25) flower(Math.round(x + side * (R * 2 + 5)), Math.round(y - 3), 2);
      leaf(Math.round(x), Math.round(y + 6), side, 1);
      leaf(Math.round(x), Math.round(y - 8), -side, -1);
      side = -side;
    }
    // 细边:一条虚线点列沿画布外缘
    for (let y = 0; y < H; y += 3) put(1, y);
    c.width = W * K; c.height = H * K; c.style.width = W * K + 'px'; c.style.height = H * K + 'px';
    const ctx = c.getContext('2d'); ctx.fillStyle = col;
    const f = c.dataset.flip === '1';
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (g[y * W + x]) ctx.fillRect((f ? W - 1 - x : x) * K, y * K, K, K);
  });
})();
