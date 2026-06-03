# 序知｜工程版 PRD 与技术路线

## 1. 产品一句话

序知是一款 AI 个人体系化知识库：用户无序输入原始素材，AI 自动理解、归类、去重、排序、重构，最终生成持续生长的个人知识体系。

核心口号：

> 输入无序碎片，输出终身知识体系。

## 2. 产品定位

序知不是普通笔记软件，不是备忘录，不是文档编辑器，不是聊天机器人。

它的唯一核心是：

> 用户负责囤积原始素材，AI 负责建立知识秩序。

普通笔记软件要求用户自己分类、整理、排版、总结。
序知要求用户什么都不用整理，只要把乱素材丢进去。

## 3. 核心原则

1. 原始素材永远保留
   - AI 不覆盖、不改写、不删除用户原文。

2. AI 输出必须基于用户已有素材
   - 不做脱离知识库的外部编造。

3. 产品只服务“体系化”
   - 不做娱乐聊天、不做营销文案、不做无意义扩写。

4. 双视图是核心结构
   - 原始素材视图
   - AI 体系化视图

5. AI 的价值不是总结，而是重构秩序
   - 重点是归类、排序、建立层级、发现关联、形成知识链条。

## 4. MVP 功能范围

第一版只做核心闭环。

### 4.1 素材自由入库

用户可以输入：

- 一句话灵感
- 杂乱随笔
- 长段无排版文本
- 粘贴资料
- 学习笔记
- 观点片段
- 录音转写文本
- 图片 OCR 文本，后续支持

第一版先支持纯文本输入。

功能：

- 新增素材
- 查看素材列表
- 编辑原始素材
- 删除素材
- 标记素材处理状态

素材状态：

```text
pending      待解析
analyzing    解析中
analyzed     已解析
failed       解析失败
```

### 4.2 AI 单条解析

每条素材入库后，AI 自动解析：

- 核心含义
- 有效信息
- 冗余信息
- 主题领域
- 知识类型
- 关键词
- 可能关联方向

知识类型建议：

```text
concept      概念
method       方法
experience   经验
case         案例
question     问题
idea         灵感
quote        摘录
summary      总结
task         待办/行动
```

### 4.3 AI 体系化重构

用户点击“一键体系化”，AI 将当前知识库中的素材重构为知识体系。

AI 要完成：

- 自动聚类主题
- 自动生成一级主题
- 自动生成二级分支
- 自动组织知识顺序
- 自动去重
- 自动统一表达
- 自动保留素材引用
- 自动生成知识节点

输出结构：

```text
一级主题
  二级分支
    知识节点
      核心内容
      来源素材
      关联节点
```

### 4.4 双视图

#### 原始素材视图

展示所有原始输入。

重点：

- 时间顺序
- 保留原文
- 可搜索
- 可按状态筛选

#### AI 体系化视图

展示 AI 重构后的知识体系。

重点：

- 树状结构
- 主题分层
- 节点详情
- 来源引用
- 版本历史

### 4.5 重构历史

每次 AI 重构都生成一个版本。

用户可以查看：

- 第几次重构
- 重构时间
- 使用了哪些素材
- 生成了哪些主题
- 当前版本 / 历史版本

## 5. 页面设计

第一版建议只有 4 个页面。

### 5.1 工作台 `/workspace`

核心页面。

布局建议：

```text
左侧：原始素材列表
中间：素材输入 / 当前素材详情
右侧：AI 体系树
```

顶部按钮：

- 新增素材
- 一键体系化
- 原始视图
- 体系视图
- 重构历史

### 5.2 原始素材页 `/materials`

功能：

- 素材列表
- 搜索
- 状态筛选
- 新增 / 编辑 / 删除
- 查看 AI 解析结果

### 5.3 知识体系页 `/knowledge`

功能：

- 查看主题树
- 查看节点详情
- 查看来源素材
- 查看关联节点
- 展开 / 折叠层级

### 5.4 设置页 `/settings`

第一版只需要：

- API Key 设置，若用户自带 key
- 模型选择
- 数据导出
- 隐私说明

## 6. 推荐技术栈

### 前端

```text
Next.js
React
TypeScript
Tailwind CSS
shadcn/ui
Lucide Icons
```

### 后端

第一版可直接用：

```text
Next.js API Routes / Server Actions
```

后续复杂后再拆：

```text
NestJS / FastAPI
```

### 数据库

推荐：

```text
PostgreSQL + pgvector
```

如果想快速上线：

```text
Supabase
```

Supabase 的好处：

- 自带 Postgres
- 支持 pgvector
- 自带 Auth
- 自带 Storage
- 部署快

### AI

推荐：

```text
OpenAI API
Embeddings
Structured Outputs
RAG
```

第一版不建议微调模型。

## 7. 数据库表结构

### 7.1 users

```sql
id uuid primary key
email text
name text
created_at timestamp
updated_at timestamp
```

### 7.2 materials

原始素材表。

```sql
id uuid primary key
user_id uuid references users(id)
title text
raw_content text not null
source_type text
status text
created_at timestamp
updated_at timestamp
```

`source_type` 示例：

```text
manual
paste
ocr
audio_transcript
imported_doc
```

### 7.3 material_chunks

素材分块表。

```sql
id uuid primary key
material_id uuid references materials(id)
user_id uuid references users(id)
chunk_index integer
content text
embedding vector(1536)
created_at timestamp
```

### 7.4 material_analysis

单条素材 AI 解析结果。

```sql
id uuid primary key
material_id uuid references materials(id)
user_id uuid references users(id)
core_meaning text
useful_points jsonb
redundant_points jsonb
topics jsonb
knowledge_type text
keywords jsonb
related_hints jsonb
ai_model text
created_at timestamp
```

### 7.5 knowledge_topics

AI 生成的一级 / 二级主题。

```sql
id uuid primary key
user_id uuid references users(id)
parent_id uuid references knowledge_topics(id)
title text
description text
level integer
sort_order integer
created_at timestamp
updated_at timestamp
```

### 7.6 knowledge_nodes

知识节点。

```sql
id uuid primary key
user_id uuid references users(id)
topic_id uuid references knowledge_topics(id)
title text
content text
summary text
sort_order integer
node_type text
created_at timestamp
updated_at timestamp
```

### 7.7 node_material_links

知识节点与原始素材引用关系。

```sql
id uuid primary key
node_id uuid references knowledge_nodes(id)
material_id uuid references materials(id)
chunk_id uuid references material_chunks(id)
relevance_score numeric
created_at timestamp
```

### 7.8 reconstruction_jobs

AI 重构任务。

```sql
id uuid primary key
user_id uuid references users(id)
status text
scope text
input_material_ids jsonb
started_at timestamp
finished_at timestamp
error_message text
created_at timestamp
```

状态：

```text
queued
running
completed
failed
```

### 7.9 knowledge_versions

体系版本。

```sql
id uuid primary key
user_id uuid references users(id)
job_id uuid references reconstruction_jobs(id)
version_number integer
snapshot jsonb
summary text
created_at timestamp
```

## 8. AI Prompt 设计

### 8.1 单条素材解析 Prompt

系统角色：

```text
你是“序知”的知识解析引擎。
你的任务不是聊天，不是扩写，不是创作。
你只能基于用户提供的原始素材，提取其中真实存在的知识信息。
不要编造外部内容。
不要添加原文没有的信息。
输出必须结构化。
```

用户输入：

```text
请解析以下原始素材：

{{raw_content}}
```

输出 JSON：

```json
{
  "core_meaning": "这条素材的核心含义",
  "useful_points": ["有效信息1", "有效信息2"],
  "redundant_points": ["冗余信息1"],
  "topics": ["主题1", "主题2"],
  "knowledge_type": "concept | method | experience | case | question | idea | quote | summary | task",
  "keywords": ["关键词1", "关键词2"],
  "related_hints": ["可能关联方向1", "可能关联方向2"]
}
```

### 8.2 体系化重构 Prompt

系统角色：

```text
你是“序知”的个人知识体系重构引擎。

你的唯一任务是：
将用户杂乱、无序、重复、碎片化的原始素材，重构为清晰、有层级、有逻辑顺序的个人知识体系。

规则：
1. 只能使用用户已有素材。
2. 不得编造外部知识。
3. 不做无意义扩写。
4. 必须保留每个知识节点对应的来源素材 ID。
5. 优先建立“总-分-细”的层级结构。
6. 自动去重、合并相似内容。
7. 自动修正混乱语序和颠倒逻辑。
8. 输出要清晰、严谨、成体系。
```

输入：

```text
以下是用户的原始素材及解析结果：

{{materials_with_analysis}}

请将它们重构为个人知识体系。
```

输出 JSON：

```json
{
  "system_title": "本次生成的知识体系名称",
  "summary": "整体体系说明",
  "topics": [
    {
      "title": "一级主题",
      "description": "主题说明",
      "children": [
        {
          "title": "二级分支",
          "description": "分支说明",
          "nodes": [
            {
              "title": "知识节点标题",
              "content": "整理后的知识内容",
              "source_material_ids": ["material_id_1", "material_id_2"],
              "node_type": "concept | method | experience | case | question | idea | summary"
            }
          ]
        }
      ]
    }
  ]
}
```

## 9. AI 处理流程

### 9.1 新增素材流程

```text
用户输入原始素材
→ 保存 materials
→ 拆分 material_chunks
→ 生成 embedding
→ 调用 AI 单条解析
→ 保存 material_analysis
→ 更新素材状态 analyzed
```

### 9.2 一键体系化流程

```text
用户点击一键体系化
→ 创建 reconstruction_job
→ 读取用户全部或选定素材
→ 读取 material_analysis
→ 向量检索相似素材
→ AI 聚类主题
→ AI 生成知识体系 JSON
→ 写入 knowledge_topics
→ 写入 knowledge_nodes
→ 写入 node_material_links
→ 保存 knowledge_versions
→ job 标记 completed
```

## 10. MVP 验收标准

第一版完成后，必须能做到：

1. 用户输入 10 条非常乱的素材。
2. 系统保留原始素材。
3. AI 能逐条提炼核心含义。
4. 用户点击“一键体系化”。
5. 系统生成一个有一级主题、二级分支、知识节点的结构。
6. 每个知识节点能看到来源素材。
7. 用户能在原始素材视图和 AI 体系视图之间切换。
8. AI 输出不明显编造用户没有提供的内容。

## 11. 第一阶段不要做的功能

先不要做：

- 社交
- 多人协作
- 知识图谱炫酷动画
- 聊天机器人
- 模板市场
- 公开分享
- 移动端 App
- 浏览器插件
- 复杂 Markdown 编辑器
- 自动外网搜索
- AI 写文章

这些都不是序知第一阶段的核心。

## 12. 后续版本路线

### V0.1 原型版

目标：验证“乱素材 → 体系化结果”。

功能：

- 文本输入
- 素材列表
- AI 单条解析
- 一键体系化
- 双视图

### V0.2 可用版

目标：能长期使用。

增加：

- 搜索
- 版本历史
- 节点编辑
- 手动重新生成
- 数据导出

### V0.3 增强版

目标：支持更多素材来源。

增加：

- 图片 OCR
- 录音转写
- PDF / Word 导入
- 网页剪藏

### V1.0 正式版

目标：成为完整个人知识体系软件。

增加：

- 本地优先存储
- 桌面版
- 自动周期重构
- 专题演化记录
- 知识体系导出
- 隐私与备份能力

## 13. 给 Claude 的开发指令

```text
我要开发一个叫“序知”的 AI 个人体系化知识库软件。

产品核心：
用户无序输入原始素材，AI 自动理解、归类、去重、排序、重构，最终生成个人知识体系。

请不要把它做成普通笔记软件，也不要做成聊天机器人。
核心是：
1. 原始素材入库
2. AI 单条解析
3. AI 全库体系化重构
4. 原始素材视图 / AI 体系化视图双视图
5. 每个 AI 知识节点必须引用来源素材

技术栈建议：
Next.js + TypeScript + Tailwind CSS + shadcn/ui + PostgreSQL + pgvector + OpenAI API。

请先实现 MVP：
- 文本素材输入
- 素材列表
- AI 解析接口
- 一键体系化接口
- 知识体系树展示
- 原始素材和体系化成果双视图
- 数据库表结构按 materials、material_chunks、material_analysis、knowledge_topics、knowledge_nodes、node_material_links、reconstruction_jobs、knowledge_versions 设计。

AI 不允许脱离用户素材编造。
AI 输出必须使用结构化 JSON。
```

## 14. 项目共识

以后只要提到“序知”，默认理解为：

> 一个以“AI 全自动体系化重构”为唯一核心的个人知识库软件，而不是普通笔记、文档或聊天工具。

## 15. Karpathy LLM Knowledge Base 思路借鉴

### 15.1 核心启发

Karpathy 的 LLM Knowledge Base 思路，重点不是让 AI 做一次性问答，而是让 AI 把原始资料持续“编译”为一个可阅读、可维护、可互链的个人 wiki。

它的关键思想：

- 用户只负责把资料丢进原始区。
- LLM 不只是总结，而是把资料编译成结构化知识页。
- 知识页之间通过双向链接、引用、主题索引形成网络。
- 每次新增资料后，AI 更新已有知识页，而不是永远新建孤立笔记。
- 问答产生的新洞察可以回存进知识库。
- AI 定期检查知识库健康状态：断链、重复、矛盾、孤儿节点、过期内容。

这和“序知”的核心非常契合，但需要注意：“序知”的产品重心仍然是“个人知识体系化”，不是单纯复制 Obsidian 或文件夹式 wiki。

### 15.2 对序知的产品升级

序知应从“AI 体系化视图”升级为：

> AI 持续维护的个人知识网络。

也就是说，AI 不只是生成一版知识体系，而是长期维护这个体系：

- 新素材进入时，判断它属于已有主题还是新主题。
- 如果属于已有主题，更新原有知识节点。
- 如果产生新概念，创建新节点。
- 如果与旧知识有关，建立交叉引用。
- 如果与旧知识矛盾，标记冲突。
- 如果暴露知识缺口，生成待补全问题。

### 15.3 三层架构

借鉴 Karpathy 的 `raw/ → wiki/ → schema` 思路，序知可设计为三层：

#### 第一层：原始素材层

对应 Karpathy 的 `raw/`。

特点：

- 原始素材永久保留。
- 用户可随便输入、粘贴、导入。
- AI 不直接改写这一层。
- 这是用户知识库的事实来源。

在数据库中对应：

- `materials`
- `material_chunks`
- `material_analysis`

#### 第二层：AI 知识网络层

对应 Karpathy 的 `wiki/`。

特点：

- AI 自动生成主题页、知识节点、节点关系。
- 每个节点必须引用来源素材。
- 节点之间允许建立关联、前置关系、补充关系、冲突关系。
- 用户主要阅读和使用的是这一层。

在数据库中对应：

- `knowledge_topics`
- `knowledge_nodes`
- `node_material_links`
- 新增建议表：`knowledge_edges`

#### 第三层：规则手册层

对应 Karpathy 的 `CLAUDE.md` / schema file。

特点：

- 规定 AI 如何整理、如何引用、如何合并、如何命名。
- 可理解为“序知 AI 的工作手册”。
- 第一版可以内置，后续允许用户个性化配置。

在数据库中可新增：

- `ai_rules`
- `user_ai_preferences`

### 15.4 新增数据库表建议

#### knowledge_edges

知识节点之间的关系表。

```sql
id uuid primary key
user_id uuid references users(id)
source_node_id uuid references knowledge_nodes(id)
target_node_id uuid references knowledge_nodes(id)
edge_type text
description text
confidence numeric
created_at timestamp
updated_at timestamp
```

`edge_type` 示例：

```text
related       相关
prerequisite  前置知识
supports      支撑
contradicts   矛盾
extends       延伸
example_of    示例
part_of       隶属
duplicate     近似重复
```

#### ai_rules

AI 工作规则表。

```sql
id uuid primary key
user_id uuid references users(id)
name text
rule_type text
content text
enabled boolean
created_at timestamp
updated_at timestamp
```

`rule_type` 示例：

```text
classification
formatting
rewriting
linking
citation
maintenance
```

#### knowledge_health_reports

知识库健康检查报告表。

```sql
id uuid primary key
user_id uuid references users(id)
status text
duplicate_nodes jsonb
orphan_nodes jsonb
contradictions jsonb
missing_links jsonb
stale_nodes jsonb
suggestions jsonb
created_at timestamp
```

### 15.5 新增核心功能

#### 1. 知识网络构建

每次素材入库后，AI 不仅解析内容，还要判断：

- 是否属于已有主题
- 是否应更新已有节点
- 是否需要创建新节点
- 与哪些节点有关
- 关系类型是什么
- 是否存在冲突或重复

新增处理流程：

```text
新素材入库
→ AI 单条解析
→ 向量检索相似节点
→ 判断节点合并 / 新建 / 更新
→ 建立 knowledge_edges
→ 更新知识体系版本
```

#### 2. 问答回存

用户提问后，AI 基于知识网络回答。

如果回答中产生了有价值的新结构，可以回存：

- 新总结
- 新关联
- 新知识节点
- 新待补全问题
- 新专题页

流程：

```text
用户提问
→ 检索相关节点和来源素材
→ AI 生成带引用回答
→ 用户点击“存入知识库”
→ AI 将回答拆解为知识节点 / 关系 / 补充说明
→ 写入知识网络层
```

#### 3. 知识库健康检查

AI 定期检查：

- 重复节点
- 孤儿节点
- 没有来源引用的节点
- 互相矛盾的节点
- 长期未更新的节点
- 主题过大需要拆分
- 主题过小需要合并

流程：

```text
定期触发
→ 读取知识主题、节点、关系
→ AI 生成健康报告
→ 保存 knowledge_health_reports
→ 用户选择是否执行优化
```

#### 4. AI 工作手册

第一版内置规则：

```text
1. 所有 AI 知识节点必须有来源素材。
2. 不允许脱离素材编造。
3. 合并节点时保留所有来源引用。
4. 发现矛盾时标记，不要擅自消除矛盾。
5. 新内容优先更新已有节点，其次才创建新节点。
6. 节点标题要稳定、简洁、可复用。
7. 知识体系要保持“总-分-细”结构。
```

后续可开放给用户自定义，例如：

```text
数学内容优先归入“理科学习”。
工作复盘统一整理为“背景-问题-行动-结果-反思”。
读书笔记统一整理为“核心观点-论据-案例-可迁移方法”。
```

### 15.6 对原技术路线的修正

Karpathy 思路强调“个人规模下，完整编译后的 wiki 可能可以直接放进长上下文，不一定需要 RAG”。

但序知作为产品，不建议完全放弃向量检索。更稳妥的路线是：

```text
数据库结构化知识网络 + Markdown/wiki 风格内容 + 向量检索辅助
```

原因：

- 序知需要长期扩展，不一定永远是小规模。
- 需要支持多用户，每个用户知识量不同。
- 需要做搜索、节点关联、相似内容判断。
- 需要做版本、权限、审计和数据导出。
- 纯文件夹 wiki 对产品化不够稳定。

所以序知可以吸收 Karpathy 的“知识编译”思想，但工程实现采用混合架构：

```text
原始素材表
→ AI 编译为知识节点
→ 节点之间建立关系
→ 生成可导出的 Markdown/wiki
→ 用 pgvector 做相似检索和关联发现
→ 用健康检查维持知识网络质量
```

### 15.7 MVP 调整建议

原 MVP 保持不变，但增加两个轻量能力：

1. 知识节点关联
   - 每个知识节点展示“相关节点”。
   - 第一版可以只做 related 关系。

2. AI 健康检查入口
   - 第一版只检查：
     - 重复内容
     - 孤儿节点
     - 无来源节点

不要第一版就做复杂可视化图谱。

图谱可以后续做，但第一版更重要的是：

> AI 是否真的能把乱素材持续编译成越来越好的知识体系。

