# 序知 (OrdKnow)

AI 个人体系化知识库 —— 用户无序输入原始素材，AI 自动理解、归类、去重、重构为持续生长的知识体系。

> 输入无序碎片，输出终身知识体系。

[![线上地址](https://img.shields.io/badge/线上-ordknow.vercel.app-blue)](https://ordknow.vercel.app) [![GitHub](https://img.shields.io/badge/GitHub-usedare/ordknow-black)](https://github.com/usedare/ordknow)

## 设计借鉴

本项目借鉴了 **Andrej Karpathy** 提出的 **LLM Knowledge Base** 设计思想，在此基础上做了工程化实现和产品化改造。

### Karpathy 的核心理念

| 理念 | 说明 |
|------|------|
| 三层架构 | `raw/`（原始资料）→ `wiki/`（编译后的知识页）→ `schema`（AI 工作规则） |
| 用户只囤不整 | 用户负责把资料丢进原始区，不承担分类、排版、组织工作 |
| LLM 编译知识 | LLM 不是做摘要，而是把资料持续"编译"成结构化知识页 |
| 知识网络 | 知识页之间通过双向链接、引用、主题索引形成网络 |
| 增量更新 | 新资料进入时更新已有知识页，不是永远新建孤立笔记 |
| 健康检查 | AI 定期检查重复、矛盾、过期、孤儿节点 |

### 序知的应用方式

```
Karpathy 层         序知实现
─────────────────────────────────────────
raw/          →     materials 表（原始素材永久保留）
wiki/         →     knowledge_nodes + knowledge_topics（AI 编译后的知识体系）
schema        →     AI Prompt 系统（内置规则：不编造、保留来源、去重）
双向链接       →     knowledge_edges 表（8 种关系类型）
健康检查       →     GET /api/knowledge/health（重复/孤儿/无来源节点检测）
```

### 序知的不同点

| Karpathy 方案 | 序知的改造 |
|---------------|-----------|
| 本地文件夹 + Markdown 文件 | Web 应用 + PostgreSQL，支持多用户、在线访问 |
| 纯文本知识页 | 5 种输入方式（文本/图片/音频/网页/文件）统一进入素材层 |
| 概念验证级 | 完整工程实现：认证、权限、API、部署、导出 |
| 单人使用 | 多用户隔离（RLS 策略 + Supabase Auth） |
| 文件系统 | 数据库 + pgvector 向量检索，支持语义搜索和知识关联 |

---

## 目录

- [设计借鉴](#设计借鉴)
- [为什么需要序知](#为什么需要序知)
- [功能概览](#功能概览)
- [页面截图](#页面截图)
- [技术架构](#技术架构)
- [快速开始](#快速开始)
- [项目结构](#项目结构)
- [数据库设计](#数据库设计)
- [API 接口](#api-接口)
- [部署](#部署)
- [常见问题](#常见问题)

---

## 为什么需要序知

普通笔记软件要求用户自己分类、整理、排版。但大多数人在积累知识的过程中，只是不断地"囤"素材——课程笔记、读书摘录、灵感片段、会议纪要——很少人有精力去整理它们。

序知的设计理念是：**用户只管囤素材，AI 负责建立秩序。**

用户把碎片文本丢进去，AI 自动：
1. 读懂每条素材的核心含义
2. 提取主题和关键词
3. 发现素材之间的关联
4. 重构为一个有层级、有逻辑的知识体系

---

## 功能概览

### 素材入库（5 种输入方式）

| 方式 | 说明 |
|------|------|
| 文本输入 | 手动输入或粘贴任意文本 |
| 图片识别 | 上传图片，AI 识别图中的文字（需多模态模型支持） |
| 文件导入 | 上传 PDF/Word/TXT，自动提取文本 |
| 音频转写 | 上传录音，通过火山引擎将语音转为文字 |
| 网页剪藏 | 输入网址，通过 Jina Reader 抓取网页正文 |

### AI 解析

每条素材入库后，AI 自动分析并输出：
- **核心含义**：一句话概括素材内容
- **有效信息**：素材中包含的有价值知识点
- **冗余信息**：可以忽略的无关内容
- **主题领域**：素材涉及的学科或领域
- **知识类型**：概念/方法/经验/案例/问题/灵感等
- **关键词**：便于检索的标签

解析结果不会覆盖原始素材，两者独立存储。

### 一键体系化

点击"一键体系化"后，AI 会读取你所有的素材，自动：

1. 合并相似内容、去除重复
2. 生成一级主题和二级分支
3. 在每个分支下创建知识节点
4. 给每个节点标注来源素材（可追溯）
5. 保存为一次版本快照

最终输出一个"主题 → 分支 → 节点"的树状知识体系。

### 知识网络

- 节点之间自动建立关联关系（相关/前置/支撑/矛盾/延伸等）
- 支持查看任意节点的"来源素材"和"相关节点"
- 健康检查：检测重复节点、孤儿节点、无来源节点

### 知识问答（RAG）

基于你个人知识库的问答功能：
- 输入问题，AI 从你的素材中搜索相关内容
- 回答时引用来源素材编号
- 不会编造知识库中没有的信息
- 支持将问答结果回存为素材

### 多用户隔离

每个注册用户拥有完全独立的知识库空间，互不可见。数据库层面通过 RLS（行级安全）策略保证隔离。

---

## 页面截图

| 页面 | 说明 |
|------|------|
| 登录页 | 邮箱密码登录 + 注册 |
| 工作台 | 三栏布局：素材列表 / 输入详情 / 知识体系 |
| 素材管理 | 素材搜索、状态筛选、AI 解析结果查看 |
| 知识体系 | 主题树、节点详情、来源追溯 |
| 知识问答 | 基于知识库的问答对话 |
| 设置 | 模型选择、API Key 配置、数据导出 |

---

## 技术架构

```
┌─────────────┐    ┌──────────────┐    ┌────────────────┐
│   浏览器端    │────│  Next.js API │────│  Supabase      │
│  React 19    │    │  Routes      │    │  PostgreSQL    │
│  Tailwind    │    │  Server      │    │  + pgvector    │
│  shadcn/ui   │    │  Actions     │    │  + Auth        │
└─────────────┘    └──────┬───────┘    └────────────────┘
                          │
                 ┌────────┴────────┐
                 │   AI 服务层      │
                 │  DeepSeek (文本) │
                 │  SiliconFlow     │
                 │  (向量 Embedding)│
                 │  火山引擎 (语音) │
                 └─────────────────┘
```

### 技术栈详情

| 层级 | 技术选型 | 说明 |
|------|----------|------|
| 前端框架 | Next.js 15 (App Router) | 服务端渲染 + 客户端交互 |
| UI 库 | React 19 + Tailwind CSS + shadcn/ui | 组件化 + 原子化样式 |
| 编程语言 | TypeScript | 类型安全 |
| 后端 | Next.js API Routes + Server Actions | 全栈一体 |
| 数据库 | Supabase (PostgreSQL) | 托管数据库 + 内置认证 |
| 向量检索 | pgvector 扩展 | 存储文本向量，支持相似度搜索 |
| 认证 | Supabase Auth | 邮箱密码登录，会话管理 |
| AI 文本 | DeepSeek API | 素材解析、体系化、问答 |
| AI 向量 | SiliconFlow (BAAI/bge-m3) | 文本向量化，1024 维 |
| 语音转写 | 火山引擎 (豆包语音 2.0) | 录音文件识别 |
| 网页抓取 | Jina Reader | 将网页转为纯文本 |
| 文档解析 | pdf-parse + mammoth | PDF/Word 文本提取 |
| 部署 | Vercel | 自动构建、CDN 分发 |

---

## 快速开始

### 前提条件

- Node.js 18+
- Supabase 账号（[免费注册](https://supabase.com)）
- DeepSeek API Key（[获取地址](https://platform.deepseek.com)）
- SiliconFlow API Key（[免费注册](https://siliconflow.cn)），用于 Embedding
- 火山引擎 API Key（可选，用于音频转写）

### 1. 克隆项目

```bash
git clone https://github.com/usedare/ordknow.git
cd ordknow
npm install
```

### 2. 创建 Supabase 项目

1. 登录 [Supabase](https://supabase.com)，创建新项目
2. 进入 SQL Editor
3. 按顺序运行 `supabase/migrations/` 目录下的 7 个 SQL 文件
4. 在 Authentication → Settings 中：
   - 关闭 "Confirm email"（开发阶段建议关闭）
   - Site URL 设为 `http://localhost:3000`

### 3. 创建 Supabase Storage Bucket

在 Storage 页面创建名为 `ordknow-public` 的公开 Bucket，用于存放音频转写时的临时文件。

### 4. 配置环境变量

```bash
cp .env.local.example .env.local
```

编辑 `.env.local`，填入你的配置：

```env
# Supabase（必填）
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# DeepSeek AI（必填）
DEEPSEEK_API_KEY=sk-xxxxxxxx

# SiliconFlow Embedding（必填）
SILICONFLOW_API_KEY=sk-xxxxxxxx

# 火山引擎语音转写（可选）
VOLC_API_KEY=xxxxxxxx

# 站点地址
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 5. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000/login

---

## 项目结构

```
ordknow/
├── supabase/
│   └── migrations/              # 数据库迁移 SQL 文件（按编号顺序执行）
├── src/
│   ├── app/
│   │   ├── (auth)/login/        # 登录和注册页面
│   │   ├── (main)/
│   │   │   ├── workspace/       # 工作台（核心页面）
│   │   │   ├── materials/       # 素材管理
│   │   │   ├── knowledge/       # 知识体系
│   │   │   ├── qa/              # 知识问答
│   │   │   └── settings/        # 设置
│   │   └── api/
│   │       ├── materials/       # 素材 CRUD 接口
│   │       ├── analyze/         # AI 单条解析接口
│   │       ├── systematize/     # 一键体系化接口
│   │       ├── qa/              # 知识问答接口
│   │       ├── ocr/             # 图片识别接口
│   │       ├── audio2text/      # 音频转写接口
│   │       ├── fetch-url/       # 网页抓取接口
│   │       ├── parse-file/      # PDF/Word 解析接口
│   │       ├── knowledge/       # 知识体系查询接口
│   │       ├── export/          # 数据导出接口
│   │       └── search/          # 全局搜索接口
│   ├── components/
│   │   ├── ui/                  # 基础 UI 组件（按钮/输入框/卡片等）
│   │   ├── materials/           # 素材相关组件
│   │   ├── knowledge/           # 知识体系相关组件
│   │   ├── qa/                  # 问答组件
│   │   ├── workspace/           # 工作台布局组件
│   │   └── settings/            # 设置组件
│   ├── lib/
│   │   ├── ai/                  # AI 客户端、Prompt、解析/体系化逻辑
│   │   ├── embeddings/          # 文本分块和向量生成
│   │   └── supabase/            # Supabase 客户端封装
│   └── types/                   # TypeScript 类型定义
├── .env.local.example           # 环境变量模板
├── package.json
├── next.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

---

## 数据库设计

### 数据表

| 表名 | 说明 | 关键字段 |
|------|------|----------|
| `materials` | 原始素材 | id, user_id, title, raw_content, status |
| `material_analysis` | AI 解析结果 | id, material_id, core_meaning, topics, keywords |
| `material_chunks` | 素材分块与向量 | id, material_id, content, embedding(vector,1024) |
| `knowledge_topics` | 知识主题 | id, user_id, parent_id, title, level(1或2) |
| `knowledge_nodes` | 知识节点 | id, topic_id, title, content, node_type |
| `knowledge_edges` | 节点关系 | id, source_node_id, target_node_id, edge_type |
| `node_material_links` | 节点-素材引用 | id, node_id, material_id |
| `reconstruction_jobs` | 重构任务 | id, user_id, status |
| `knowledge_versions` | 版本快照 | id, user_id, version_number, snapshot |

### 安全策略

所有业务表启用 RLS（行级安全），策略统一为：

```sql
auth.uid() = user_id
```

即每个用户只能访问自己的数据，从数据库层面保证多用户隔离。

### 素材状态流转

```
pending（待解析）→ analyzing（解析中）→ analyzed（已解析）
                                       → failed（失败）
```

---

## API 接口

### 素材管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/materials` | 获取素材列表（支持 ?status= 筛选） |
| POST | `/api/materials` | 新增素材 |
| GET | `/api/materials/[id]` | 获取素材详情 |
| PUT | `/api/materials/[id]` | 编辑素材 |
| DELETE | `/api/materials/[id]` | 删除素材 |

### AI 服务

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/analyze` | AI 单条解析 |
| POST | `/api/systematize` | 一键体系化 |
| POST | `/api/qa` | 知识问答 |
| POST | `/api/ocr` | 图片文字识别 |
| POST | `/api/audio2text` | 音频转文本 |
| POST | `/api/fetch-url` | 网页内容抓取 |

### 知识体系

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/knowledge` | 获取知识树结构 |
| GET | `/api/knowledge/health` | 知识库健康检查 |
| GET | `/api/knowledge/versions` | 版本历史列表 |
| GET/PUT | `/api/knowledge/nodes/[id]` | 节点查看/编辑 |
| POST | `/api/knowledge/nodes/[id]/regenerate` | 重新生成节点内容 |

### 导出

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/export` | 导出 JSON 格式全库数据 |
| GET | `/api/export/markdown` | 导出 Markdown 格式知识体系 |
| GET | `/api/search?q=keyword` | 全局搜索 |

---

## 部署

### Vercel 部署（推荐）

1. Fork 或克隆本仓库到你的 GitHub
2. 在 [Vercel](https://vercel.com) 导入项目
3. 在 Vercel Dashboard 配置所有环境变量（同上）
4. 部署完成后访问 `https://your-project.vercel.app`

每次推送到 GitHub main 分支，Vercel 会自动重新构建部署。

### 其他部署方式

项目基于 Next.js，可以部署到任何支持 Node.js 的平台：

```bash
npm run build
npm start
```

### Supabase 迁移

首次部署时，需要在 Supabase SQL Editor 中按顺序执行：

1. `00001_enable_extensions.sql` — 启用 pgvector 扩展
2. `00002_create_materials.sql` — 素材表
3. `00003_create_material_analysis.sql` — 解析结果表
4. `00004_create_material_chunks.sql` — 分块与向量表
5. `00005_create_knowledge_tables.sql` — 知识体系表
6. `00006_create_reconstruction_tables.sql` — 重构与版本表
7. `00007_create_knowledge_edges.sql` — 知识关系表

---

## 常见问题

### 登录失败 / 注册后无法登录？

检查 Supabase 项目是否正常运行，进入 Authentication → Settings，确保关闭了 "Confirm email"。

### AI 解析失败？

检查 DeepSeek API Key 是否正确配置，确保账户有可用额度。

### "知识库为空"但已经添加了素材？

素材需要先进行 AI 解析（状态变为 "已解析"）后，才能参与体系化重构。在素材详情页点击"AI 解析"即可。

### 音频转写无法使用？

音频转写需要在 `.env.local` 中配置 `VOLC_API_KEY`（火山引擎豆包语音 API Key）。如不需要此功能，可以忽略。

### 如何备份数据？

在设置页点击"导出 JSON"即可下载全库数据的备份文件。导出的数据包含所有素材、解析结果、知识体系、版本历史。

---

## License

MIT

---

**GitHub**: [https://github.com/usedare/ordknow](https://github.com/usedare/ordknow)

**线上地址**: [https://ordknow.vercel.app](https://ordknow.vercel.app)
