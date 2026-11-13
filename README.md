# slide-atelier

按风格和主题组装 PPT 的工具箱。版式和风格分开存放,可以自由组合。

```
styles/     风格 CSS,一种风格一个文件(现有:poster-bw.css 黑白海报风)
layouts/    版式片段,直接复制进 deck 的 index.html,再改文字和图
effects/    视觉效果收藏,一个效果一个文件夹,见 effects/README.md
templates/  共用模板:deck-skeleton(五种基础页型)、presenter(网页演讲模式)
art/        配图生成脚本(泡沫膜、肋骨、液态金属)
tools/      shot.js 渲染截图,build.py 打包图片版,gl-shot.js 给 WebGL 页截图,
            png-pdf.js 把一组 PNG 拼成 PDF,record.js 录效果演示视频,
            check.js 版面检查,build_editable.py 可编辑版
decks/      成品,每个 deck 一个文件夹
DESIGN.md   设计原则与交付检查表
NOTES.md    踩坑记录
```

## 版式一览

| 文件 | 用途 |
|---|---|
| `cover-fullbleed` | 满版图加超大叠印英文的封面 |
| `definition-split` | 左大字观点,右侧竖排大字和图 |
| `timeline-curve` | 曲线时间线,四个节点错落排布 |
| `index-table` | 编号行表格,每行一个大号英文词 |
| `split-vertical-word` | 左图右文,中间竖排大字 |
| `blend-title-over-image` | 大标题以 difference 叠印在图上 |
| `hero-image-outline-word` | 大图加镂空英文词 |
| `closing-statement` | 结尾一句话 |

## 做一份新 PPT

```bash
pip install python-pptx pillow numpy
cp -r decks/organic-forms decks/my-deck          # 以现成 deck 为起点
python art/generate.py decks/my-deck/art          # 重新生成配图(可选)
# 编辑 decks/my-deck/index.html 与 notes.json
export PLAYWRIGHT_CORE=<playwright-core 路径>
node tools/shot.js decks/my-deck                  # 渲染成 png/
node tools/check.js decks/my-deck                 # 检查文字裁切和溢出
python tools/build.py decks/my-deck my-deck       # 打包 pptx 和 pdf
```

## 两条输出路线

| | 图片版 (`shot.js` + `build.py`) | 可编辑版 (`build_editable.py`) |
|---|---|---|
| 文字 | 烘进图片,不可改,文字在备注里 | 真文本框,可直接改 |
| 视觉 | 叠印、镂空字、任意 CSS 效果 | 只有普通文字、线条、矩形、图片 |
| 字体 | 不依赖对方电脑 | 对方需安装 Anton、Space Mono、Noto Sans SC |
| 适用 | 展示、投稿、视觉优先 | 需要多人修改、反复改字 |

可编辑版的写法见 `tools/build_editable.py` 顶部注释,示例在 `decks/organic-forms/editable.json`(只做了 2 页,没有在 PowerPoint 里实际打开确认过版面)。

## WebGL deck(dream-high 这一类)

文字和版式用 DOM/CSS 排,一个全屏 WebGL2 着色器按每个 `.frame` 的位置画图和特效。页面里不能直接打印成 PDF,要走截图。

```bash
cd decks/dream-high && FONTSRC=<node_modules>/@fontsource node build-fonts.js   # index.html 文字改了就重跑,生成 fonts.css
export PLAYWRIGHT_CORE=<playwright-core 路径> CHROME_BIN=<chrome-headless-shell 路径>
PAGES=8 node tools/gl-shot.js decks/dream-high/index.html decks/dream-high/png/s%d.png 3 all   # 软件渲染,每页要等几十秒
node tools/png-pdf.js decks/dream-high/dream-high.pdf decks/dream-high/png/s{1..8}.png
```

打开 `index.html` 直接放映:方向键/空格/点击翻页(点左侧 18% 返回),滚轮和触摸滑动也行,`?p=N` 从第 N 页开始。
普通 DOM deck 仍用 `tools/pdf.js` 或 `build.py` 导出。

## 演讲模式

任何 deck 末尾加一行 `<script src="../../templates/presenter/presenter.js"></script>`(`templates/deck-skeleton` 已带),
然后打开 `index.html?present`:方向键/空格翻页,`N` 显示备注(读同目录 notes.json),`F` 全屏,自动缩放到窗口。不带 `?present` 时不生效,不影响截图。

## 现有 deck

- `decks/organic-forms`:美学中的有机生物(8 页)。
- `decks/dream-high`:Dream big. Dream high.(8 页,WebGL2)。以 `references/` 的 01 为主色调(约 55%),其余五张各占 3–11%。每页一个不同的着色器效果,PDF 为 `dream-high.pdf`(静态画面,27 MB)。预览:`node tools/gl-shot.js decks/dream-high/index.html out-%d.png 8 <页码>`;导出 PNG 加 `all`(需 `PAGES=8`),再用 `tools/png-pdf.js` 出 PDF。
- `decks/girlhood-heroism`:少女时期的英雄主义。
- `decks/stp-member4`:超级猩猩 STP 作业第 9–11 页。
