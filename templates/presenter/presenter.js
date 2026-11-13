/* presenter.js — 把一份 deck 的 <section class="s"> 变成可演讲的网页。
   用法:在 deck 的 index.html 末尾加 <script src="../../templates/presenter/presenter.js"></script>,
   然后打开 index.html?present 。不带 ?present 时什么都不做,所以 tools/shot.js 的渲染不受影响。
   按键:→ ↓ 空格 PageDown 下一页 | ← ↑ PageUp 上一页 | Home End 首尾 | N 显示备注 | F 全屏
   Magic Move:两页里给元素加相同的 data-morph="名字",翻页时自动过渡(data-morph-ms 调时长)。
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
  // Magic Move: 相邻两页里 data-morph 值相同的元素,翻页时从旧位置/大小过渡到新位置/大小。
  const morphRects = () => { const m = {}; slides[cur] && slides[cur].querySelectorAll('[data-morph]').forEach(e => { m[e.dataset.morph] = e.getBoundingClientRect(); }); return m; };
  function morph(before) {
    // 没有 data-morph 的内容在移动期间淡入,避免和正在移动的元素叠在一起
    if (Object.keys(before).length) [...slides[cur].children].forEach(e => {
      if (!e.matches('[data-morph]') && !e.querySelector('[data-morph]'))
        e.animate([{ opacity: 0 }, { opacity: 0, offset: .55 }, { opacity: 1 }], { duration: 900, easing: 'ease-out' });
    });
    const k = slides[cur].getBoundingClientRect().width / 1920 || 1;
    slides[cur].querySelectorAll('[data-morph]').forEach(e => {
      const a = before[e.dataset.morph]; if (!a) return;
      const b = e.getBoundingClientRect(); if (!b.width || !b.height) return;
      e.animate([{ transformOrigin: '0 0', transform: `translate(${(a.left - b.left) / k}px,${(a.top - b.top) / k}px) scale(${a.width / b.width},${a.height / b.height})` },
                 { transformOrigin: '0 0', transform: 'none' }], { duration: +(e.dataset.morphMs || 700), easing: 'cubic-bezier(.65,0,.25,1)' });
    });
  }
  function show(before) {
    slides.forEach((s, i) => s.classList.toggle('on', i === cur));
    bar.style.width = ((cur + 1) / slides.length * 100) + '%';
    nb.textContent = notes[cur] || '';
    history.replaceState(null, '', location.search + '#' + (cur + 1));
    if (before) morph(before);
  }
  const go = n => { const before = morphRects(); cur = Math.min(slides.length - 1, Math.max(0, n)); show(before); };
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
