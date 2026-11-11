/* presenter.js — 把一份 deck 的 <section class="s"> 变成可演讲的网页。
   用法:在 deck 的 index.html 末尾加 <script src="../../templates/presenter/presenter.js"></script>,
   然后打开 index.html?present 。不带 ?present 时什么都不做,所以 tools/shot.js 的渲染不受影响。
   按键:→ ↓ 空格 PageDown 下一页 | ← ↑ PageUp 上一页 | Home End 首尾 | N 显示备注 | F 全屏
   备注来源:同目录 notes.json(与 build.py 共用),按页序号对应。 */
(function () {
  if (!new URLSearchParams(location.search).has('present')) return;
  const slides = [...document.querySelectorAll('section.s')];
  if (!slides.length) return;
  let cur = Math.max(0, (parseInt(location.hash.slice(1)) || 1) - 1), notes = [];
  const st = document.createElement('style');
  st.textContent = `body{background:#000;margin:0;overflow:hidden}
  section.s{position:absolute!important;left:50%;top:50%;margin:0!important;transform-origin:0 0;display:none}
  section.s.on{display:block}
  #pbar{position:fixed;left:0;bottom:0;height:3px;background:#fff;mix-blend-mode:difference;z-index:9;transition:width .3s}
  #pnote{position:fixed;left:0;right:0;bottom:0;padding:18px 28px;background:rgba(0,0,0,.85);color:#eee;font:16px/1.7 'Noto Sans SC',sans-serif;z-index:8;display:none}`;
  document.head.appendChild(st);
  const bar = document.body.appendChild(Object.assign(document.createElement('div'), { id: 'pbar' }));
  const nb = document.body.appendChild(Object.assign(document.createElement('div'), { id: 'pnote' }));
  fetch('notes.json').then(r => r.json()).then(n => { notes = n; show(); }).catch(() => {});
  function fit() {
    const k = Math.min(innerWidth / 1920, innerHeight / 1080);
    slides.forEach(s => { s.style.transform = `translate(${-960 * k}px,${-540 * k}px) scale(${k})`; });
  }
  function show() {
    slides.forEach((s, i) => s.classList.toggle('on', i === cur));
    bar.style.width = ((cur + 1) / slides.length * 100) + '%';
    nb.textContent = notes[cur] || '';
    history.replaceState(null, '', location.search + '#' + (cur + 1));
  }
  const go = n => { cur = Math.min(slides.length - 1, Math.max(0, n)); show(); };
  addEventListener('keydown', e => {
    if (['ArrowRight', 'ArrowDown', ' ', 'PageDown'].includes(e.key)) go(cur + 1);
    else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) go(cur - 1);
    else if (e.key === 'Home') go(0); else if (e.key === 'End') go(slides.length - 1);
    else if (e.key.toLowerCase() === 'n') nb.style.display = nb.style.display === 'block' ? 'none' : 'block';
    else if (e.key.toLowerCase() === 'f') document.documentElement.requestFullscreen?.();
  });
  addEventListener('click', e => go(e.clientX > innerWidth / 3 ? cur + 1 : cur - 1));
  addEventListener('resize', fit); fit(); show();
})();
