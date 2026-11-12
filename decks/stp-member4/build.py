"""超级猩猩 STP 作业 · 组员4 (P9 渠道 / P10 推广 / P11 战略优势)
在稻壳模板上填内容:保留模板的母版、配色(accent1 AA8C65)和字体(HarmonyOS Sans SC)。
用法: python build.py   (需要 python-pptx)
"""
import copy
from pathlib import Path
from pptx import Presentation
from pptx.util import Pt
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.dml import MSO_THEME_COLOR

HERE = Path(__file__).parent
SRC = HERE.parent.parent / "references" / "d24a6f3d-2a55-45da-84c7-b20abe5b7d38.pptx"
OUT = HERE / "superape_stp_member4.pptx"
FONT = "HarmonyOS Sans SC"
BLACK = "HarmonyOS Sans SC Black"

prs = Presentation(SRC)
slides = list(prs.slides)
# 模板第 5 / 13 / 9 页 -> P9 / P10 / P11
keep = [slides[4], slides[12], slides[8]]


def by_name(s, name):
    r = [x for x in s.shapes if x.name == name]
    assert len(r) == 1, (name, len(r))
    return r[0]


def drop(sh):
    sh._element.getparent().remove(sh._element)


def set_paras(sh, lines, size=None, align=None, width=None):
    """保留第一段第一个 run 的格式,按 lines 重写文字。"""
    tf = sh.text_frame
    p0 = tf.paragraphs[0]
    r0 = p0.runs[0]
    for r in p0.runs[1:]:
        r._r.getparent().remove(r._r)
    for p in tf.paragraphs[1:]:
        p._p.getparent().remove(p._p)
    base = copy.deepcopy(p0._p)
    r0.text = lines[0]
    for line in lines[1:]:
        np_ = copy.deepcopy(base)
        p0._p.getparent().append(np_)
        from pptx.text.text import _Paragraph
        para = _Paragraph(np_, tf)
        para.runs[0].text = line
    for p in tf.paragraphs:
        for r in p.runs:
            if size:
                r.font.size = Pt(size)
        if align is not None:
            p.alignment = align
    if width:
        sh.width = Pt(width)
        tf.word_wrap = True


def add_box(s, x, y, w, h, fill=None, shape=MSO_SHAPE.RECTANGLE):
    b = s.shapes.add_shape(shape, Pt(x), Pt(y), Pt(w), Pt(h))
    b.shadow.inherit = False
    b.line.fill.background()
    if fill == "dark":
        b.fill.solid(); b.fill.fore_color.theme_color = MSO_THEME_COLOR.TEXT_1
    elif fill == "accent":
        b.fill.solid(); b.fill.fore_color.theme_color = MSO_THEME_COLOR.ACCENT_1
    else:
        b.fill.background()
    return b


def write(b, lines, anchor=MSO_ANCHOR.MIDDLE, align=PP_ALIGN.CENTER):
    """lines: [(text, size, bold_font, color)] color: 'w' 白 / 'a' 强调色 / 't' 正文灰"""
    tf = b.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = anchor
    tf.margin_left = tf.margin_right = Pt(6)
    for i, (t, size, black, col) in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        r = p.add_run(); r.text = t
        r.font.size = Pt(size)
        r.font.name = BLACK if black else FONT
        if col == "w":
            r.font.color.theme_color = MSO_THEME_COLOR.BACKGROUND_1
        elif col == "a":
            r.font.color.theme_color = MSO_THEME_COLOR.ACCENT_1
        else:
            r.font.color.theme_color = MSO_THEME_COLOR.TEXT_2


def add_text(s, x, y, w, h, lines, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP):
    b = s.shapes.add_textbox(Pt(x), Pt(y), Pt(w), Pt(h))
    write(b, lines, anchor=anchor, align=align)
    b.text_frame.margin_left = b.text_frame.margin_right = Pt(0)
    return b


# ---------------------------------------------------------------- P9 渠道
s = keep[0]
set_paras(by_name(s, "文本框 2"), ["4P拆解——渠道布局"], width=600)
set_paras(by_name(s, "文本框 27"), ["渠道策略 | 线下轻资产门店 + 线上小程序闭环"], size=18, width=700)
set_paras(by_name(s, "文本框 30"),
          ["渠道的核心是“去销售化”:线下门店只负责上课,购课、预约、签到全部在一个小程序里完成。"],
          size=14, align=PP_ALIGN.LEFT)
drop(by_name(s, "图片 26"))
drop(by_name(s, "图片占位符 11"))
set_paras(by_name(s, "文本框 20"), ["线下渠道"])
set_paras(by_name(s, "文本框 21"),
          ["· 选址核心商圈、写字楼、社区底商", "· 小面积轻资产门店,不做大健身房", "· 集中在一二线城市"],
          size=12, align=PP_ALIGN.LEFT)
set_paras(by_name(s, "文本框 23"), ["线上渠道"])
set_paras(by_name(s, "文本框 24"),
          ["· 微信小程序是唯一购课、预约、签到入口", "· 无App、无电话销售、无前台推销"],
          size=12, align=PP_ALIGN.LEFT)
# 左侧面板:城市分布(替代门店地图)
panel = add_box(s, 54, 217, 385, 274, "dark")
add_text(s, 78, 235, 340, 20, [("门店分布", 12, False, "a")])
for i, c in enumerate("北上广深杭"):
    chip = add_box(s, 78 + i * 68, 268, 56, 56, "accent", MSO_SHAPE.OVAL)
    write(chip, [(c, 18, True, "w")])
add_text(s, 78, 340, 340, 22, [("目前主要集中在一二线城市", 13, False, "w")])
add_text(s, 78, 385, 340, 20, [("选址偏好", 12, False, "a")])
for i, t in enumerate(["核心商圈", "写字楼", "社区底商"]):
    pill = add_box(s, 78 + i * 112, 412, 100, 32, None, MSO_SHAPE.ROUNDED_RECTANGLE)
    pill.line.color.theme_color = MSO_THEME_COLOR.ACCENT_1
    pill.line.width = Pt(1)
    write(pill, [(t, 12, False, "w")])

# ---------------------------------------------------------------- P10 推广
s = keep[1]
set_paras(by_name(s, "文本框 2"), ["4P拆解——传播与推广"], width=600)
add_text(s, 54, 58, 850, 22,
         [("一句话:靠无推销的口碑传播,不做传统健身房的电话骚扰式销售。", 14, False, "t")])
tiles = [  # (原占位符名, 大字, 小字, 底色)
    ("图片占位符 23", "小红书\n抖音", "KOL + 素人打卡", "dark"),
    ("图片占位符 21", "三人成团", "好友拼团享折扣", "accent"),
    ("图片占位符 19", "¥99", "两次体验券", "dark"),
    ("图片占位符 17", "社群", "教练IP · 极少硬广", "accent"),
]
for name, big, small, fill in tiles:
    ph = by_name(s, name)
    x, y, w, h = [v / 12700 for v in (ph.left, ph.top, ph.width, ph.height)]
    drop(ph)
    t = add_box(s, x, y, w, h, fill)
    lines = [(l, 26, True, "w") for l in big.split("\n")] + [(small, 12, False, "w")]
    write(t, lines)
cards = [
    ("文本框 54", "文本框 55", "达人种草", "小红书、抖音健身KOL与素人打卡"),
    ("文本框 58", "文本框 59", "社交裂变", "好友拼团,三人成团享折扣"),
    ("文本框 62", "文本框 63", "新客引流", "99元两次体验券"),
    ("文本框 66", "文本框 67", "口碑驱动", "会员社群运营、教练IP人设,极少硬广投放"),
]
for tn, bn, title, body in cards:
    set_paras(by_name(s, tn), [title])
    set_paras(by_name(s, bn), [body], size=12, align=PP_ALIGN.LEFT)

# ---------------------------------------------------------------- P11 战略优势
s = keep[2]
set_paras(by_name(s, "文本框 4"), ["STP战略优势"], width=600)
quad = [
    ("文本框 8", "文本框 11", "定位精准", "切中消费者反感健身房推销的痛点,差异化辨识度高"),
    ("文本框 15", "文本框 16", "轻资产模式", "门店投入小,现金流风险远低于传统健身房年卡预售模式"),
    ("文本框 21", "文本框 22", "数字化成熟", "全流程小程序自助,符合年轻人消费习惯"),
    ("文本框 27", "文本框 28", "品牌统一", "4P策略与STP定位高度一致,品牌形象清晰"),
]
for tn, bn, title, body in quad:
    set_paras(by_name(s, tn), [title])
    set_paras(by_name(s, bn), [body], size=13)
drop(by_name(s, "图片占位符 25"))
drop(by_name(s, "图片 30"))
core = add_box(s, 363, 74, 240, 387, "dark")
write(core, [("STP", 30, True, "w"), ("×", 20, False, "a"), ("4P", 30, True, "w"),
             ("高度一致", 16, False, "w")])

# ---------------------------------------------------------------- 只留这 3 页,按 P9 P10 P11 排序
lst = prs.slides._sldIdLst
ids = list(lst)
keep_ids = {id(slides[i]): ids[i] for i in range(len(slides))}
want = [ids[4], ids[12], ids[8]]
for sid in ids:
    if sid not in want:
        prs.part.drop_rel(sid.rId)
        lst.remove(sid)
for sid in want:
    lst.remove(sid)
    lst.append(sid)

prs.save(OUT)
print("saved", OUT)
