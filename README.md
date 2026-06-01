# 游戏投放素材工坊 (Game Ad Creative Automation)

> AI 驱动的手机游戏视频广告自动化制作平台。输入游戏素材文件夹，AI 全流程完成 **6 阶段**：素材分析 → 创意方向 → 脚本创作 → 参考图生成 → 视频制作 → 持久化归档。

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue)](https://www.typescriptlang.org/)
[![Nuxt](https://img.shields.io/badge/Nuxt-3.11-green)](https://nuxt.com/)
[![Hono](https://img.shields.io/badge/Hono-4.4-orange)](https://hono.dev/)

---

## 目录

- [项目简介](#项目简介)
- [核心亮点](#核心亮点)
- [工作流程（6 阶段）](#工作流程6-阶段)
- [技术架构](#技术架构)
- [快速开始](#快速开始)
- [使用指南](#使用指南)
- [AI Provider 配置](#ai-provider-配置)
- [视频生成专题](#视频生成专题)
- [API 文档](#api-文档)
- [项目结构](#项目结构)
- [数据库设计](#数据库设计)
- [安全与限制](#安全与限制)
- [常见问题](#常见问题)
- [路线图](#路线图)

---

## 项目简介

**游戏投放素材工坊**是一套面向手机游戏买量团队的 AI 自动化工具。准备一个游戏素材文件夹（截图、角色图、玩法介绍），系统自动完成从创意构思到 9:16 竖屏视频广告素材输出的完整链路。

**适用场景**：手游信息流广告、应用商店预览视频、社交媒体买量素材。

### 一句话概括

> 把游戏素材文件夹丢进去，AI 帮你分析、出创意、写脚本、生图、拍视频。

---

## 核心亮点

| 亮点 | 说明 |
|------|------|
| 🧠 **AI 全流程自动化** | 从素材分析到视频输出，**6 阶段 Pipeline** 全自动串联 |
| 🎬 **真·视频生成** | 端到端接入火山方舟 Seedance，4 张参考图 + 详细脚本直接生成 15 秒竖屏视频 |
| 🎨 **多创意方向并行** | 每次生成 4 个不同策略的创意方向（反转/福利/悬念/玩法秀等），供你挑选 |
| 📝 **专业视频脚本** | AI 导演级脚本创作，输出场景分段 + 运镜 + 风格的中文自然语言提示词 |
| 🔄 **多 Provider 切换** | 一行配置切换火山引擎 / MiniMax / 混合模式 |
| 💾 **全流程持久化** | 所有分析结果、脚本、生成记录自动保存，**刷新不丢失** |
| 📱 **竖屏优先设计** | 9:16 竖屏比例，15 秒标准时长，专为信息流广告优化 |
| 🛡️ **IDOR 防护** | Stage 路由校验 scriptId / refImageIds 必须属于当前项目 |
| 🌐 **Web 操作界面** | 暗色主题现代化 UI，Step-by-Step 引导式操作 |

---

## 工作流程（6 阶段）

```
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│  ① 素材  │─▶│  ② AI    │─▶│  ③ 创意  │─▶│  ④ 详细  │─▶│  ⑤ 参考  │─▶│  ⑥ 视频  │
│  上传    │  │  分析   │  │  方向   │  │  脚本   │  │  图     │  │  生成   │
│ 扫描     │  │ Game    │  │ 4 选 1  │  │ 15s 场景 │  │ Seedream │  │ Seedance │
│ 文件夹   │  │ Profile │  │ 用户决策 │  │ 提示词   │  │ 9:16 图  │  │ 多模态  │
└──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘
```

### 阶段 1：素材上传

把游戏相关素材放入一个文件夹：

- **图片**（`.png` / `.jpg` / `.webp` / `.gif`）：角色图、场景截图、UI 截图、美术参考
- **文字**（`.txt` / `.md`）：游戏世界观、玩法介绍、角色设定

系统自动扫描并建立素材索引。**前 5 张图**会用于 AI 视觉分析。

### 阶段 2：AI 素材分析

调用豆包 / GPT-4o Vision（取决于 `TEXT_PROVIDER`），结合文本描述和图片内容，输出 `GameProfile`：

- 游戏类型（RPG / 策略 / 休闲 / 卡牌等）
- 画风特征（写实 / Q版 / 二次元 / 暗黑等）
- 核心卖点（3-5 个广告可用的吸引点）
- 目标用户画像（年龄段、兴趣标签）
- 核心玩法（精炼概括）
- 情绪基调（热血 / 搞笑 / 治愈等）

`GameProfile` 完整 JSON 持久化到 `projects.profile_json`，页面刷新不丢失。

### 阶段 3：创意方向生成

从 **8 种策略角度**（反转剧情、福利诱惑、玩法秀、悬念揭秘、对比反差、社交炫耀、挑战刺激、情感共鸣）中，组合生成 **4 个完全不同的 15 秒广告创意方向**。

每个方向包含：策略说明、Hook 类型、目标情绪、15 秒一句话大纲。

### 阶段 4：详细脚本创作

选定方向后，进入 AI 导演模式，生成完整脚本：

- **Hook（0-3 秒）**：开场冲击画面
- **玩法展示（3-13 秒）**：核心玩法呈现（2 个场景）
- **CTA（13-15 秒）**：行动号召

每个场景附带：

- `seedancePrompt` → 火山方舟 Seedance 1.0 Pro / 1.5 Pro / 2.0 视频生成提示词
- `seedreamPrompt` → Seedream 4.0 / 5.0 参考图提示词
- 中文配音 / 文案
- 音效配乐方向
- 制作备注

### 阶段 5：参考图生成

- 并行调用 Seedream 5.0 / 4.0 为每个场景生成 9:16 参考帧
- 自动轮询任务状态，**失败的图可继续推进**（不会卡住整个流程）
- 参考图 URL 存到 `reference_images.image_url`，作为视频生成的多模态输入

### 阶段 6：视频生成（端到端）

- 加载脚本 + 已生成的参考图
- `assembleVideoPrompt` 拼装完整 Seedance 提示词（场景分段 + 全局风格 + 运镜节奏）
- 直接调用火山方舟 `POST /contents/generations/tasks`（文 + 多图多模态）
- 入库 `video_generations`（含 `model` / `resolution` / `ratio` / `error_message`）
- 异步轮询 `GET /contents/generations/tasks/{id}`，完成后回填 `videoUrl`
- 支持取消任务（`DELETE`）

---

## 技术架构

```
┌─────────────────────────────────────────────────────┐
│                 Client (Nuxt 3 SPA)                  │
│  pages/index.vue   pages/projects/[id].vue          │
│  components/SceneCard.vue                           │
│  composables/useApi.ts  ──── CORS configurable       │
└───────────────────────┬─────────────────────────────┘
                        │ HTTP REST (port 3001)
┌───────────────────────┴─────────────────────────────┐
│                  Server (Hono)                       │
│                                                     │
│  routes/projects.ts   ◀──▶  routes/scripts.ts        │
│         │                          │                │
│         ▼                          ▼                │
│  ┌──────────────────────────────────────┐          │
│  │   Pipeline (编排层 · 6 阶段)         │          │
│  │  analyzeProject                      │          │
│  │  → generateDirections                │          │
│  │  → generateScriptForDirection        │          │
│  │  → generateReferenceImages           │          │
│  │  → generateAdVideoForScript          │          │
│  │  + assertScriptBelongsToProject(IDOR)│          │
│  └──────────────┬───────────────────────┘          │
│                 │                                    │
│  ┌──────────────┴───────────────────────┐          │
│  │       Agents (AI 层 · 直调)           │          │
│  │  asset-analyzer    script-generator  │          │
│  │  video-generator(直调 volcGenerateVideo)│       │
│  └──────────────┬───────────────────────┘          │
│                 │                                    │
│  ┌──────────────┴───────────────────────┐          │
│  │       Services (服务层)               │          │
│  │  openai.ts        minimax.ts          │          │
│  │  volcengine.ts    media-gen.ts        │          │
│  │  provider-config.ts(getter in-func)   │          │
│  └──────────────┬───────────────────────┘          │
│                 │                                    │
│  ┌──────────────┴───────────────────────┐          │
│  │   SQLite (Drizzle 0.30 · WAL)        │          │
│  │   5 张表 · JSON mode · 自动迁移      │          │
│  └──────────────────────────────────────┘          │
└─────────────────────────────────────────────────────┘
```

### 技术栈详情

| 层级 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 前端框架 | Nuxt 3 | 3.11 | SPA 模式 |
| UI 框架 | Vue 3 | 3.4 | Composition API |
| 后端框架 | Hono | 4.4 | 轻量高性能 |
| 运行时 | Node.js | 20+ | TypeScript 执行 |
| 数据库 | SQLite (better-sqlite3) | 11 | WAL 模式 |
| ORM | Drizzle ORM | 0.30 | `text({ mode: 'json' })` 自动序列化 |
| AI 文本 | 豆包 Pro / GPT-4o | - | 通过 OpenAI 兼容 SDK |
| AI 图片 | Seedream 4.0 / 5.0 | - | 火山 / MiniMax |
| AI 视频 | **Seedance 1.0 Pro / 1.5 Pro / 2.0** | - | 火山方舟 `contents/generations/tasks`（默认，MiniMax 兜底） |

---

## 快速开始

### 环境要求

- Node.js >= 18（推荐 20 LTS）
- npm >= 9

### 1. 克隆与安装

```bash
git clone https://github.com/xiaobao0818/Game-Ad-Creative-Automation.git
cd Game-Ad-Creative-Automation
npm install                # monorepo 根
cd server && npm install
cd ../client && npm install
cd ..
```

> **注意：** 仓库的 `client/package.json` 历史上写过 `@nuxt/types@^3.11.0`（该包名已不存在），如果根目录 `npm install` 报错，先 `cd client && npm install --legacy-peer-deps`。

### 2. 配置环境变量

```bash
cp server/.env.example server/.env
```

最小可运行配置（火山引擎全链路，国内首选）：

```bash
# server/.env
AI_PROVIDER=volcengine
VOLCENGINE_API_KEY=你的火山引擎API密钥
VOLCENGINE_ARK_ENDPOINT_ID=ep-你的推理接入点ID
```

### 3. 启动

```bash
# 根目录同时启动前后端
npm run dev

# 前端 → http://localhost:3000
# 后端 → http://localhost:3001
```

### 4. 端到端体验

1. 浏览器打开 `http://localhost:3000`
2. 点击「新建项目」→ 填项目名 + 拖拽/选择素材文件
3. 依次走完 **6 阶段**（每步都有进度提示和可恢复的状态）
4. 最终在 Step 6 看到 15 秒竖屏视频，可在线播放 / 下载

---

## 使用指南

### 素材上传

直接在创建项目时拖拽 / 选择文件即可（不用手动配路径）。每个项目拥有独立的 uploads 目录 `server/uploads/projects/<id>/`，项目删除时自动清理。

支持的格式：
- 图片：`.png` / `.jpg` / `.jpeg` / `.webp` / `.gif`
- 文本：`.txt` / `.md`

**建议：**

- 图片尽量清晰，至少 512px 宽
- 文字描述越详细越好（玩法、特色系统、付费点等）
- 图片数量 5-15 张，**前 5 张**会用于 AI 视觉分析
- 单文件 ≤ 50MB（可通过 `MAX_UPLOAD_BYTES` 调整）
- 单次请求 ≤ 20 个文件（可通过 `MAX_FILES_PER_UPLOAD` 调整）

如果想从本地文件夹批量导入，也可以在项目详情页「素材管理」区多次上传，或直接用 curl：

```bash
curl -X POST http://localhost:3001/api/projects/1/assets/upload \
  -F "files=@hero.png" \
  -F "files=@intro.md"
```

### 创意方向选择

| 策略 | 适合场景 | 示例 |
|------|---------|------|
| 反转剧情 | RPG、卡牌 | 开局被虐→抽到神卡逆袭 |
| 福利诱惑 | 放置、卡牌 | 上线送 648 抽 |
| 玩法秀 | MOBA、动作 | 极限操作/神级连招 |
| 悬念揭秘 | 解谜、剧情 | 神秘宝箱里到底是什么？ |
| 对比反差 | 所有类型 | 零氪 vs 大佬 |
| 社交炫耀 | MMO、竞技 | 全服第一/绝版皮肤 |
| 挑战刺激 | 动作、射击 | 无伤通关/BOSS 速杀 |
| 情感共鸣 | 剧情、养成 | 角色故事/陪伴感 |

### 提示词使用

生成的 `seedancePrompt`（脚本中）和 `assembleVideoPrompt` 实际发送版本（流水线中）都可直接复制到火山方舟控制台或本系统自动调用。

| Provider | 文本 | 图片 | 视频 |
|----------|------|------|------|
| 火山方舟 | 豆包 Pro | Seedream 4.0 | Seedance 1.0 Pro / 1.5 Pro / 2.0 |
| MiniMax | GPT-4o | Seedream 5.0 | Seedance 2.0 |

---

## AI Provider 配置

### 配置总览

| 环境变量 | 说明 | 默认值 |
|---------|------|--------|
| `AI_PROVIDER` | 全局 Provider | `volcengine` |
| `TEXT_PROVIDER` | 文本生成（覆盖全局） | 继承 `AI_PROVIDER` |
| `IMAGE_PROVIDER` | 图片生成（覆盖全局） | 继承 `AI_PROVIDER` |
| `VIDEO_PROVIDER` | 视频生成（覆盖全局） | 继承 `AI_PROVIDER` |

### 方案一：火山引擎全链路（推荐）

```bash
AI_PROVIDER=volcengine
VOLCENGINE_API_KEY=你的API密钥
VOLCENGINE_ARK_ENDPOINT_ID=ep-xxxxxxxxxxxx
```

- 文本：豆包（通过方舟推理接入点）
- 图片：豆包 Seedream 4.0（`/images/generations`）
- 视频：豆包 Seedance 1.0 Pro / 1.5 Pro / 2.0（`/contents/generations/tasks`）

### 方案二：MiniMax 全链路

```bash
AI_PROVIDER=minimax
OPENAI_API_KEY=sk-xxxxxxxx
MINIMAX_API_KEY=你的MiniMax密钥
```

- 文本：OpenAI GPT-4o
- 图片：MiniMax Seedream 5.0
- 视频：MiniMax Seedance 2.0

### 方案三：混合模式

```bash
AI_PROVIDER=hybrid
VOLCENGINE_API_KEY=...
VOLCENGINE_ARK_ENDPOINT_ID=ep-...
MINIMAX_API_KEY=...
```

- 文本：火山豆包
- 图片：MiniMax Seedream 5.0
- 视频：MiniMax Seedance 2.0

### 视频生成专项配置

| 环境变量 | 说明 | 默认值 |
|---------|------|--------|
| `VOLCENGINE_VIDEO_MODEL` | Seedance 模型 ID | `doubao-seedance-1-0-pro-250528` |
| `VOLCENGINE_VIDEO_RESOLUTION` | 分辨率 | `720p`（可选 `480p` / `1080p`） |
| `VOLCENGINE_VIDEO_RATIO` | 画幅 | `9:16`（可选 `16:9` / `4:3` / `1:1` / `3:4`） |
| `VOLCENGINE_VIDEO_WATERMARK` | 是否带水印 | `false` |
| `MINIMAX_BASE_URL` | MiniMax API 地址 | `https://api.minimax.chat` |
| `MAX_IMAGE_BYTES` | Vision API 单图上限 | `4 * 1024 * 1024`（4MB） |
| `CORS_ORIGIN` | 允许的跨域来源（逗号分隔） | `http://localhost:3000,http://localhost:3001` |

### 查看当前 Provider

启动后访问 `http://localhost:3001/api/provider`：

```json
{ "text": "volcengine", "image": "volcengine", "video": "volcengine" }
```

---

## 视频生成专题

### Seedance 模型选择

| 模型 ID | 分辨率 | 时长 | 特点 |
|---------|--------|------|------|
| `doubao-seedance-1-0-pro-250528` | 480p / 720p / 1080p | 5 / 10 / 15s | 稳定默认，平衡质量与速度 |
| `doubao-seedance-1-5-pro-251215` | 480p / 720p / 1080p | 5 / 10 / 15s | 提示词遵循更准，运动更自然 |
| `doubao-seedance-2-0` | 720p / 1080p | 5 / 10 / 15s | 支持文+图+音+视频四模态输入 |
| `doubao-seedance-1-0-lite` | 480p / 720p | 5 / 10s | 轻量快速，适合预览 |

切换模型：改 `VOLCENGINE_VIDEO_MODEL` 后重启。

### 实际请求示例

```http
POST https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks
Authorization: Bearer <API_KEY>
Content-Type: application/json

{
  "model": "doubao-seedance-1-0-pro-250528",
  "content": [
    { "type": "text", "text": "【开场冲击 · 0-3 秒】..." },
    { "type": "image_url", "image_url": { "url": "https://..." } },
    { "type": "image_url", "image_url": { "url": "https://..." } }
  ],
  "parameters": {
    "ratio": "9:16",
    "duration": 15,
    "resolution": "720p",
    "watermark": false,
    "seed": -1
  }
}
```

返回：

```json
{ "id": "cgt-xxxxxxxx", "status": "queued", ... }
```

后续用 `GET /contents/generations/tasks/{id}` 轮询，状态 `succeeded` 时 `content.video_url` 为成片 URL。

### 提示词拼装

后端 `assembleVideoPrompt` 自动按以下结构拼装：

```
【开场冲击 · 0-3 秒】
<hook 视觉描述>

【玩法展示 1 · 3-8 秒】
<gameplay_0 视觉描述>

【玩法展示 2 · 8-13 秒】
<gameplay_1 视觉描述>

【行动号召 · 13-15 秒】
<cta 视觉描述>

【整体风格】
画风: 游戏级电影感渲染，色彩饱和，光影强烈。
运镜: 连续的电影感剪辑...
节奏: 15 秒紧凑叙事...
整体情绪: <tone>。
画面: 9:16 竖屏，移动端信息流广告质感...
```

### 取消 / 重试

- **取消**：调用 `volcCancelVideoTask`（`DELETE /contents/generations/tasks/{id}`），幂等
- **重试**：如果视频生成失败，前端可以再次点击"生成最终视频"（会创建新的 video_generation 记录）

---

## API 文档

Base URL：`http://localhost:3001/api`

### 项目管理

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/projects` | 获取所有项目（按 `updated_at` 倒序） |
| `POST` | `/projects` | 创建项目，body 需含 `name` |
| `GET` | `/projects/:id` | 获取项目详情（`profileJson` 已反序列化） |
| `DELETE` | `/projects/:id` | 删除项目（级联删除所有 assets / scripts / 视频） |

### 流水线（6 阶段）

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/projects/:id/analyze` | 扫描素材 + AI 分析游戏特征 |
| `POST` | `/projects/:id/directions` | 生成 4 个创意方向 |
| `GET` | `/projects/:id/directions` | 获取已有创意方向 |
| `POST` | `/projects/:id/generate-script` | 选定方向，生成详细脚本（**校验 scriptId 归属**） |
| `POST` | `/projects/:id/generate-ref-images` | 并行调用 Seedream 生成参考图（**校验 scriptId 归属**） |
| `POST` | `/projects/:id/generate-video` | 调用火山方舟 Seedance 生成最终视频（**校验 scriptId + refImageIds 归属**） |
| `GET` | `/projects/:id/scripts` | 获取项目下所有脚本 |
| `GET` | `/projects/:id/assets` | 获取项目下已上传的素材列表 |
| `POST` | `/projects/:id/assets/upload` | **上传素材**（multipart，字段名 `files`，支持多文件） |
| `DELETE` | `/projects/:id/assets/:assetId` | 删除单个素材（同步删磁盘文件） |

### 脚本管理

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/scripts/:id` | 获取脚本详情（hookScene / gameplayScenes / ctaScene / refImagePrompts 已是对象） |
| `PATCH` | `/scripts/:id` | 更新脚本内容（**`status` 字段有白名单校验**） |
| `GET` | `/scripts/:id/ref-images` | 获取脚本的参考图列表 |
| `GET` | `/scripts/:id/videos` | 获取脚本的视频生成记录 |

### 生成状态轮询

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/scripts/ref-image/:id/check` | 轮询参考图状态，**完成时回写 `imageUrl`，失败时打日志** |
| `GET` | `/scripts/video/:id/check` | 轮询视频状态，**完成时回写 `videoUrl`，失败时持久化 `errorMessage`** |

### 系统

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/health` | 健康检查 |
| `GET` | `/provider` | 查看当前 AI Provider 配置 |

### 错误响应格式

```json
{ "error": "错误描述" }   // 4xx 客户端错误
{ "status": "error", "message": "..." }  // 5xx 服务端错误
```

---

## 项目结构

```
Game-Ad-Creative-Automation/
├── package.json                    # Monorepo 根（concurrently 启动前后端）
├── README.md                       # 本文件
│
├── server/                         # 后端（Hono + Drizzle + SQLite）
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example                # 环境变量模板（含视频专项配置）
│   └── src/
│       ├── index.ts                # 入口：建表（自动迁移）+ 挂载路由 + CORS
│       ├── db/
│       │   ├── schema.ts           # Drizzle ORM 表定义（5 张表，JSON mode）
│       │   └── index.ts            # 数据库连接（WAL 模式 + 外键 + rawDb 导出）
│       ├── agents/                 # AI Agent 层
│       │   ├── asset-analyzer.ts   # 素材分析 → GameProfile
│       │   ├── script-generator.ts # 创意方向 + 详细脚本
│       │   └── video-generator.ts  # 视频提示词拼装 + 直接调 volcGenerateVideo
│       ├── pipeline/
│       │   └── index.ts            # 6 阶段编排 + assertScriptBelongsToProject(IDOR)
│       ├── routes/
│       │   ├── projects.ts         # 项目 CRUD + 6 个 Pipeline 路由
│       │   └── scripts.ts          # 脚本 CRUD + 状态轮询（含 status 白名单）
│       └── services/               # 基础服务
│           ├── provider-config.ts  # Provider 配置中心（getter 内部调，避免钉死）
│           ├── openai.ts           # 文本 + Vision（4MB 图片上限）
│           ├── volcengine.ts       # 火山方舟（图片/视频，含 volcGet / volcDelete）
│           ├── minimax.ts          # MiniMax（图片/视频）
│           └── media-gen.ts        # 统一媒体生成抽象层（含参数校验）
│
└── client/                         # 前端（Nuxt 3 SPA）
    ├── package.json
    ├── nuxt.config.ts
    ├── app.vue
    ├── assets/styles/main.css      # 暗色主题全局样式
    ├── pages/
    │   ├── index.vue               # 项目列表 + 新建弹窗
    │   └── projects/[id].vue       # 项目工作台（5 步 UI + 轮询 + 状态恢复）
    ├── components/
    │   └── SceneCard.vue           # 场景卡片（Hook / 玩法 / CTA）
    └── composables/
        └── useApi.ts               # API 封装（useProjects / useScripts / useGenerationStatus）
```

---

## 数据库设计

### ER 关系

```
projects (1) ──< assets (N)
projects (1) ──< scripts (N)
scripts (1)  ──< reference_images (N)
scripts (1)  ──< video_generations (N)
```

所有外键 `ON DELETE CASCADE`，数据库级联删除。WAL 模式 + `foreign_keys = ON`。

### 通用约定

- 主键全部 `INTEGER PRIMARY KEY AUTOINCREMENT`
- 时间戳全部 `datetime('now')` 默认值
- JSON 字段在 Drizzle 用 `text({ mode: 'json' }).$type<T>()` 声明（**读取时自动反序列化**）
- 数据库初始化时通过 `try/catch ALTER TABLE` 兼容旧库（无需迁移工具）

### `projects` 表

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | INTEGER | 主键 |
| `name` | TEXT | 项目名称（NOT NULL） |
| `description` | TEXT | 项目描述 |
| `game_genre` | TEXT | 游戏类型 |
| `art_style` | TEXT | 画风 |
| `asset_path` | TEXT | 手动指定的素材目录（**可选**，留空时流水线自动用 uploads dir） |
| `profile_json` | TEXT(JSON) | 完整 `GameProfile`，Drizzle 自动序列化 |
| `status` | TEXT | `draft` / `analyzed` / `directions_ready` |
| `created_at` | TEXT | 创建时间 |
| `updated_at` | TEXT | 更新时间 |

### `assets` 表

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | INTEGER | 主键 |
| `project_id` | INTEGER | 外键 → projects |
| `type` | TEXT | `image` / `text` |
| `filename` | TEXT | 文件名 |
| `file_path` | TEXT | 文件绝对路径（位于 `server/uploads/projects/<id>/`） |
| `ai_description` | TEXT | AI 生成的描述（文本素材） |
| `ai_tags` | TEXT(JSON) | AI 标签数组（图片素材） |
| `created_at` | TEXT | 创建时间 |

### `scripts` 表

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | INTEGER | 主键 |
| `project_id` | INTEGER | 外键 → projects |
| `title` | TEXT | 脚本标题 |
| `hook_scene` | TEXT(JSON) | `{time, visual, audio, copy, seedancePrompt}` |
| `gameplay_scenes` | TEXT(JSON) | `DetailedScene[]`（2 个场景） |
| `cta_scene` | TEXT(JSON) | CTA 场景对象 |
| `full_copy` | TEXT | 所有场景 copy 拼接 |
| `tone` | TEXT | 情绪基调 |
| `ref_image_prompts` | TEXT(JSON) | `{sceneKey, seedreamPrompt}[]` |
| `production_notes` | TEXT | 制作备注 |
| `status` | TEXT | `draft` / `direction` / `detailed` / `in_production` / `done` |
| `created_at` | TEXT | 创建时间 |

### `reference_images` 表

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | INTEGER | 主键 |
| `script_id` | INTEGER | 外键 → scripts |
| `scene_key` | TEXT | `hook` / `gameplay_0` / `gameplay_1` / `cta` |
| `prompt` | TEXT | 发送的提示词 |
| `image_url` | TEXT | 上游返回的 URL |
| `seedream_task_id` | TEXT | 火山任务 ID（用于轮询） |
| `status` | TEXT | `pending` / `generating` / `done` / `failed` |
| `created_at` | TEXT | 创建时间 |

### `video_generations` 表

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | INTEGER | 主键 |
| `script_id` | INTEGER | 外键 → scripts |
| `prompt` | TEXT | 实际发送的 Seedance 提示词 |
| `ref_image_ids` | TEXT(JSON) | 引用的参考图 ID 数组 |
| `video_url` | TEXT | 上游返回的视频 URL |
| `seedance_task_id` | TEXT | 火山任务 ID（用于轮询） |
| `status` | TEXT | `pending` / `generating` / `done` / `failed` |
| `duration` | INTEGER | 时长（秒），默认 15 |
| `model` | TEXT | 实际用到的模型名（**新增**） |
| `resolution` | TEXT | 分辨率（**新增**） |
| `ratio` | TEXT | 画幅（**新增**） |
| `error_message` | TEXT | 上游/SDK 报错信息（**新增**，失败时持久化） |
| `created_at` | TEXT | 创建时间 |

---

## 安全与限制

### ⚠️ 当前已知限制

1. **无鉴权**：所有 API 端点都是公开的。任何能访问到 3001 端口的人都能：
   - 调用 `POST /:id/analyze` 触发 AI 任务（消耗你的 API 额度）
   - 删除任意项目
   - 读取所有项目数据
   
   **生产部署前必须加鉴权**（建议：API Key 中间件 + 用户系统）。

2. ~~**素材路径是用户输入的绝对路径**：服务器会用 `fs.readFileSync` 读取，**没有目录隔离**。可访问文件系统任意位置。~~ ✅ **已修复**：现在改用 multipart 上传到 `server/uploads/projects/<id>/`，文件名用 `path.basename` 清洗，不接受任何用户提供的路径。

3. **CORS 默认放行 localhost**：通过 `CORS_ORIGIN` 环境变量配置；不配置则只允许 `localhost:3000` 和 `localhost:3001`。

4. **Vision API 单图 4MB 上限**（`MAX_IMAGE_BYTES`）：超过会抛错。

5. **无速率限制**：可被恶意刷爆 AI 配额。

6. **任务取消的孤儿场景**：如果 `volcGenerateVideo` 创建了上游任务但 `seedanceTaskId` 写库失败，任务会"孤儿"跑完。日志会打印 taskId，可人工补 DB。

### ✅ 已做

- **IDOR 防护**：3 个 stage 路由（`generate-script` / `generate-ref-images` / `generate-video`）都校验 `scriptId` 属于 URL 中的 `projectId`，`generate-video` 还校验 `refImageIds` 归属。
- **参数边界校验**：`media-gen.ts` 拒绝 `aspectRatio` ∉ 5 个枚举值、`duration` ∉ {5,10,15}、`resolution` ∉ 3 个枚举值。
- **Status 白名单**：`PATCH /scripts/:id` 的 `status` 字段只能写 5 个合法值。
- **错误响应不泄露堆栈**：所有 catch 块用 `err?.message ?? String(err)`，5xx 响应只带 message。

---

## 常见问题

### Q: 启动时报 `npm error code ETARGET No matching version found for @nuxt/types@^3.11.0`？

`@nuxt/types` 包名早已不存在（Nuxt 团队已合并到 `nuxt` 包内）。这是仓库既有问题，**不影响 server 端**：

```bash
# 跳过 client，只装 server
cd server && npm install
```

或者：
```bash
cd client && npm install --legacy-peer-deps
```

### Q: 火山引擎 API Key 和接入点怎么获取？

1. 注册 [火山方舟控制台](https://console.vcengine.com/ark)
2. 创建 API Key：右上角 → API Key 管理
3. 创建推理接入点：在线推理 → 创建接入点 → 选择豆包模型
4. 将接入点 ID（形如 `ep-2024xxxxxxxx`）填入 `VOLCENGINE_ARK_ENDPOINT_ID`

视频生成不需要新的接入点，模型 ID 直接填（如 `doubao-seedance-1-0-pro-250528`）。

### Q: 图片不被 AI 分析到？

检查：
1. 图片格式是否在 `.png` / `.jpg` / `.jpeg` / `.webp` / `.gif` 范围内
2. 是否在项目详情页成功上传（可看到文件列表）
3. 视觉得分超过 4MB 会被 `MAX_IMAGE_BYTES` 拒绝
4. 单文件超过 50MB 会被上传端点直接拒绝（看响应里的 `rejected` 列表）

### Q: 创意方向生成结果不理想？

- 文字描述尽量详细（玩法、付费点、目标用户）
- 素材图片清晰、有代表性
- 直接重新点击"生成创意方向"（会覆盖之前的）

### Q: 视频生成多久能完成？

Seedance 1.0 Pro 720p 15s 通常 1-3 分钟；1080p / Seedance 1.5 Pro / 2.0 通常 5-7 分钟。前端轮询最长 15 分钟。

### Q: 视频生成失败了怎么办？

- 看 `video_generations.error_message` 列（前端会显示）
- 重新点击"生成最终视频"（会创建新记录，旧记录保留）
- 检查 `VOLCENGINE_API_KEY` / 模型 ID / 网络
- 极少数情况下是"孤儿"：上游任务已创建但写库失败，日志会打印 taskId，可在火山控制台手工补

### Q: 想从 MiniMax 切回火山引擎？

修改 `server/.env` 中的 `AI_PROVIDER`，重启后端即可。访问 `http://localhost:3001/api/provider` 确认。

### Q: 不想要水印？

设置 `VOLCENGINE_VIDEO_WATERMARK=false`（默认就是 false）。

### Q: 想要横屏视频？

设置 `VOLCENGINE_VIDEO_RATIO=16:9`（合法值：`16:9` / `4:3` / `1:1` / `9:16` / `3:4`）。

### Q: 数据存在哪里？

SQLite 文件：`server/data/game-ad-workshop.db`（首次启动自动创建）。
WAL 模式下还会生成 `game-ad-workshop.db-wal` 和 `game-ad-workshop.db-shm`。

**清空所有数据**：删 `server/data/` 整个目录。

---

## 路线图

### ✅ 已完成

- [x] 6 阶段端到端流水线
- [x] 火山方舟 Seedance 1.0 Pro / 1.5 Pro / 2.0 完整适配
- [x] 多 Provider（火山 / MiniMax / 混合）
- [x] CORS / 配置中心 / Drizzle JSON mode
- [x] Vision API 4MB 上限
- [x] 参考图并行 + 失败退避重试
- [x] IDOR 防护
- [x] Status 字段白名单
- [x] 错误持久化
- [x] 轮询去重 + 15 分钟超时
- [x] **multipart 文件上传**(替代用户输入路径)

### 🚧 待做（按优先级）

| 优先级 | 任务 | 影响 |
|--------|------|------|
| P0 | ~~文件上传替代路径输入~~ | ✅ 已完成 |
| P0 | 鉴权 / 用户系统 | 防止 AI 额度被刷、数据被读 |
| P0 | 限流 | 同上 |
| P1 | 单元测试（pipeline + provider-config） | 重构安全网 |
| P1 | Drizzle 迁移替换 raw SQL | Schema 单一来源 |
| P1 | 持久化完整 `CreativeDirection` | 状态恢复更稳 |
| P2 | WebSocket 替代轮询 | 实时性、减请求 |
| P2 | Seedance 2.0 多模态（音/视频参考） | 等模型稳定 |
| P2 | 国际化（i18n） | 海外用户 |
| P3 | Docker + CI/CD | 部署便利 |
| P3 | Seedance 摄像头控制（`camera_control`） | 高级运镜 |

---

## License

MIT License

---

**Made with ❤️ by 小宝**
