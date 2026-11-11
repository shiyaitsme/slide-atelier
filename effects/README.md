# effects

视觉效果收藏。每个效果一个文件夹,独立可看、可复制进任何 deck,不绑定某一种风格。

```
effects/<name>/
  index.html   demo,每页 <section class="s" id="sN">,与 deck 同格式
  png/         预览图(node tools/shot.js effects/<name> 生成)
```

看 demo:直接用浏览器打开 `effects/<name>/index.html`。
用效果:把 demo 里 `<style>` 的 `/* EFFECT */` 段和对应 `<script>`(如有)复制进你的 deck。

## 目录

| 效果 | 技术 | 用法 | 导出 |
|---|---|---|---|
| `grain` | SVG feTurbulence + `mix-blend-mode:overlay` | 元素加 `class="fx-grain"`,`--grain` 调强度 | 静帧、PPTX、PDF 都行 |
| `halftone` | 纯 CSS:灰度图 + 径向点阵 `plus-lighter` + `contrast` 阈值化 | `.fx-halftone` 包一张 `<img>`,`--dot` 点距,`--blur` 平滑度 | 静帧 |
| `shader-flow` | WebGL 片元着色器(fbm 域扭曲),无依赖 | `<canvas class="fx-shader" data-colors="#深,#中,#亮">`,`?t=3` 固定时间 | 网页可动;静帧取一帧 |
| `text-reveal` | CSS 遮罩 + 逐字 stagger,小段 JS 拆字 | 文字加 `data-reveal`,`--stagger` 调间隔 | 网页可动;静帧是终态 |
| `spread-continuation` | 同一组宽元素在相邻页按偏移裁切 | 第 N 页 `left = -偏移 - (N-1)*1920px` | 静帧、PPTX 都行,翻页连续 |

"导出"一列决定它能不能进 PPTX:`build.py` 只打包静帧,动效在 PPTX 里会变成一张图,完整效果要用 `templates/presenter` 在网页里演讲。

## 新增一个效果的约定

1. 新建 `effects/<name>/index.html`,引用 `../../styles/poster-bw.css`,保证 1920×1080 的 `section.s`。
2. 效果代码用 `.fx-<name>` 命名空间,参数走 CSS 变量或 `data-*`,放在文件顶部 `/* EFFECT: ... */` 注释里写清用法。
3. 尽量零依赖;要用库(GSAP、Three.js)就在注释里写明版本和 CDN。
4. 用 `node tools/shot.js effects/<name>` 出预览图,并在上表加一行,标明导出能力。

## 待做(想法)

dither/ASCII 化图片、色差(chromatic aberration)、液态 goo 滤镜、`clip-path` 形状揭示、Magic Move 式跨页元素延续、Three.js 可旋转模型页、SVG 路径描绘、TouchDesigner 录屏循环背景。
