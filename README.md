# slide-atelier

按风格和主题组装 PPT 的工具箱。版式和风格分开存放,可以自由组合。

```
styles/     风格 CSS,一种风格一个文件(现有:poster-bw.css 黑白海报风)
layouts/    版式片段,直接复制进 deck 的 index.html,再改文字和图
art/        配图生成脚本(泡沫膜、肋骨、液态金属)
tools/      shot.js 渲染截图,build.py 打包 PPTX 和 PDF
decks/      成品,每个 deck 一个文件夹
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
python tools/build.py decks/my-deck my-deck       # 打包 pptx 和 pdf
```

页面是整页图片,PPTX 里文字不可编辑,文字放在每页的备注里。

## 现有 deck

- `decks/organic-forms`:美学中的有机生物(8 页)。
