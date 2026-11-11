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
| `shader-flow` | WebGL 片元着色器(fbm 域扭曲),无依赖 | `<canvas class="fx-shader" data-colors="#深,#中,#亮">`,`?t=3` 固定时间,`?res=0.5` 降分辨率 | 网页可动;静帧取一帧;[预览视频](shader-flow/preview.mp4) |
| `text-reveal` | CSS 遮罩 + 逐字 stagger,小段 JS 拆字 | 文字加 `data-reveal`,`--stagger` 调间隔 | 网页可动;静帧是终态;[预览视频](text-reveal/preview.mp4) |
| `spread-continuation` | 同一组宽元素在相邻页按偏移裁切 | 第 N 页 `left = -偏移 - (N-1)*1920px` | 静帧、PPTX 都行,翻页连续 |
| `dither` | 纯 CSS 有序抖动:灰度图 + Bayer 4×4 阈值矩阵(`plus-lighter`)+ `contrast` 阈值化 | `.fx-dither` 包一张 `<img>`,`--px` 像素块大小,`.invert` 反相 | 静帧 |
| `chromatic` | SVG 滤镜:R/B 通道左右偏移后 `screen` 混回 | `fx-chroma`(8px)/`fx-chroma-l`(14px);图片要比页面大一圈,否则露出边缘色条 | 静帧、PPTX 都行 |
| `clip-reveal` | `clip-path` 动画:横扫、自下而上、圆形展开、斜切 | `rv-wipe` `rv-up` `rv-iris` `rv-diag`,`--d` 延迟,`--t` 时长 | 网页可动;静帧是终态;[预览视频](clip-reveal/preview.mp4) |
| `magic-move` | FLIP:记旧位置,换页后用 Web Animations 过渡到新位置 | 相邻页元素加相同 `data-morph="名字"`,用 `?present` 打开(需 `templates/presenter`) | 仅网页;静帧是各页终态;[预览视频](magic-move/preview.mp4) |
| `goo` | SVG 滤镜:高斯模糊 + alpha 对比拉高,圆形靠近时像水银一样粘连 | 容器 `.fx-goo`,里面放 `<i>` 圆形,用 CSS 动画移动,`--goo` 定颜色 | 网页可动;静帧;[预览视频](goo/preview.mp4) |
| `warp` | SVG `feTurbulence` + `feDisplacementMap` 噪声位移 | `fx-warp`(22)/`fx-warp-l`(55);`baseFrequency` 越小波纹越大 | 静帧、PPTX 都行 |
| `marquee` | CSS 无限平移,内容写两遍,位移 -50% 循环 | `.fx-marquee` 包 `<div>`,`.rev` 反向,`--s` 一圈时长 | 网页可动;静帧;[预览视频](marquee/preview.mp4) |
| `path-draw` | SVG `pathLength="1"` + `stroke-dashoffset` 动画 | 路径加 `class="draw"`,`--d` 延迟 `--t` 时长,节点用 `.pop` | 网页可动;静帧是终态;[预览视频](path-draw/preview.mp4) |
| `duotone` | SVG 灰度 + `feComponentTransfer` 线性映射到两色 | `fx-duo-a/b/c`,改 `tableValues` 换色 | 静帧、PPTX 都行 |
| `pixel-ornament` | 40×68 像素花纹遮罩(`art/pixel_ornament.py` 生成 `ornament.css`),同一遮罩可做白色花纹或透出照片,可镜像 | `px-white` / `px-orn` / `flip`,见 demo | 静帧、PPTX 都行 |
| `sparkle` | 纯 CSS 星光、加号、菱形,可闪烁 | `sp-star` / `sp-plus` / `sp-dia`,`--s` 大小 `--c` 颜色 | 静帧可导出;闪烁只在网页 |

"导出"一列决定它能不能进 PPTX:`build.py` 只打包静帧,动效在 PPTX 里会变成一张图,完整效果要用 `templates/presenter` 在网页里演讲。

## 新增一个效果的约定

1. 新建 `effects/<name>/index.html`,引用 `../../styles/poster-bw.css`,保证 1920×1080 的 `section.s`。
2. 效果代码用 `.fx-<name>` 命名空间,参数走 CSS 变量或 `data-*`,放在文件顶部 `/* EFFECT: ... */` 注释里写清用法。
3. 尽量零依赖;要用库(GSAP、Three.js)就在注释里写明版本和 CDN。
4. 用 `node tools/shot.js effects/<name>` 出预览图,并在上表加一行,标明导出能力。
5. 会动的效果再录一段 `preview.mp4`:`node tools/record.js effects/<name> 4 s1 24`。它逐帧设定时间再截图(CSS 动画走 Web Animations API,WebGL 页读 `window.__t`),所以不卡。需要 ffmpeg:`npm i ffmpeg-static`,用 `FFMPEG_BIN` 指向它。慢的着色器页加 `QUERY="?res=0.5"`,时间太慢看不出动用 `TSCALE=8`。

## 待做(想法)

ASCII 化图片(`file://` 下不能读像素,要走本地服务器或预生成)、Three.js 可旋转模型页、SVG 路径描绘、TouchDesigner 录屏循环背景。
