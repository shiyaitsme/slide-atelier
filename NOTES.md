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

## 效果(effects/)
- `tools/shot.js` 现在等待 2000 ms 再截图(可用环境变量 `WAIT` 改),让入场动画走完、WebGL 画出第一帧。
- 无头 Chromium 的 WebGL 可用(软件渲染),shader 页能正常截图。
- 半调不要用 canvas 读像素:`file://` 下图片会污染画布,`getImageData` 报安全错误。用 CSS 的 `plus-lighter` 加点阵再 `contrast()` 阈值化,黑点大小才会随明暗变化。
- 跨页延续的图,先看原图主体在哪。`chrome_wide.png` 的主体偏右,不平移的话接缝处是空的,要用 `left:-700px` 之类的偏移让主体跨过 1920 px 的分界。
- 同一个路径名的图被 `read_file` 看过后会走缓存,改完先复制成新文件名再看。
- 沙箱里软件渲染 WebGL 很慢:1920×1080 的 fbm 着色器约 5 秒一帧。录制时用 `?res=0.5`,约 1.7 秒一帧。
- 沙箱的 `/tmp` 会被清空,`/root` 只读。ffmpeg 的安装和录制要放在同一条命令里,别分开跑;`pkill -f record.js` 会把自己的 shell 也杀掉。
- `risograph`:墨层的 alpha 用 `feColorMatrix` 的最后一行做明暗映射(`-1.25R+1.1`),深底亮主体的图要反号。漏墨用 `feTurbulence` 再过一次阈值矩阵,`feComposite in` 打掉。
- `glitch-slice`:`feTurbulence baseFrequency="0 f"` 的 x 频率为 0,噪声只沿 y 变,才会是横带。带高由 f 决定,`.045` 太碎(像扫描线),`.016` 左右才是成块的色带。位移图的 y 通道要固定 .5,否则会上下错位。
- 动态滤镜默认关,用 `?live` 打开;否则 `shot.js` 的截图会随机落在"关"的瞬间。`record.js` 要带 `QUERY='?live'`。
- `particle-text`:`document.fonts.load(font)` 之后才能采样,否则画出来的是回退字体。成字动画写成时间的纯函数,`window.__t` 才能逐帧录制。"幽灵鼠标"要按粒子包围盒游走,放在固定位置可能落在空白处,截图看不到推开效果。
- `read_file` 读过的图改完后仍返回缓存(哪怕文件已经重新渲染),要复制成新文件名再看。读图和复制不要放在同一批并行调用里,读会先于复制执行。

## pixel-lace 风格练习
`styles/pixel-lace.css` 是配色和字体,`decks/pixel-lace-study` 是 6 页练习稿(占位图在 `art/photo-*.png`,可按文件名替换),花纹由 `art/pixel_ornament.py` 生成。参考图见 `references/pixel-lace-dream-01.png`。

## dream-high(WebGL2 多页 deck)
- **架构**:DOM/CSS 负责版式和文字,一个全屏片元着色器读每个 `.frame` 的 `getBoundingClientRect` 去画图。版式只有 CSS 一个来源,改版式不用动着色器。早先的 three.js 版把文字烤进一张不透明平面,版式被锁死,已放弃。
- **每页一个不同技术**:像素花边、折射气泡、亮度视差、法线重打光、旋度噪声发丝、数据马赛克、像素揭示、程序日出。别把八页都做成同一个效果加不同图。
- **装饰要有规则**:每页最多一个角花,放在版式的空白处,落在 14 px 网格上,避开页眉页脚。顺时针轮换四角会撞内容,要按每页版式逐页指定。封面已有照片上的花边链,不再加角花。
- **深色页的字**:`--fg2` 用 .78 不透明度,标题以外的正文加 text-shadow,不然压在图上看不清。
- **中文字体**:Noto Serif SC 只内嵌 `index.html` 里用到的字(`build-fonts.js` 切片)。改了文字必须重跑,否则新字显示成方块。
- **配色**:从参考图用 canvas 量化取色,主图占比要大但不能是 100%。第 7 页的色条直接画出各参考的占比。
- **渲染**:`gl-shot.js` 的 `PAGES` 环境变量指定页数(默认 6,忘设会少渲染)。软件渲染一页要几十秒,命令超时设到 600 s。
- **不能直接打印成 PDF**:`tools/pdf.js` 打印 DOM,拿不到 canvas。WebGL deck 用 `tools/png-pdf.js` 拼截图。
- **改完先看图**:一轮渲染里肉眼才发现的问题(图注压到色条、角花撞标题、深色页文字发灰)占了大半,别只看命令有没有报错。
- **未验证**:真机上的实时帧率(18 个气泡循环加 12 次采样模糊较重)、过渡动画的实际观感。

## Git
- 推送常被拒,因为别人也往 `initial-structure` 推(上传的参考图、其他 deck)。先 `git fetch`,看新提交有没有碰同一批文件,没有就 `git rebase origin/initial-structure` 再推。不要强推。
- `rebase` 和 `push` 不要放在同一轮并行执行,顺序错了会推出旧的历史。

## 检查脚本
- `tools/check.js` 只查两类硬错误:文字被页面边缘裁掉、文字溢出容器。刻意出血的元素加 `data-bleed` 放行。
- 没有做"元素重叠"检测:这套风格里大字叠印、镂空词压图是刻意的,检测会大量误报。
- 竖排文字(`writing-mode: vertical-rl`)的 `scrollWidth` 判断不适用,脚本已跳过。
- `+` 定位标记的数量要算好:每个 72 px,14 个刚好在 1080 px 内,15 个会被裁掉。
