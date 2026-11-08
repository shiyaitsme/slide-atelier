# 踩坑记录

做 PPT 时遇到过的问题和解法。新问题随时补在这里。

## 流程
- **一定要渲染后再看**。用 python-pptx 直接摆文本框、不看成品,做出来会平庸。现在的流程是 HTML 排版 → `tools/shot.js` 截图 → 看图 → 改 → `tools/build.py` 打包。
- 同一个文件名被 `read_file` 读过一次后会返回缓存。改图后换个文件名(如 `_v2.png`)再看。

## 字体
- 英文大标题用 Anton,等宽小字用 Space Mono,中文用 Noto Sans SC(300/500/900),都走 Google Fonts。
- Space Mono 没有中文字形,中文会显示成方块。`.mono` 的 font-family 里必须追加 `'Noto Sans SC'` 作为回退。
- 中文字用 `-webkit-text-stroke` 做镂空会露出笔画重叠,很丑。中文用灰色实心代替,镂空只给英文和数字。

## 视觉
- `mix-blend-mode: difference` 做大字叠印很有效,但只对白色文字效果好,且不可编辑。
- 小字压在亮线条上会看不清:给文字块加半透明深色底,或把背景图 `brightness(.72)`。
- 超大英文字别超出画面右边缘,否则最后一个字母被裁掉。先估宽度(Anton 约 0.45em/字母)。
- 时间线的曲线别穿过文字块,先定文字位置再调曲线终点。

## 生成图
- `art/generate.py` 里用 PIL 对 float32 图做模糊会报 `image has wrong mode`。要么用 numpy 直接算,要么转 uint8。
- 高度场不要先转 8 位再求梯度,会出现色带和平坦区。用浮点的圆顶函数 `sqrt(clip(f - t, 0))`。
- 液态金属的阴影用 `np.roll` 偏移时,边缘会回绕出一条亮带。出图后裁掉上、左各约 40 px。

## 环境
- 沙箱里 `pip install` 默认装到用户目录但不一定能被找到,改用 `pip install --target <dir>` 并设置 `PYTHONPATH`。
- 临时依赖别装进工作区,会让文件浏览器变慢(曾有 120 MB 的 `.pylibs`)。
- 没有 LibreOffice。渲染 PPT 靠 Chromium,不要依赖 soffice。

## 检查脚本
- `tools/check.js` 只查两类硬错误:文字被页面边缘裁掉、文字溢出容器。刻意出血的元素加 `data-bleed` 放行。
- 没有做"元素重叠"检测:这套风格里大字叠印、镂空词压图是刻意的,检测会大量误报。
- 竖排文字(`writing-mode: vertical-rl`)的 `scrollWidth` 判断不适用,脚本已跳过。
- `+` 定位标记的数量要算好:每个 72 px,14 个刚好在 1080 px 内,15 个会被裁掉。
