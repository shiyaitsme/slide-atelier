/* fit.js — 窗口比 1920 窄时,把每页 section.s 等比缩小到刚好放进窗口宽度,不再横向滚动。
   窗口宽度 >= 1880 时不动,所以 shot.js / record.js(1920 视口)的输出和以前完全一样。
   ?present 时不动:演讲模式(templates/presenter)有自己的缩放。
   用法:在页面末尾加 <script src="../../styles/fit.js"></script> */
(function () {
  if (/[?&]present/.test(location.search)) return;
  function fit() {
    var w = document.documentElement.clientWidth;
    var z = w >= 1880 ? 1 : Math.max(0.2, w / 1920);
    document.querySelectorAll('section.s').forEach(function (s) { s.style.zoom = z === 1 ? '' : z; });
  }
  addEventListener('resize', fit);
  fit();
})();
