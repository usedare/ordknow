from __future__ import annotations

import shutil
from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Cm, Pt
from PIL import Image, ImageDraw, ImageFont

import build_ordknow_template_docs as base


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs"
DOCX = OUT / "序知_AI个人体系化知识库_软件工程文档合订本_最终版.docx"
DOCX_FULL = OUT / "序知_AI个人体系化知识库_软件工程文档合订本_最终版.docx"
TITLE_PAGE_COUNT = 0


def evidence_image(name: str, title: str, text_path: Path) -> Path | None:
    if not text_path.exists():
        return None
    lines = text_path.read_text(encoding="utf-8", errors="ignore").splitlines()
    font_path = Path(r"C:\Windows\Fonts\msyh.ttc")
    if not font_path.exists():
        font_path = Path(r"C:\Windows\Fonts\consola.ttf")
    font = ImageFont.truetype(str(font_path), 22)
    title_font = ImageFont.truetype(str(font_path), 26)
    max_chars = 95
    wrapped: list[str] = []
    for line in lines[:90]:
        if len(line) <= max_chars:
            wrapped.append(line)
        else:
            for i in range(0, len(line), max_chars):
                wrapped.append(line[i:i + max_chars])
    w = 1500
    h = max(620, 95 + len(wrapped) * 31)
    img = Image.new("RGB", (w, h), "#111827")
    d = ImageDraw.Draw(img)
    d.text((38, 28), title, font=title_font, fill="#E5E7EB")
    y = 82
    for line in wrapped:
        d.text((38, y), line, font=font, fill="#D1D5DB")
        y += 31
    out = OUT / "evidence" / name
    out.parent.mkdir(exist_ok=True)
    img.save(out)
    return out


def add_cover(doc: Document, fig: dict[str, Path]) -> None:
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(0)
    p.add_run().add_picture(str(fig["cover"]), width=Cm(15.4))
    doc.add_page_break()


def title_page(doc: Document, title: str) -> None:
    global TITLE_PAGE_COUNT
    if TITLE_PAGE_COUNT > 0:
        doc.add_page_break()
    TITLE_PAGE_COUNT += 1
    base.title_page(doc, title)


def toc_page(doc: Document, entries: list[str]) -> None:
    base.toc_page(doc, entries)


def add_usecase(
    doc: Document,
    no: str,
    title: str,
    actor: str,
    system_role: str,
    pre: str,
    post: str,
    main_steps: list[str],
    alt_steps: list[str],
    note: str,
) -> None:
    base.heading(doc, f"{no} {title}", 3)
    base.bullet(doc, f"主要参与者：{actor}")
    base.bullet(doc, f"系统职责：{system_role}")
    base.bullet(doc, f"前置条件：{pre}")
    base.bullet(doc, f"后置条件：{post}")
    base.bullet(doc, "基本交互序列：")
    for idx, step in enumerate(main_steps, 1):
        base.numbered(doc, step, idx)
    base.bullet(doc, "扩展交互序列：")
    for idx, step in enumerate(alt_steps, 1):
        base.numbered(doc, step, idx)
    base.bullet(doc, f"业务说明：{note}")


def requirements_acquisition(doc: Document, fig: dict[str, Path]) -> None:
    title_page(doc, "序知 AI 个人体系化知识库\n软件需求获取文档")
    toc_page(doc, [
        "1.项目定位.......................................................... 1",
        "1.1 项目背景 ....................................................................................................................... 1",
        "1.2 项目目的 ....................................................................................................................... 2",
        "1.3 目标用户 ....................................................................................................................... 3",
        "1.4 产品边界 ....................................................................................................................... 4",
        "2.成员分工.......................................................... 5",
        "3.软件需求.......................................................... 6",
        "3.1 功能需求 ....................................................................................................................... 6",
        "3.2 非功能需求 ................................................................................................................... 8",
        "3.3 数据需求 ....................................................................................................................... 9",
        "4.软件需求描述分析.................................................. 10",
        "4.1 用户用例 ..................................................................................................................... 10",
        "4.2 AI 服务用例 ................................................................................................................. 22",
        "4.3 数据库用例 ................................................................................................................. 25",
    ])

    base.heading(doc, "1.项目定位", 1)
    base.heading(doc, "1.1 项目背景", 2)
    for text in [
        "随着在线学习、远程办公、信息检索和大模型工具的普及，个人每天都会产生大量碎片化知识。课程笔记、会议纪要、读书摘录、网页资料、灵感想法、问题记录和项目复盘都可能具有长期价值，但这些内容在产生时通常是无序的、临时的、重复的，甚至存在语序颠倒和上下文缺失。",
        "传统笔记软件主要解决“记录”和“存储”问题，用户需要自己建立目录、标签、分类和层级。实际使用过程中，很多用户会因为整理成本过高而只囤积素材，最后形成大量难以复用的资料堆。序知要解决的不是“写一篇好看的笔记”，而是解决“长期积累后如何自动形成个人知识体系”的问题。",
        "本项目的核心定位是：用户自由无序录入，AI 全权体系化重构。用户不需要提前整理逻辑、排版或分类，只需要将原始素材放入系统；AI 负责从素材中理解含义、提取有效信息、建立主题、组织层级、生成知识节点并维护节点之间的关系。",
    ]:
        base.para(doc, text)
    base.heading(doc, "1.2 项目目的", 2)
    for item in [
        "实现原始素材永久保留，保证用户输入内容不被 AI 覆盖或破坏。",
        "实现 AI 单条解析，将杂乱素材转化为核心含义、关键词、主题和知识类型。",
        "实现 AI 全库体系化重构，将分散素材整理为“一级主题—二级分支—知识节点”的结构。",
        "实现来源引用，每个知识节点都能追溯到一个或多个原始素材。",
        "实现知识网络维护，通过节点关系、版本历史和健康检查支撑长期演化。",
        "实现知识复用，包括知识树浏览、个人知识库问答和 Markdown/JSON 导出。",
    ]:
        base.bullet(doc, item)
    base.heading(doc, "1.3 目标用户", 2)
    base.table(doc, ["用户类型", "需求特点", "典型使用场景"], [
        ["学生", "学习资料多、知识点散、复习时需要体系。", "课程笔记、教材摘录、论文资料、错题和复习提纲。"],
        ["职场用户", "会议与项目资料频繁产生，需要形成经验库。", "会议纪要、需求讨论、项目复盘、工作方法沉淀。"],
        ["创作者", "素材来源杂，灵感和参考资料需要专题聚合。", "选题灵感、摘录、案例库、观点体系整理。"],
        ["终身学习者", "跨领域资料长期积累，需要自动关联。", "读书笔记、公开课、网页剪藏、个人思考。"],
    ], [2.5, 5.6, 7.3])
    base.heading(doc, "1.4 产品边界", 2)
    base.bullet(doc, "序知不是普通笔记软件，不要求用户手动建立目录。")
    base.bullet(doc, "序知不是娱乐聊天工具，AI 输出必须服务个人知识体系化。")
    base.bullet(doc, "序知不做脱离用户知识库的外网编造，回答和重构应基于用户素材。")
    base.bullet(doc, "序知第一阶段不做多人协作、模板市场、公开分享和移动端 App。")

    base.heading(doc, "2.成员分工", 1)
    base.table(doc, ["成员", "学号", "主要分工"], [
        ["刘锦耀", "20231060115", "主要代码手。负责项目主框架、核心功能实现、AI 接口、前后端联调、GitHub 推送和 Vercel 部署验证。"],
        ["马梓航", "20231060267", "负责需求获取、用户场景梳理、功能需求整理和用例规约协助。"],
        ["明曦", "20231060270", "负责界面流程梳理、用户使用说明、页面截图整理和交互体验检查。"],
        ["邓卓", "20231060168", "负责测试用例设计、测试执行记录、异常场景检查和测试报告整理。"],
        ["马敏楠", "20231060189", "负责数据库设计说明、接口文档整理、数据字典校对和报告格式检查。"],
    ], [2.2, 3.2, 10.0])
    base.para(doc, "课程名称：软件工程。指导老师：胡刚。项目采用 AI 辅助软件开发方式完成，团队成员围绕需求、设计、编码、测试、部署和文档工作分工协作。")

    base.heading(doc, "3.软件需求", 1)
    base.heading(doc, "3.1 功能需求", 2)
    base.table(doc, ["模块", "核心功能"], [
        ["用户认证", "- Magic Link 登录；\n- 未登录用户跳转登录页；\n- 登录后读取当前用户会话。"],
        ["素材入库", "- 支持手动输入、粘贴、OCR、音频转写、PDF/Word 解析；\n- 保留 raw_content；\n- 支持状态筛选、搜索、编辑和删除。"],
        ["AI 单条解析", "- 提取核心含义、有效信息、冗余信息、主题、知识类型、关键词和关联提示；\n- 输出结构化 JSON；\n- 失败时标记 failed。"],
        ["文本分块与向量", "- 长素材切分为 chunks；\n- 生成 embedding；\n- 使用 pgvector 支持语义检索。"],
        ["AI 体系化重构", "- 读取 analyzed 素材；\n- 生成一级主题、二级分支和知识节点；\n- 写入来源引用和版本快照。"],
        ["知识网络", "- 维护 knowledge_edges；\n- 展示相关节点；\n- 支持后续扩展前置、支撑、矛盾、延伸等关系。"],
        ["知识问答", "- 服务端基于当前用户知识库组织上下文；\n- 调用 AI 生成回答；\n- 未来支持问答回存。"],
        ["版本与健康", "- 查看体系化版本；\n- 比较版本差异；\n- 检查重复、孤儿、无来源等知识库健康问题。"],
        ["设置与导出", "- 模型选择；\n- API Key 配置；\n- JSON 与 Markdown 导出；\n- 隐私说明。"],
    ], [3.0, 12.4])
    base.heading(doc, "3.2 非功能需求", 2)
    for item in [
        "性能需求：页面交互应保持流畅，体系化重构限制单次处理规模，避免上下文过长造成模型失败。",
        "安全需求：所有业务表启用 RLS，服务端接口必须验证用户身份并按 user_id 过滤。",
        "可靠性需求：AI 调用失败不能影响原始素材，任务状态需要记录 completed 或 failed。",
        "可维护性需求：核心业务类型统一定义，数据库迁移按模块拆分，API 路由职责清晰。",
        "可扩展性需求：原始素材层、AI 理解层、知识网络层分离，便于后续支持增量更新。",
        "可用性需求：工作台采用三栏结构，使用户能在一个界面完成输入、解析和浏览。",
    ]:
        base.bullet(doc, item)
    base.heading(doc, "3.3 数据需求", 2)
    base.table(doc, ["数据对象", "说明", "保存位置"], [
        ["原始素材", "用户输入或导入的原始内容，不做覆盖式改写。", "materials"],
        ["解析结果", "AI 对单条素材的结构化理解。", "material_analysis"],
        ["素材分块", "长文本切分后的检索单元和向量。", "material_chunks"],
        ["知识主题", "AI 生成的一级主题和二级分支。", "knowledge_topics"],
        ["知识节点", "用户主要阅读和复用的体系化内容。", "knowledge_nodes"],
        ["来源引用", "节点与原始素材之间的证据关系。", "node_material_links"],
        ["知识关系", "节点之间的相关、前置、支撑、矛盾等关系。", "knowledge_edges"],
        ["版本快照", "每次体系化结果的完整 JSON 快照。", "knowledge_versions"],
    ], [3.0, 6.7, 5.7])

    base.heading(doc, "4.软件需求描述分析", 1)
    base.heading(doc, "4.1 用户用例", 2)
    base.add_pic(doc, fig["usecase"], "图 1 用户用例图", 15.7)
    usecases = [
        ("4.1.1", "用户登录", "用户", "验证用户身份并创建会话", "用户拥有邮箱并能接收 Magic Link", "用户进入主页面", ["用户打开登录页。", "用户输入邮箱并提交。", "系统发送 Magic Link。", "用户点击邮件链接完成验证。", "系统创建会话并跳转工作台。"], ["邮箱格式错误时提示重新输入。", "链接过期时要求重新发送。"], "登录是所有知识库操作的前提。"),
        ("4.1.2", "新增原始素材", "用户", "保存用户原始输入", "用户已登录", "materials 表新增 pending 记录", ["用户进入工作台。", "用户输入标题和原始内容。", "用户点击保存。", "系统写入 raw_content。", "素材列表刷新。"], ["内容为空时阻止提交。", "保存失败时提示错误。"], "原始素材是事实源，后续 AI 只基于此进行解析和重构。"),
        ("4.1.3", "编辑原始素材", "用户", "更新素材标题和原文", "素材属于当前用户", "materials 更新 updated_at", ["用户打开素材详情。", "用户修改标题或内容。", "用户点击保存。", "系统更新数据库。"], ["无权限访问时返回 401 或 404。", "内容过长时提示用户拆分。"], "编辑后可重新解析，使知识体系基于最新素材。"),
        ("4.1.4", "删除原始素材", "用户", "删除素材及相关解析数据", "素材属于当前用户", "素材和级联数据被移除", ["用户选择素材。", "用户点击删除。", "系统确认操作。", "系统删除记录。"], ["用户取消确认则不执行删除。", "已被知识节点引用时提示可能影响体系。"], "删除操作需要谨慎，因为来源引用会发生变化。"),
        ("4.1.5", "AI 单条解析", "用户、AI 服务", "调用 AI 输出结构化解析", "素材存在且未处于 analyzing", "保存 material_analysis", ["用户点击解析。", "系统将素材状态设为 analyzing。", "系统调用 AI。", "AI 返回 JSON。", "系统写入解析结果。", "系统将状态设为 analyzed。"], ["AI 失败时状态设为 failed。", "JSON 不合法时记录错误。"], "解析层降低重构时噪声，提高体系化质量。"),
        ("4.1.6", "文件导入解析", "用户", "读取上传文档内容并转为素材", "用户选择 PDF 或 Word 文件", "文件文本进入素材层", ["用户选择文件。", "系统调用 parse-file 接口。", "系统抽取文本。", "用户确认后保存为素材。"], ["文件格式不支持时提示错误。", "解析内容为空时提示重新上传。"], "该用例扩展了素材来源，但最终仍进入 materials。"),
        ("4.1.7", "图片 OCR 入库", "用户、AI 服务", "识别图片中的文字", "用户上传图片", "识别文本可保存为素材", ["用户上传图片。", "系统调用 OCR 接口。", "AI 返回识别文本。", "用户确认内容。", "系统保存素材。"], ["识别失败时提示重试。", "文本质量低时允许手动修正。"], "OCR 能把截图、拍照笔记纳入知识库。"),
        ("4.1.8", "音频转写入库", "用户、AI 服务", "将录音转写为文本", "用户上传音频", "转写文本可保存为素材", ["用户上传音频。", "系统调用转写接口。", "AI 返回转写文本。", "用户确认并保存。"], ["音频过大时提示压缩。", "转写失败时保留错误信息。"], "适合会议记录、课堂录音和临时口述灵感。"),
        ("4.1.9", "一键体系化", "用户、AI 服务、数据库", "生成知识体系并落库", "存在 analyzed 素材", "生成主题、节点、引用、关系和版本", ["用户点击一键体系化。", "系统创建 reconstruction_job。", "系统读取已解析素材。", "AI 生成体系化 JSON。", "系统写入知识网络。", "系统保存版本快照。"], ["没有 analyzed 素材时提示无法体系化。", "AI 失败时任务标记 failed。"], "这是序知区别于普通笔记软件的核心用例。"),
        ("4.1.10", "查看知识体系", "用户", "展示主题树和节点详情", "已存在知识节点", "用户看到体系化成果", ["用户进入知识页。", "系统加载主题树。", "用户展开主题。", "用户点击节点。", "系统显示节点内容和来源素材。"], ["无知识体系时提示先体系化。", "节点被删除时刷新列表。"], "该视图是用户使用 AI 重构结果的主要入口。"),
        ("4.1.11", "查看相关节点", "用户", "展示知识节点关系", "节点存在并有 edges", "用户理解知识间联系", ["用户打开节点详情。", "系统查询 source/target 边。", "系统展示相关节点。"], ["无相关节点时显示空状态。"], "知识关系让系统从树状目录进一步升级为知识网络。"),
        ("4.1.12", "知识问答", "用户、AI 服务", "基于用户知识库回答问题", "用户已登录", "返回带知识库上下文的回答", ["用户输入问题。", "系统检索素材和知识节点。", "系统组织上下文。", "AI 生成回答。", "前端显示回复。"], ["知识库为空时提示先添加素材。", "AI 失败时提示稍后重试。"], "问答不是开放聊天，而是个人知识库的复用方式。"),
        ("4.1.13", "查看版本历史", "用户", "展示体系化历史快照", "用户至少执行过一次体系化", "用户可查看版本列表", ["用户打开历史记录。", "系统读取 knowledge_versions。", "用户选择版本。", "系统显示摘要或差异。"], ["无历史版本时显示空状态。"], "版本历史保证知识体系演化过程可追溯。"),
        ("4.1.14", "导出个人数据", "用户", "导出 JSON 或 Markdown", "用户已登录", "下载个人知识库备份", ["用户进入设置页。", "用户点击导出。", "系统读取用户数据。", "系统生成文件并返回下载。"], ["导出失败时提示错误。"], "导出能力保证数据可迁移，降低用户长期使用顾虑。"),
    ]
    for i, uc in enumerate(usecases):
        add_usecase(doc, *uc)
        if i % 2 == 1:
            doc.add_page_break()
    base.heading(doc, "4.2 AI 服务用例", 2)
    add_usecase(doc, "4.2.1", "生成结构化解析 JSON", "AI 服务", "按照系统 Prompt 输出固定字段", "收到素材文本和规则", "返回可落库 JSON", ["读取系统角色约束。", "理解素材含义。", "提取主题、关键词和知识类型。", "返回 JSON。"], ["无法判断类型时选择 summary。", "内容过短时仍输出最小结构。"], "AI 服务不能脱离素材编造。")
    add_usecase(doc, "4.2.2", "生成体系化知识树", "AI 服务", "把多条素材重构为主题和节点", "收到已解析素材集合", "返回 system_title、summary、topics", ["合并相似素材。", "生成一级主题。", "生成二级分支。", "生成节点并回填 source_material_ids。"], ["素材过少时生成较小体系。", "素材冲突时保留来源。"], "体系化重构强调秩序，而不是扩写。")
    base.heading(doc, "4.3 数据库用例", 2)
    add_usecase(doc, "4.3.1", "执行 RLS 权限隔离", "数据库", "保证用户只能访问自己数据", "请求带有认证用户", "只返回 auth.uid 对应数据", ["接口发起查询。", "数据库执行 RLS 策略。", "返回当前用户数据。"], ["未登录请求被拒绝。"], "RLS 是项目隐私安全的基础。")


def requirements_analysis(doc: Document, fig: dict[str, Path]) -> None:
    title_page(doc, "序知 AI 个人体系化知识库\n软件需求分析文档")
    toc_page(doc, [
        "1.运行环境 .......................................................... 1",
        "1.1 设备 ................................................................................................................................. 1",
        "1.2 接口 ................................................................................................................................. 1",
        "2.软件需求 .......................................................... 2",
        "2.1 功能需求 ........................................................................................................................ 2",
        "2.2 非功能需求 ................................................................................................................... 3",
        "2.3 软件总体流程 .............................................................................................................. 4",
        "2.4 软件体系结构 .............................................................................................................. 5",
        "3.需求分析——功能建模 ............................................. 6",
        "3.1 素材管理模块 .............................................................................................................. 6",
        "3.2 AI 解析模块 .................................................................................................................. 8",
        "3.3 体系化模块 ................................................................................................................ 10",
        "3.4 知识问答模块 ............................................................................................................ 12",
        "3.5 数据导出模块 ............................................................................................................ 14",
    ])
    base.heading(doc, "1.运行环境", 1)
    base.heading(doc, "1.1 设备", 2)
    base.para(doc, "客户端运行在现代浏览器中，主要面向 PC 端使用。开发环境位于 Windows 本地目录 D:\\OrdKnow；服务器端可部署到支持 Node.js 的云平台，数据库和认证服务由 Supabase 提供。")
    base.heading(doc, "1.2 接口", 2)
    for item in [
        "Supabase Auth：用于用户登录、会话读取和权限判断。",
        "Supabase PostgreSQL：用于保存素材、解析结果、知识节点、关系和版本。",
        "pgvector：用于保存 embedding 并支持相似内容检索。",
        "AI Provider：用于素材解析、体系化重构和知识问答。",
        "Embedding Provider：用于长文本分块后的语义向量生成。",
        "文件解析/OCR/转写接口：用于把多模态素材转为文本。"
    ]:
        base.bullet(doc, item)
    base.heading(doc, "2.软件需求", 1)
    base.heading(doc, "2.1 功能需求", 2)
    base.table(doc, ["模块", "输入", "处理", "输出"], [
        ["素材管理", "用户文本、文件、图片、音频", "保存原始内容，维护状态", "materials 记录"],
        ["AI 解析", "单条素材", "调用模型生成结构化 JSON", "material_analysis 记录"],
        ["文本分块", "长文本素材", "按长度切分并生成 embedding", "material_chunks 记录"],
        ["体系化", "已解析素材集合", "聚类、排序、建层级、建引用", "topics、nodes、links、versions"],
        ["知识网络", "节点和来源引用", "生成节点间关系", "knowledge_edges"],
        ["问答", "用户问题", "检索知识上下文并调用 AI", "回答文本"],
        ["导出", "用户数据", "组装 JSON 或 Markdown", "下载文件"],
    ], [2.8, 3.6, 5.0, 4.0])
    base.heading(doc, "2.2 非功能需求", 2)
    for title, desc in [
        ("性能需求", "普通页面加载应满足日常交互；AI 类任务允许较长等待，但必须有状态反馈。"),
        ("安全需求", "接口必须验证登录用户，数据库通过 RLS 限制跨用户访问。"),
        ("完整性需求", "AI 生成节点必须保留来源素材 ID，避免知识体系失去事实依据。"),
        ("可恢复需求", "体系化失败时 reconstruction_jobs 保存错误信息，原始素材不受影响。"),
        ("可扩展需求", "多模态输入最终统一进入素材层，后续扩展不会破坏核心流程。"),
    ]:
        base.bullet(doc, f"{title}：{desc}")
    base.heading(doc, "2.3 软件总体流程", 2)
    base.add_pic(doc, fig["flow"], "图 2 软件总体流程图", 13.8)
    base.heading(doc, "2.4 软件体系结构", 2)
    base.add_pic(doc, fig["architecture"], "图 3 软件体系结构图", 15.7)

    base.heading(doc, "3.需求分析——功能建模", 1)
    base.heading(doc, "3.1 素材管理模块", 2)
    base.para(doc, "素材管理模块的核心是“无约束输入”。用户不需要预先判断素材类型或所属主题，系统只负责保存原始内容和状态。")
    base.add_pic(doc, fig["seq_material"], "图 4 新增素材并解析时序图", 15.7)
    base.heading(doc, "3.2 AI 解析模块", 2)
    base.para(doc, "AI 解析模块负责将单条原始素材转为结构化理解结果。解析结果不直接替代原文，而是作为后续体系化重构的中间层。")
    base.add_pic(doc, fig["seq_file"], "图 5 文件导入并解析时序图", 15.7)
    base.heading(doc, "3.3 体系化模块", 2)
    base.para(doc, "体系化模块读取当前用户已解析素材，调用 AI 生成知识体系 JSON，并按主题、分支、节点、引用、关系和版本的顺序落库。")
    base.add_pic(doc, fig["seq_system"], "图 6 一键体系化重构时序图", 15.7)
    base.heading(doc, "3.4 知识问答模块", 2)
    base.para(doc, "知识问答模块不是开放域聊天，而是从用户知识库中组织上下文，再调用 AI 回答。服务端不信任前端传入的素材上下文，而是根据当前用户重新读取数据库。")
    base.add_pic(doc, fig["seq_qa"], "图 7 知识问答时序图", 15.7)
    base.heading(doc, "3.5 数据导出模块", 2)
    base.para(doc, "导出模块支持 JSON 和 Markdown 两类结果。JSON 适合备份和迁移，Markdown 适合用户阅读、归档或导入其他知识工具。")
    base.add_pic(doc, fig["seq_export"], "图 8 数据导出时序图", 15.7)
    base.heading(doc, "3.6 状态与异常分析", 2)
    base.table(doc, ["对象", "状态", "说明", "异常处理"], [
        ["素材", "pending", "等待解析", "用户可手动触发解析。"],
        ["素材", "analyzing", "正在调用 AI", "超时或失败后转 failed。"],
        ["素材", "analyzed", "解析完成", "可参与体系化。"],
        ["素材", "failed", "解析失败", "允许重新解析。"],
        ["重构任务", "running", "正在体系化", "记录开始时间。"],
        ["重构任务", "completed", "体系化成功", "保存版本快照。"],
        ["重构任务", "failed", "体系化失败", "记录 error_message。"],
    ], [2.5, 2.5, 5.2, 5.2])


def design_doc(doc: Document, fig: dict[str, Path]) -> None:
    title_page(doc, "序知 AI 个人体系化知识库\n软件设计与实现文档")
    toc_page(doc, [
        "1.系统总体设计 ...................................................... 1",
        "1.1 设计原则 .................................................................................................................... 1",
        "1.2 总体架构 .................................................................................................................... 2",
        "2.数据库设计 ........................................................ 3",
        "2.1 数据表关系 ................................................................................................................ 3",
        "2.2 数据字典 .................................................................................................................... 4",
        "3.接口设计 .......................................................... 9",
        "3.1 用户接口 .................................................................................................................... 9",
        "3.2 AI 接口 ..................................................................................................................... 11",
        "3.3 知识接口 .................................................................................................................. 12",
        "4.模块设计 .......................................................... 14",
        "5.详细设计与实现 .................................................... 18",
        "6.代码结构说明 ...................................................... 30",
        "7.部署设计 .......................................................... 36",
    ])
    base.heading(doc, "1.系统总体设计", 1)
    base.heading(doc, "1.1 设计原则", 2)
    for item in [
        "分层原则：将原始素材层、AI 理解层和知识网络层分开设计。",
        "可追溯原则：任何知识节点都应能追溯来源素材。",
        "安全原则：用户身份由 Supabase Auth 管理，业务表使用 RLS。",
        "可扩展原则：多模态输入最终统一转为文本素材，便于后续扩展。",
        "简单可控原则：MVP 阶段体系化采用全量重建，降低实现复杂度。",
    ]:
        base.bullet(doc, item)
    base.heading(doc, "1.2 总体架构", 2)
    base.add_pic(doc, fig["architecture"], "图 9 系统总体架构图", 15.7)
    base.heading(doc, "2.数据库设计", 1)
    base.heading(doc, "2.1 数据表关系", 2)
    base.add_pic(doc, fig["er"], "图 10 核心数据表关系图", 15.7)
    base.heading(doc, "2.2 数据字典", 2)
    for caption, rows in [
        ("表 1 materials 数据字典", [["id", "uuid", "主键"], ["user_id", "uuid", "所属用户"], ["title", "text", "素材标题"], ["raw_content", "text", "原始内容"], ["source_type", "text", "素材来源"], ["status", "text", "处理状态"], ["created_at", "timestamptz", "创建时间"], ["updated_at", "timestamptz", "更新时间"]]),
        ("表 2 material_analysis 数据字典", [["id", "uuid", "主键"], ["material_id", "uuid", "关联素材"], ["core_meaning", "text", "核心含义"], ["useful_points", "jsonb", "有效信息"], ["redundant_points", "jsonb", "冗余信息"], ["topics", "jsonb", "主题"], ["knowledge_type", "text", "知识类型"], ["keywords", "jsonb", "关键词"], ["ai_model", "text", "使用模型"]]),
        ("表 3 material_chunks 数据字典", [["id", "uuid", "主键"], ["material_id", "uuid", "关联素材"], ["chunk_index", "integer", "分块序号"], ["content", "text", "分块内容"], ["embedding", "vector(1024)", "向量表示"]]),
        ("表 4 knowledge_topics 数据字典", [["id", "uuid", "主键"], ["user_id", "uuid", "所属用户"], ["parent_id", "uuid", "父主题"], ["title", "text", "主题标题"], ["description", "text", "主题说明"], ["level", "integer", "层级"], ["sort_order", "integer", "排序"]]),
        ("表 5 knowledge_nodes 数据字典", [["id", "uuid", "主键"], ["topic_id", "uuid", "所属主题"], ["title", "text", "节点标题"], ["content", "text", "节点内容"], ["summary", "text", "摘要"], ["node_type", "text", "节点类型"], ["version_id", "uuid", "版本号"]]),
        ("表 6 node_material_links 数据字典", [["id", "uuid", "主键"], ["node_id", "uuid", "知识节点"], ["material_id", "uuid", "来源素材"], ["chunk_id", "uuid", "来源分块"], ["relevance_score", "numeric", "相关度"]]),
        ("表 7 knowledge_edges 数据字典", [["id", "uuid", "主键"], ["source_node_id", "uuid", "源节点"], ["target_node_id", "uuid", "目标节点"], ["edge_type", "text", "关系类型"], ["description", "text", "关系说明"], ["confidence", "numeric", "置信度"]]),
        ("表 8 reconstruction_jobs 与 versions 数据字典", [["reconstruction_jobs.status", "text", "任务状态"], ["input_material_ids", "jsonb", "输入素材集合"], ["error_message", "text", "失败原因"], ["knowledge_versions.snapshot", "jsonb", "体系快照"], ["version_number", "integer", "版本号"]]),
    ]:
        base.table(doc, ["字段", "类型", "说明"], rows, [4.2, 3.5, 7.7], caption=caption)
    base.heading(doc, "3.接口设计", 1)
    endpoint_rows = [
        ["/api/materials", "GET", "查询素材列表"], ["/api/materials", "POST", "新增素材"],
        ["/api/materials/[id]", "GET", "查看素材详情"], ["/api/materials/[id]", "PATCH", "编辑素材"],
        ["/api/materials/[id]", "DELETE", "删除素材"], ["/api/analyze", "POST", "AI 单条解析"],
        ["/api/parse-file", "POST", "解析 PDF/Word 文件"], ["/api/ocr", "POST", "图片 OCR"],
        ["/api/transcribe", "POST", "音频转写"], ["/api/audio2text", "POST", "音频转文本"],
        ["/api/fetch-url", "POST", "抓取网页内容"], ["/api/systematize", "POST", "一键体系化"],
        ["/api/systematize", "GET", "查看重构任务"], ["/api/knowledge", "GET", "获取知识主题树"],
        ["/api/knowledge/nodes/all", "GET", "获取全部节点"], ["/api/knowledge/nodes/[id]", "GET/PATCH", "节点详情与更新"],
        ["/api/knowledge/node/[id]/materials", "GET", "节点来源素材"], ["/api/knowledge/edges/all", "GET", "全部知识关系"],
        ["/api/knowledge/edges/[nodeId]", "GET", "节点相关关系"], ["/api/knowledge/health", "GET", "知识库健康检查"],
        ["/api/knowledge/versions", "GET", "版本列表"], ["/api/knowledge/versions/[id]/diff", "GET", "版本差异"],
        ["/api/qa", "POST", "知识问答"], ["/api/search", "GET", "搜索素材和知识"],
        ["/api/export", "GET", "JSON 导出"], ["/api/export/markdown", "GET", "Markdown 导出"],
        ["/api/setup-storage", "POST", "初始化存储桶"],
    ]
    base.table(doc, ["接口", "方法", "功能"], endpoint_rows, [6.2, 2.5, 6.7], caption="表 9 主要接口设计表")
    base.heading(doc, "4.模块设计", 1)
    module_rows = [
        ["认证模块", "登录页、Supabase 客户端、Proxy", "完成登录、会话读取和页面保护。"],
        ["素材模块", "material-input、material-list、material-detail", "完成素材 CRUD 和状态展示。"],
        ["AI 模块", "ai/client、ai/request、ai/analyze、ai/systematize", "封装模型选择、Key 覆盖、解析和重构。"],
        ["知识模块", "knowledge-tree、knowledge-node-detail、knowledge-graph", "展示知识树、节点详情和关系。"],
        ["问答模块", "qa-chat、/api/qa", "组织知识上下文并生成回答。"],
        ["导出模块", "/api/export、/api/export/markdown", "导出用户完整数据和知识体系。"],
    ]
    base.table(doc, ["模块", "主要组成", "说明"], module_rows, [3.2, 5.5, 6.7], caption="表 10 模块设计表")
    base.heading(doc, "4.1 接口逐项说明", 2)
    for idx, (path, method, purpose) in enumerate(endpoint_rows, 1):
        base.heading(doc, f"4.1.{idx} {method} {path}", 3)
        base.bullet(doc, f"接口功能：{purpose}")
        base.bullet(doc, "调用位置：由前端页面、服务端组件或设置页操作触发。")
        base.bullet(doc, "权限要求：除公开登录相关流程外，业务接口均要求用户已登录，并在服务端读取 Supabase 当前用户。")
        base.bullet(doc, "输入数据：根据接口类型接收 JSON 请求体、URL 参数、文件表单或查询参数。")
        base.bullet(doc, "输出数据：统一返回 JSON 响应，导出接口返回可下载文本或结构化数据。")
        base.bullet(doc, "异常处理：未登录返回 401，数据库错误返回 500，业务条件不满足返回 400 或空状态提示。")
    base.heading(doc, "6.代码结构说明", 1)
    code_sections = [
        ("src/app", "Next.js App Router 页面、布局和 API Routes 所在目录。页面层负责路由结构，API 层负责服务端业务逻辑。"),
        ("src/app/(auth)/login", "登录页和 Magic Link 登录动作。该模块是用户进入系统的身份入口。"),
        ("src/app/(main)/workspace", "工作台页面。三栏结构承载素材输入、素材详情和知识树浏览。"),
        ("src/app/(main)/materials", "素材管理页面。用于素材列表、搜索、状态筛选和详情查看。"),
        ("src/app/(main)/knowledge", "知识体系页面。用于展示 AI 体系化结果、节点详情和知识关系。"),
        ("src/app/(main)/qa", "知识问答页面。用于向个人知识库提问并展示 AI 回答。"),
        ("src/app/(main)/settings", "设置页面。用于模型选择、API Key、导出和隐私说明。"),
        ("src/components/materials", "素材相关组件，包括输入框、列表、详情和状态徽章。"),
        ("src/components/knowledge", "知识树、节点详情和图谱组件。"),
        ("src/components/qa", "问答聊天组件。"),
        ("src/components/settings", "设置页主体组件。"),
        ("src/lib/ai", "AI 客户端、Prompt、请求封装、素材解析和体系化重构逻辑。"),
        ("src/lib/embeddings", "文本分块和向量生成逻辑。"),
        ("src/lib/supabase", "Supabase 浏览器端、服务端和中间件封装。"),
        ("supabase/migrations", "数据库扩展、数据表、RLS 策略、索引和触发器迁移文件。"),
        ("tools", "报告生成脚本和工程文档自动化工具。"),
    ]
    for idx, (path, desc) in enumerate(code_sections, 1):
        base.heading(doc, f"6.{idx} {path}", 2)
        base.para(doc, desc)
        base.table(doc, ["说明项", "内容"], [
            ["所属层次", "前端页面层 / 服务端接口层 / AI 能力层 / 数据持久层之一。"],
            ["维护重点", "保持职责单一，避免把 AI 处理、数据库操作和 UI 展示混杂在同一文件中。"],
            ["与核心目标关系", "共同服务于“原始素材入库—AI 理解—体系化重构—知识复用”的闭环。"],
        ], [3.4, 12.0], caption=f"表 10-{idx} {path} 结构说明")
    base.heading(doc, "7.部署设计", 1)
    base.para(doc, "项目 GitHub 仓库为 https://github.com/usedare/ordknow，线上部署地址为 https://ordknow.vercel.app。部署流程采用 GitHub 推送触发 Vercel 构建的方式，保证代码、构建产物和线上访问保持一致。")
    base.table(doc, ["部署项", "说明"], [
        ["GitHub 仓库", "https://github.com/usedare/ordknow"],
        ["Vercel 线上地址", "https://ordknow.vercel.app"],
        ["构建命令", "npm run build"],
        ["类型检查", "npm run lint"],
        ["环境变量", "Supabase URL、Supabase anon key、AI Provider key、Embedding key 等。"],
        ["数据库迁移", "按 supabase/migrations 中 00001 至 00007 顺序执行。"],
    ], [4.0, 11.4], caption="表 10-17 部署设计表")


def detailed_design_doc(doc: Document, fig: dict[str, Path]) -> None:
    base.heading(doc, "5.详细设计与实现", 1)
    sections = [
        ("1.素材入库详细设计", [
            "素材入库模块负责接收用户的自由输入。用户输入的内容可能没有标题、没有分段、存在重复或语序混乱，系统不要求用户整理，只负责保存事实来源。",
            "新增素材时，前端将 title、raw_content、source_type 发送给 /api/materials。服务端验证用户身份后写入 materials 表，默认状态为 pending。",
            "编辑素材时，系统只修改当前用户拥有的素材。删除素材时，数据库通过外键级联删除解析结果和分块数据，避免产生孤立记录。",
        ]),
        ("2.AI 单条解析详细设计", [
            "AI 单条解析的目标不是写文章，而是提取素材中已经存在的知识信息。系统 Prompt 明确要求不编造外部内容，不做无意义扩写。",
            "解析输出采用固定 JSON 字段：core_meaning、useful_points、redundant_points、topics、knowledge_type、keywords、related_hints。这样前端展示和数据库落库都可以保持稳定。",
            "解析成功后，系统将结果写入 material_analysis，并把素材状态改为 analyzed；解析失败则写入 failed，用户可以重新触发。",
        ]),
        ("3.体系化重构详细设计", [
            "体系化接口是系统核心。用户点击一键体系化后，系统创建 reconstruction_job，并读取当前用户所有 analyzed 素材和解析结果。",
            "MVP 阶段采用全量重建策略：重构前清空当前用户旧的知识节点和关系，然后写入新版主题、分支、节点、来源引用和版本快照。该策略简单、可控，适合课程项目和第一版产品验证。",
            "AI 返回的每个节点必须包含 source_material_ids。系统据此写入 node_material_links，使用户在知识节点页面可以查看原始素材依据。",
        ]),
        ("4.知识网络详细设计", [
            "知识网络由 knowledge_topics、knowledge_nodes、node_material_links 和 knowledge_edges 共同组成。topics 负责层级，nodes 负责内容，links 负责来源，edges 负责横向关系。",
            "当前实现会根据共同来源素材自动生成 related 边。同一条素材支撑多个节点时，这些节点之间天然存在关联。后续可由 AI 进一步判断 prerequisite、supports、contradicts 等关系。",
            "知识网络的价值在于让系统不只是生成树状目录，而是逐步形成可维护、可复用、可演化的个人知识结构。",
        ]),
        ("5.知识问答详细设计", [
            "问答接口由服务端读取当前用户的素材和知识节点，组织上下文后调用 AI。系统不直接信任前端传入的材料，避免用户伪造上下文读取他人数据。",
            "回答内容应基于用户知识库，不做无关闲聊。若知识库为空或上下文不足，应提示用户先录入素材或进行体系化。",
            "问答结果未来可通过 source_type='qa' 回存到 materials，使一次高质量问答成为知识网络的新素材。",
        ]),
        ("6.导出与设置详细设计", [
            "设置页负责模型选择、API Key 配置、隐私说明和数据导出。模型选择保存在前端配置中，请求时通过安全头传递到服务端。",
            "JSON 导出包含用户素材、解析结果、知识主题、节点、关系和版本，适合备份和迁移。Markdown 导出更适合阅读和提交作业附件。",
            "隐私说明强调用户数据存储在 Supabase 项目中，AI 调用会发送必要文本到模型服务，用户可选择自带 API Key。",
        ]),
        ("7.异常处理与安全设计", [
            "认证异常：未登录用户访问 API 时返回 401，受保护页面通过 Proxy 跳转登录页。",
            "AI 异常：模型调用失败、JSON 格式错误或网络错误时，接口返回错误并更新任务状态。",
            "数据库异常：写入失败时捕获错误并返回 500，体系化任务记录 error_message。",
            "权限安全：所有业务查询均带 user_id 过滤，数据库层启用 RLS，形成双重保护。",
        ]),
    ]
    for title, paragraphs in sections:
        base.heading(doc, title, 1)
        for text in paragraphs:
            base.para(doc, text)
        base.table(doc, ["设计项", "实现说明"], [
            ["输入", "来自前端页面、用户文件、AI 返回结果或数据库查询结果。"],
            ["处理", "服务端 API 负责身份验证、参数校验、业务编排和错误处理。"],
            ["输出", "返回 JSON 响应、更新数据库记录或生成导出文件。"],
            ["风险", "AI 输出不稳定、数据库写入失败、用户权限不足、素材量过大。"],
            ["处理策略", "结构化 Prompt、任务状态记录、RLS 隔离、素材数量限制和异常提示。"],
        ], [3.5, 11.9], caption=f"表 {title.split('.')[0]} 详细设计说明表")
        if title.startswith("3."):
            base.add_pic(doc, fig["seq_system"], "图 11 体系化重构详细时序图", 15.7)
        if title.startswith("5."):
            base.add_pic(doc, fig["seq_qa"], "图 12 知识问答详细时序图", 15.7)
    base.heading(doc, "8.核心代码实现说明", 1)
    implementation_files = [
        ("src/app/api/materials/route.ts", "素材列表查询与新增素材接口。该文件负责读取当前登录用户，按 user_id 查询或写入 materials。"),
        ("src/app/api/materials/[id]/route.ts", "素材详情、编辑和删除接口。该接口必须验证素材归属，避免跨用户访问。"),
        ("src/app/api/analyze/route.ts", "AI 单条解析接口。负责调用解析逻辑、保存 material_analysis、生成 chunks 并更新素材状态。"),
        ("src/app/api/systematize/route.ts", "一键体系化接口。负责创建 reconstruction_job，读取 analyzed 素材，调用 AI 体系化并落库。"),
        ("src/app/api/qa/route.ts", "知识问答接口。服务端读取当前用户素材和知识节点，组织上下文后调用 AI。"),
        ("src/app/api/knowledge/route.ts", "知识树接口。查询 topics、nodes 和 links，返回前端可渲染的树状结构。"),
        ("src/app/api/knowledge/edges/all/route.ts", "知识关系接口。返回当前用户的全部知识边，用于图谱展示。"),
        ("src/app/api/knowledge/health/route.ts", "知识库健康检查接口。检查重复、孤儿节点、无来源节点等问题。"),
        ("src/app/api/export/route.ts", "JSON 导出接口。读取用户完整数据并返回可备份的结构。"),
        ("src/app/api/export/markdown/route.ts", "Markdown 导出接口。将知识体系转换为便于阅读和迁移的文本。"),
        ("src/app/api/parse-file/route.ts", "文件解析接口。使用 pdf-parse、mammoth 等库把 PDF/Word 转为文本。"),
        ("src/app/api/ocr/route.ts", "OCR 接口。将图片中的文字识别为可入库素材。"),
        ("src/app/api/transcribe/route.ts", "音频转写接口。将音频内容转化为文本素材。"),
        ("src/lib/ai/client.ts", "AI 客户端封装。统一模型调用方式，降低业务接口与具体模型提供方耦合。"),
        ("src/lib/ai/request.ts", "AI 请求配置。读取用户自带 Key 和模型选择，形成服务端调用参数。"),
        ("src/lib/ai/prompts.ts", "Prompt 约束。规定 AI 不能脱离用户素材编造，必须输出结构化结果。"),
        ("src/lib/ai/analyze.ts", "单条素材解析逻辑。把原始素材转化为 MaterialAnalysisResult。"),
        ("src/lib/ai/systematize.ts", "体系化重构逻辑。把素材集合转化为 SystematizeResult。"),
        ("src/lib/embeddings/chunk.ts", "文本分块逻辑。控制 chunk 大小，为向量检索和长文本处理服务。"),
        ("src/lib/embeddings/client.ts", "Embedding 客户端。负责调用向量模型并处理失败兜底。"),
        ("src/components/workspace/workspace-layout.tsx", "工作台主布局。实现左素材、中详情、右知识树的核心使用界面。"),
        ("src/components/materials/material-input.tsx", "素材输入组件。承载用户无约束录入的第一入口。"),
        ("src/components/materials/material-list.tsx", "素材列表组件。展示素材状态、标题、时间和筛选结果。"),
        ("src/components/knowledge/knowledge-tree.tsx", "知识树组件。展示 AI 体系化后的主题和节点层级。"),
        ("src/components/knowledge/knowledge-node-detail.tsx", "节点详情组件。展示内容、来源素材和相关节点。"),
        ("src/components/qa/qa-chat.tsx", "问答组件。展示用户问题和 AI 回答。"),
        ("src/components/settings/settings-content.tsx", "设置组件。管理模型、Key、导出和隐私信息。"),
        ("src/types/index.ts", "核心业务类型。定义 Material、KnowledgeNode、KnowledgeEdge 等数据结构。"),
        ("src/proxy.ts", "Next.js 代理/中间件入口。负责受保护路由的会话检查。"),
    ]
    for idx, (path, desc) in enumerate(implementation_files, 1):
        base.heading(doc, f"8.{idx} {path}", 2)
        base.para(doc, desc)
        base.table(doc, ["设计维度", "说明"], [
            ["输入", "来自前端请求、数据库记录、用户会话或 AI 服务返回结果。"],
            ["处理", "完成身份验证、参数检查、业务编排、数据库读写或 UI 渲染。"],
            ["输出", "返回 JSON、更新数据库、刷新页面状态或生成用户可见内容。"],
            ["质量要求", "代码需要保持职责清晰，错误处理明确，不破坏原始素材事实源。"],
        ], [3.4, 12.0], caption=f"表 8-{idx} 核心实现说明")
    base.heading(doc, "9.AI Prompt 设计", 1)
    prompt_rules = [
        "你是“序知”的知识解析引擎，不是聊天助手。",
        "只能基于用户提供的原始素材提取真实存在的信息。",
        "不要添加原文没有的信息，不做外部编造。",
        "输出必须是结构化 JSON，字段必须稳定。",
        "体系化重构时必须保留 source_material_ids。",
        "优先生成“总—分—细”的层级结构。",
        "发现重复内容时合并，发现矛盾时保留来源而不是擅自消除。",
    ]
    for item in prompt_rules:
        base.bullet(doc, item)
    base.table(doc, ["Prompt 类型", "输入", "输出", "用途"], [
        ["单条解析 Prompt", "单条 raw_content", "MaterialAnalysisResult", "形成理解层，减少后续重构噪声。"],
        ["体系化 Prompt", "素材与解析结果集合", "SystematizeResult", "生成主题、分支、节点和来源引用。"],
        ["问答 Prompt", "用户问题与知识库上下文", "回答文本", "基于个人知识库复用知识。"],
        ["健康检查 Prompt", "知识节点和关系", "问题与建议", "发现重复、孤儿、无来源等风险。"],
    ], [3.5, 4.0, 4.2, 3.7], caption="表 9-1 AI Prompt 类型说明")
    base.heading(doc, "10.数据库安全策略实现", 1)
    rls_rows = [
        ["materials", "auth.uid() = user_id", "用户只能访问自己的原始素材。"],
        ["material_analysis", "auth.uid() = user_id", "用户只能访问自己的解析结果。"],
        ["material_chunks", "auth.uid() = user_id", "用户只能访问自己的素材分块。"],
        ["knowledge_topics", "auth.uid() = user_id", "用户只能访问自己的知识主题。"],
        ["knowledge_nodes", "auth.uid() = user_id", "用户只能访问自己的知识节点。"],
        ["node_material_links", "通过 knowledge_nodes 归属判断", "引用关系必须属于当前用户的节点。"],
        ["knowledge_edges", "auth.uid() = user_id", "知识关系按用户隔离。"],
        ["reconstruction_jobs", "auth.uid() = user_id", "重构任务按用户隔离。"],
        ["knowledge_versions", "auth.uid() = user_id", "版本快照按用户隔离。"],
    ]
    base.table(doc, ["数据表", "RLS 策略核心", "安全意义"], rls_rows, [4.0, 5.0, 6.4], caption="表 10-1 RLS 安全策略表")
    for table_name, rule, meaning in rls_rows:
        base.heading(doc, f"10.{rls_rows.index([table_name, rule, meaning]) + 1} {table_name} 权限设计", 2)
        base.para(doc, f"{table_name} 表的权限策略核心是“{rule}”。该策略的意义是：{meaning} 在服务端接口中，系统还会显式按 user_id 查询，形成应用层和数据库层的双重保护。")


def testing_manual(doc: Document, fig: dict[str, Path]) -> None:
    title_page(doc, "序知 AI 个人体系化知识库\n测试报告与用户使用说明书")
    toc_page(doc, [
        "1.测试目标 .......................................................... 1",
        "2.测试环境 .......................................................... 2",
        "3.功能测试 .......................................................... 3",
        "4.非功能测试 ........................................................ 8",
        "5.运行环境 .......................................................... 10",
        "6.用户使用说明 ...................................................... 12",
        "6.1 登录界面 .................................................................................................................. 12",
        "6.2 工作台界面 .............................................................................................................. 13",
        "6.3 素材界面 .................................................................................................................. 14",
        "6.4 知识体系界面 .......................................................................................................... 15",
        "6.5 问答界面 .................................................................................................................. 16",
        "6.6 设置界面 .................................................................................................................. 17",
    ])
    base.heading(doc, "1.测试目标", 1)
    base.para(doc, "本测试文档用于验证序知是否完成核心软件需求，重点检查素材入库、AI 解析、一键体系化、知识网络、问答和导出功能是否形成闭环。")
    base.add_pic(doc, fig["test"], "图 13 系统测试流程图", 13.5)
    base.heading(doc, "2.测试环境", 1)
    base.table(doc, ["项目", "配置"], [
        ["操作系统", "Windows，本地项目目录 D:\\OrdKnow"],
        ["前端框架", "Next.js 16.2.7，React 19.2.7"],
        ["开发语言", "TypeScript 6.0.3"],
        ["数据库", "Supabase PostgreSQL，pgvector"],
        ["验证命令", "npm run lint；npm run build"],
        ["验证结果", "TypeScript 检查通过；生产构建通过，输出 27 个页面/接口路由。"],
    ], [4.0, 11.4], caption="表 11 测试环境表")
    if "lint_output" in fig:
        base.add_pic(doc, fig["lint_output"], "图 14 npm run lint 类型检查真实输出", 15.7)
    if "build_output" in fig:
        base.add_pic(doc, fig["build_output"], "图 15 npm run build 生产构建真实输出", 15.7)
    if "http_checks_output" in fig:
        base.add_pic(doc, fig["http_checks_output"], "图 16 线上访问与未登录保护真实输出", 15.7)
    base.callout(
        doc,
        "测试口径说明",
        "本次报告只把能够由命令、HTTP 响应、GitHub 页面、Vercel 页面和 StarUML 导出文件证明的项目标为“通过”。需要登录态、真实测试账号、邮箱 Magic Link、Supabase 数据和 AI Key 才能完整执行的业务闭环，不写成已经通过，而标记为“待登录账号实测”或“代码路径已覆盖”。",
        "warn",
    )
    base.heading(doc, "3.功能测试", 1)
    rows = []
    tests = [
        ("TC-01", "登录页面", "访问 /login，输入邮箱", "能够发送 Magic Link"),
        ("TC-02", "路由保护", "未登录访问 /workspace", "跳转登录页"),
        ("TC-03", "新增素材", "输入标题和内容并保存", "列表出现 pending 素材"),
        ("TC-04", "编辑素材", "修改素材内容并保存", "updated_at 更新"),
        ("TC-05", "删除素材", "点击删除并确认", "素材从列表消失"),
        ("TC-06", "状态筛选", "选择 analyzed 状态", "仅展示已解析素材"),
        ("TC-07", "AI 解析", "对素材触发解析", "生成解析结果"),
        ("TC-08", "解析失败", "模拟 AI Key 错误", "状态变为 failed"),
        ("TC-09", "文件解析", "上传 PDF/Word", "抽取文本"),
        ("TC-10", "OCR", "上传图片", "返回识别文本"),
        ("TC-11", "音频转写", "上传音频", "返回转写文本"),
        ("TC-12", "一键体系化", "点击体系化按钮", "生成知识树"),
        ("TC-13", "无素材体系化", "无 analyzed 素材时触发", "返回提示"),
        ("TC-14", "知识节点详情", "点击节点", "显示内容和来源"),
        ("TC-15", "相关节点", "查看节点关系", "显示 related 节点"),
        ("TC-16", "版本列表", "打开历史记录", "显示版本号"),
        ("TC-17", "版本差异", "选择两个版本", "显示差异信息"),
        ("TC-18", "知识问答", "输入问题", "返回回答"),
        ("TC-19", "知识搜索", "输入关键词", "返回相关素材/节点"),
        ("TC-20", "JSON 导出", "点击导出 JSON", "下载数据文件"),
        ("TC-21", "Markdown 导出", "点击导出 Markdown", "下载 Markdown"),
        ("TC-22", "模型选择", "切换模型", "选择被保存"),
        ("TC-23", "API Key 配置", "输入用户 Key", "后续请求携带配置"),
        ("TC-24", "类型检查", "执行 npm run lint", "命令通过"),
        ("TC-25", "生产构建", "执行 npm run build", "构建通过"),
        ("TC-26", "登录失败处理", "输入无效邮箱或过期链接", "系统提示重新登录"),
        ("TC-27", "素材空内容校验", "提交空素材", "前端或接口拒绝提交"),
        ("TC-28", "长文本素材", "输入较长课程笔记", "系统正常保存并可分块"),
        ("TC-29", "粘贴资料入库", "粘贴网页资料", "source_type 可记录为 paste"),
        ("TC-30", "OCR 低质量图片", "上传模糊图片", "系统返回失败或可编辑文本"),
        ("TC-31", "文档格式错误", "上传不支持文件", "系统提示格式不支持"),
        ("TC-32", "AI Key 缺失", "清空模型 Key 后解析", "系统返回配置提示"),
        ("TC-33", "Embedding 失败", "模拟向量服务不可用", "素材解析流程不被整体阻断"),
        ("TC-34", "体系化素材上限", "准备超过 100 条素材", "系统按限制处理前 100 条"),
        ("TC-35", "节点来源引用", "打开知识节点详情", "显示来源素材列表"),
        ("TC-36", "节点重新生成", "点击节点重生成", "节点内容更新或返回错误提示"),
        ("TC-37", "知识健康检查", "访问健康检查入口", "显示重复/孤儿/无来源检查结果"),
        ("TC-38", "知识关系接口", "请求 edges/all", "返回当前用户节点关系"),
        ("TC-39", "搜索无结果", "输入不存在关键词", "显示空状态"),
        ("TC-40", "Markdown 导出内容", "导出 Markdown", "包含主题、节点和来源信息"),
        ("TC-41", "JSON 导出完整性", "导出 JSON", "包含素材、解析、节点、关系、版本"),
        ("TC-42", "设置模型切换", "切换不同模型", "前端保存选择并用于请求"),
        ("TC-43", "隐私说明展示", "打开设置页", "显示数据和 AI 调用说明"),
        ("TC-44", "未登录 API", "直接请求业务接口", "返回 Unauthorized"),
        ("TC-45", "跨用户数据隔离", "尝试访问他人 id", "接口不返回数据"),
        ("TC-46", "RLS 策略", "数据库层按 auth.uid 查询", "只能访问本人数据"),
        ("TC-47", "Vercel 首页访问", "打开 https://ordknow.vercel.app", "页面可访问"),
        ("TC-48", "Vercel 登录页访问", "打开 /login", "登录页正常显示"),
        ("TC-49", "GitHub 仓库", "访问 usedare/ordknow", "仓库存在且包含最新代码"),
        ("TC-50", "部署环境变量", "检查 Vercel 环境变量", "关键变量已配置"),
        ("TC-51", "数据库迁移顺序", "检查 migrations 文件", "00001 至 00007 顺序完整"),
        ("TC-52", "构建路由数量", "查看 build 输出", "包含主要页面和 API 路由"),
        ("TC-53", "移动宽度显示", "缩窄浏览器宽度", "页面不发生严重重叠"),
        ("TC-54", "按钮交互反馈", "点击保存、解析、导出按钮", "有 loading 或结果提示"),
        ("TC-55", "错误提示可读性", "模拟接口失败", "前端提示清楚"),
        ("TC-56", "数据删除级联", "删除素材", "相关解析和分块被清理"),
        ("TC-57", "版本号递增", "连续体系化两次", "version_number 递增"),
        ("TC-58", "共同来源建边", "同素材生成多个节点", "节点间生成 related 边"),
        ("TC-59", "用户退出", "退出登录", "返回登录页"),
        ("TC-60", "文档交付检查", "打开 DOCX/PDF", "页码、图表、表格正常"),
    ]
    status_map = {
        "TC-01": "部分通过：页面可访问；邮件链路待账号",
        "TC-02": "通过：未登录跳转登录页",
        "TC-24": "通过：lint 证据",
        "TC-25": "通过：build 证据",
        "TC-44": "通过：未登录保护",
        "TC-47": "通过：线上 200",
        "TC-48": "通过：线上 200",
        "TC-49": "通过：仓库可访问",
        "TC-51": "通过：迁移文件存在",
        "TC-52": "通过：27 路由",
        "TC-60": "通过：PDF 100 页",
    }
    code_covered = {"TC-26", "TC-27", "TC-28", "TC-29", "TC-31", "TC-32", "TC-33", "TC-34", "TC-38", "TC-39", "TC-40", "TC-41", "TC-42", "TC-43", "TC-45", "TC-46", "TC-50", "TC-53", "TC-54", "TC-55", "TC-56", "TC-57", "TC-58", "TC-59"}
    for tid, name, op, expect in tests:
        status = status_map.get(tid)
        if status is None:
            status = "代码路径已覆盖，待登录账号实测" if tid in code_covered else "待登录账号/API Key 实测"
        rows.append([tid, name, op, expect, status])
    base.table(doc, ["编号", "测试项", "操作步骤", "预期结果", "执行状态"], rows, [1.5, 2.3, 4.3, 3.9, 3.4], caption="表 12 功能测试用例矩阵")
    base.heading(doc, "3.1 测试执行记录", 2)
    base.table(doc, ["证据编号", "实测对象", "执行方式", "实际结果"], [
        ["E-01", "TypeScript 类型检查", "本地执行 npm run lint", "通过，输出已保存到 docs/evidence/lint.log。"],
        ["E-02", "生产构建", "本地执行 npm run build", "通过，Next.js 生成 27 个页面/接口路由。"],
        ["E-03", "线上入口", "HTTP GET https://ordknow.vercel.app/login", "返回 200，登录页可访问。"],
        ["E-04", "未登录保护", "HTTP 访问 /workspace、/materials、/api/materials、/api/knowledge", "最终跳转到 /login；POST 体系化接口返回 307。"],
        ["E-05", "GitHub 仓库", "访问 https://github.com/usedare/ordknow", "返回 200，代码和报告已推送。"],
        ["E-06", "StarUML 图表", "StarUML MCP 生成并通过本地 API 导出 PNG", "6 张核心图已嵌入报告，保留未注册水印。"],
    ], [1.8, 3.0, 5.3, 5.3], caption="表 13 自动化实测证据清单", variant="evidence")
    base.heading(doc, "3.2 已实测项目", 2)
    for item in [
        "类型检查与生产构建已经由命令行执行，日志和截图均进入 docs/evidence。该部分可证明项目至少在类型层和构建层没有阻塞性错误。",
        "线上首页和登录页已通过 HTTP 检查，/login 返回 200。由于根路径会进入登录保护，最终地址显示为 /login，符合当前认证设计。",
        "未登录访问受保护页面和部分接口时会被中间件导向登录页，POST 体系化接口返回 307。该结果说明线上部署已经启用认证保护。",
        "GitHub 仓库页面可访问，最终提交已经推送到 main 分支；StarUML 图表由 MCP 生成后导出为真实 PNG。"
    ]:
        base.bullet(doc, item)
    base.heading(doc, "3.3 需要登录态继续验收的项目", 2)
    base.callout(
        doc,
        "未写成“已通过”的原因",
        "素材新增、AI 解析、一键体系化、知识问答、节点重生成、JSON/Markdown 导出等核心业务流都需要 Supabase 登录态、测试账号、邮箱 Magic Link 和可用 AI Provider Key。当前没有测试账号凭证，因此报告中把这些项标记为“待登录账号/API Key 实测”，但代码路径、构建路由和接口保护已完成检查。",
        "info",
    )
    base.table(doc, ["业务流", "当前可验证证据", "后续完整验收动作"], [
        ["素材入库", "页面、API 路由和数据库表均存在；未登录保护生效。", "提供测试账号后新增一条素材，检查 materials 表和页面列表。"],
        ["AI 解析", "analyze 路由、Prompt、AI client、错误状态处理已进入构建。", "配置 AI Key 后触发解析，检查 material_analysis 与状态变化。"],
        ["体系化重构", "systematize 路由、topics/nodes/edges/version 写入逻辑通过构建。", "准备 analyzed 素材后执行一键体系化，检查知识树和版本快照。"],
        ["知识问答", "qa 路由和上下文组织逻辑通过构建；未登录 POST 被保护。", "登录后输入问题，核对回答是否引用个人知识库内容。"],
        ["导出", "export 与 export/markdown 路由在构建路由表中存在。", "登录后导出 JSON/Markdown，检查素材、节点、关系和版本是否完整。"],
    ], [2.6, 6.0, 6.8], caption="表 14 登录态业务流验收计划", variant="plain")
    base.heading(doc, "4.非功能测试", 1)
    for item in [
        "安全测试：验证未登录用户不能访问受保护接口，数据库 RLS 不允许跨用户读取。",
        "构建测试：执行 npm run build，确认 Next.js 生产构建通过。",
        "类型测试：执行 npm run lint，确认 TypeScript 类型检查通过。",
        "异常测试：模拟 AI Key 缺失、无 analyzed 素材、文件解析失败等情况。",
        "兼容测试：在 Chrome/Edge 浏览器中验证主要页面显示与交互。",
    ]:
        base.bullet(doc, item)
    base.heading(doc, "5.运行环境", 1)
    base.heading(doc, "5.1 硬件运行环境", 2)
    base.para(doc, "开发端建议使用 8GB 以上内存的 PC；生产端可部署在支持 Node.js 的云平台，数据库使用 Supabase 托管。")
    base.heading(doc, "5.2 软件运行环境", 2)
    for item in ["Node.js 与 npm", "Next.js", "Supabase", "PostgreSQL + pgvector", "AI Provider", "Embedding Provider"]:
        base.bullet(doc, item)
    base.heading(doc, "6.用户使用说明", 1)
    manual = [
        ("6.1 登录界面", ["输入邮箱。", "点击登录按钮。", "打开邮箱 Magic Link。", "完成验证后进入工作台。"]),
        ("6.2 工作台界面", ["左侧查看原始素材列表。", "中间输入或编辑当前素材。", "右侧查看 AI 体系化知识树。", "点击一键体系化生成新版知识体系。"]),
        ("6.3 素材界面", ["查看所有素材。", "使用搜索框检索素材。", "按 pending、analyzing、analyzed、failed 筛选。", "打开详情查看 AI 解析结果。"]),
        ("6.4 知识体系界面", ["展开一级主题和二级分支。", "点击知识节点查看内容。", "查看来源素材，确认 AI 输出依据。", "查看相关节点理解知识关联。"]),
        ("6.5 问答界面", ["输入关于个人知识库的问题。", "等待 AI 基于知识上下文回答。", "将有价值回答整理为后续素材。"]),
        ("6.6 设置界面", ["选择 AI 模型。", "配置用户自带 API Key。", "阅读隐私说明。", "导出 JSON 或 Markdown 数据。"]),
    ]
    for title, lines in manual:
        base.heading(doc, title, 2)
        base.bullet(doc, "包含内容")
        for i, line in enumerate(lines, 1):
            base.numbered(doc, line, i)
        base.bullet(doc, "功能介绍")
        base.para(doc, f"{title} 是序知核心操作流程中的一个页面，用户可按页面提示完成对应操作。")
    base.heading(doc, "7.页面功能验证记录", 1)
    page_checks = [
        ("/login", "登录页", "检查邮箱输入框、登录按钮、Magic Link 说明和未登录入口。"),
        ("/workspace", "工作台", "检查左侧素材列表、中间素材输入/详情、右侧知识体系树。"),
        ("/materials", "素材页", "检查素材列表、搜索框、状态筛选、素材详情和 AI 解析结果。"),
        ("/knowledge", "知识体系页", "检查一级主题、二级分支、知识节点、来源素材和相关节点。"),
        ("/qa", "问答页", "检查问题输入、AI 回答展示、知识库上下文提示。"),
        ("/settings", "设置页", "检查模型选择、API Key 配置、导出按钮和隐私说明。"),
        ("/api/materials", "素材接口", "检查登录用户素材查询和新增流程。"),
        ("/api/analyze", "解析接口", "检查 AI 解析输出字段是否完整。"),
        ("/api/systematize", "体系化接口", "检查任务创建、节点写入、版本保存和错误处理。"),
        ("/api/qa", "问答接口", "检查服务端上下文读取和 AI 回答返回。"),
        ("/api/export", "JSON 导出接口", "检查用户数据导出完整性。"),
        ("/api/export/markdown", "Markdown 导出接口", "检查知识体系文本导出格式。"),
    ]
    for idx, (route, name, check) in enumerate(page_checks, 1):
        base.heading(doc, f"7.{idx} {name}验证", 2)
        base.table(doc, ["验证项", "说明"], [
            ["访问路径", route],
            ["验证目标", check],
            ["数据准备", "使用当前 Supabase 项目、已配置环境变量和已有测试素材。"],
            ["预期表现", "页面或接口能按权限返回结果；异常时给出明确错误提示。"],
            ["截图要求", "最终文档中应放入本地页面或 Vercel 页面截图作为证据。"],
        ], [3.5, 11.9], caption=f"表 13-{idx} {name}验证记录")
        base.para(doc, f"{name}是序知系统交付验收的重要对象。验证时不仅检查页面是否能打开，还要检查它是否服务于“原始素材入库、AI 理解、体系化重构、知识复用”的核心闭环。")
    base.heading(doc, "8.GitHub 与 Vercel 部署验证", 1)
    deploy_steps = [
        ("8.1 GitHub 仓库检查", "确认远程仓库为 https://github.com/usedare/ordknow，当前分支为 main，提交内容包含项目源代码、Supabase 迁移、文档生成脚本和最终报告。"),
        ("8.2 本地构建验证", "在推送前执行 npm run lint 和 npm run build，确认类型检查与生产构建通过。"),
        ("8.3 推送流程", "通过 git add、git commit、git push origin main 将当前工作区推送到 usedare/ordknow 仓库。"),
        ("8.4 Vercel 自动部署", "Vercel 已绑定项目 https://ordknow.vercel.app，GitHub 推送后应触发自动构建或保持当前线上版本可访问。"),
        ("8.5 线上访问验证", "访问 https://ordknow.vercel.app 和 /login，确认页面能正常响应，并将截图作为测试证据。"),
        ("8.6 部署风险", "若 Vercel 环境变量缺失，登录或 AI 接口可能报错；文档中需记录环境变量和 Supabase 迁移要求。"),
    ]
    for title, desc in deploy_steps:
        base.heading(doc, title, 2)
        base.para(doc, desc)
        base.table(doc, ["检查点", "内容"], [
            ["证据形式", "命令输出截图、GitHub 页面截图、Vercel 部署页面截图或线上页面截图。"],
            ["通过标准", "仓库可访问，构建通过，线上页面可打开，关键配置已说明。"],
            ["记录位置", "测试报告与用户使用说明书的部署验证部分。"],
        ], [3.5, 11.9], caption=f"表 {title.split()[0]} 部署验证记录")
    base.heading(doc, "8.7 真实截图证据", 2)
    screenshot_specs = [
        ("github_repo", "图 17 GitHub 仓库真实页面截图"),
        ("vercel_home", "图 18 Vercel 线上首页真实截图"),
        ("vercel_login", "图 19 Vercel 登录页真实截图"),
    ]
    inserted = False
    for key, caption in screenshot_specs:
        if key in fig:
            base.add_pic(doc, fig[key], caption, 15.7)
            inserted = True
    staruml_keys = sorted(key for key in fig if key.startswith("staruml_"))
    for idx, key in enumerate(staruml_keys, 1):
        base.add_pic(doc, fig[key], f"图 {19 + idx} StarUML 图表真实截图 {idx}", 15.7)
        inserted = True
    if not inserted:
        base.para(doc, "当前未检测到可嵌入的页面截图文件。生成正式终稿前，应先运行页面截图流程，并将截图保存到 docs/evidence/screenshots 目录。")
    base.heading(doc, "9.截图证据索引", 1)
    base.table(doc, ["截图名称", "来源", "证明内容"], [
        ["npm run lint 输出图", "lint.log", "TypeScript 类型检查通过。"],
        ["npm run build 输出图", "build.log", "Next.js 生产构建通过，生成路由表。"],
        ["HTTP 检查输出图", "http_checks.log", "线上入口可访问，未登录访问进入登录保护。"],
        ["StarUML 总体流程图", "StarUML 当前项目", "证明流程图由 StarUML 绘制。"],
        ["StarUML 时序图组", "StarUML 当前项目", "证明核心业务时序图由 StarUML 绘制。"],
        ["StarUML ER 图", "StarUML 当前项目", "证明数据库关系图由 StarUML 绘制。"],
        ["GitHub 仓库截图", "usedare/ordknow", "代码已上传到指定仓库。"],
        ["Vercel 线上截图", "ordknow.vercel.app", "项目已部署并可访问。"],
        ["登录页截图", "本地或线上页面", "证明用户入口可访问。"],
        ["登录态页面截图", "需测试账号后补截", "未嵌入真实登录态截图，避免伪造。"],
    ], [3.8, 4.6, 7.0], caption="表 19 截图证据索引表", trailing_space=False)


def make_figures() -> dict[str, Path]:
    fig = base.figures()
    fig["seq_qa"] = base.seq("seq_qa.png", "知识问答时序图", ["用户", "问答页", "QA API", "数据库", "AI服务"], [
        ("用户", "问答页", "输入问题", False),
        ("问答页", "QA API", "POST /api/qa", False),
        ("QA API", "数据库", "读取素材和节点", False),
        ("QA API", "AI服务", "发送知识上下文", False),
        ("AI服务", "QA API", "返回回答", True),
        ("QA API", "问答页", "显示回答", True),
    ])
    fig["seq_export"] = base.seq("seq_export.png", "数据导出时序图", ["用户", "设置页", "Export API", "数据库"], [
        ("用户", "设置页", "点击导出", False),
        ("设置页", "Export API", "GET /api/export", False),
        ("Export API", "数据库", "读取用户数据", False),
        ("数据库", "Export API", "返回素材/节点/版本", True),
        ("Export API", "设置页", "返回下载文件", True),
    ])
    fig["seq_file"] = base.seq("seq_file.png", "文件导入并解析时序图", ["用户", "前端", "Parse API", "AI/OCR", "数据库"], [
        ("用户", "前端", "上传文件", False),
        ("前端", "Parse API", "POST /api/parse-file", False),
        ("Parse API", "AI/OCR", "抽取文本", False),
        ("AI/OCR", "Parse API", "返回文本", True),
        ("Parse API", "数据库", "保存为素材", False),
        ("Parse API", "前端", "返回素材状态", True),
    ])
    lint_img = evidence_image("lint_output.png", "npm run lint - TypeScript 类型检查输出", OUT / "evidence" / "lint.log")
    build_img = evidence_image("build_output.png", "npm run build - Next.js 生产构建输出", OUT / "evidence" / "build.log")
    http_img = evidence_image("http_checks_output.png", "线上访问与未登录保护 HTTP 检查输出", OUT / "evidence" / "http_checks.log")
    if lint_img:
        fig["lint_output"] = lint_img
    if build_img:
        fig["build_output"] = build_img
    if http_img:
        fig["http_checks_output"] = http_img
    screenshots = OUT / "evidence" / "screenshots"
    screenshot_files = {
        "github_repo": "github_repo.png",
        "vercel_home": "vercel_home.png",
        "vercel_login": "vercel_login.png",
    }
    for key, filename in screenshot_files.items():
        path = screenshots / filename
        if path.exists():
            fig[key] = path
    if screenshots.exists():
        for idx, path in enumerate(sorted(screenshots.glob("staruml_*.png")), 1):
            fig[f"staruml_{idx:02d}"] = path
    return fig


def build() -> None:
    global TITLE_PAGE_COUNT
    TITLE_PAGE_COUNT = 0
    OUT.mkdir(exist_ok=True)
    fig = make_figures()
    doc = Document()
    base.configure(doc)
    add_cover(doc, fig)
    requirements_acquisition(doc, fig)
    requirements_analysis(doc, fig)
    design_doc(doc, fig)
    detailed_design_doc(doc, fig)
    testing_manual(doc, fig)
    doc.save(DOCX)
    print(DOCX)


if __name__ == "__main__":
    build()
