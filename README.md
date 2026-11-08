# slide-atelier

按风格和主题组装 PPT 的工具箱。版式和风格分开存放,可以自由组合。

```
styles/     风格 CSS,一种风格一个文件(现有:poster-bw.css 黑白海报风)
layouts/    版式片段,直接复制进 deck 的 index.html,再改文字和图
art/        配图生成脚本(泡沫膜、肋骨、液态金属)
tools/      shot.js 渲染截图,build.py 打包图片版,check.js 版面检查,build_editable.py 可编辑版
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

## 现有 deck

- `decks/organic-forms`:美学中的有机生物(8 页)。
