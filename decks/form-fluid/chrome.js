// Page chrome for form-fluid: running header with grid ticks, footer with section
// progress and page number, and a small vertical label on the right edge.
// Set per page on <section>: data-label="02 — 背景 Context" data-chap="2".
// Pages without data-label (cover, closing) get no chrome.
// Edit the three constants below once for the whole deck.
(function () {
  const TITLE = 'Form Fluid — Deck Template';
  const AUTHOR = '李诗雅 Li Shiya · 23.11.26';
  const SIDE = 'Form Fluid · Vol. 01 · Slide Atelier';
  const CHAPTERS = 5;

  const pages = [...document.querySelectorAll('section.s')];
  const total = String(pages.length).padStart(2, '0');
  pages.forEach((s, i) => {
    const no = String(i + 1).padStart(2, '0');
    const side = document.createElement('div');
    side.className = 'side cap';
    side.textContent = `${SIDE} · ${no}`;
    s.appendChild(side);
    if (!s.dataset.label) return;
    const chap = +s.dataset.chap || 0;
    let prog = '';
    for (let c = 1; c <= CHAPTERS; c++) prog += `<i class="${c < chap ? 'done' : c === chap ? 'on' : ''}"></i>`;
    s.insertAdjacentHTML('beforeend', `
      <div class="hd cap"><div>${TITLE}</div><div>${s.dataset.label}</div><div>Slide Atelier · 2026</div></div>
      <div class="ticks"></div>
      <div class="ft"><div class="cap">${AUTHOR}</div><div class="prog">${prog}<span class="mono">${String(chap).padStart(2, '0')}/${String(CHAPTERS).padStart(2, '0')}</span></div><div class="mono">${no} / ${total}</div></div>`);
  });
})();
