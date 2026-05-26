# 游戏投放素材工坊 (Game Ad Creative Automation)

> AI 驱动的手机游戏视频广告自动化制作平台。输入游戏素材，AI 全流程完成：素材分析 → 创意方向 → 脚本创作 → 参考图生成 → 视频制作。

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue)](https://www.typescriptlang.org/)
[![Nuxt](https://img.shields.io/badge/Nuxt-3.11-green)](https://nuxt.com/)
[![Hono](https://img.shields.io/badge/Hono-4.4-orange)](https://hono.dev/)

---

## 目录

- [项目简介](#项目简介)
- [核心亮点](#核心亮点)
- [工作流程](#工作流程)
- [技术架构](#技术架构)
- [快速开始](#快速开始)
- [使用指南](#使用指南)
- [AI Provider 配置](#ai-provider-配置)
- [API 文档](#api-文档)
- [项目结构](#项目结构)
- [数据库设计](#数据库设计)
- [常见问题](#常见问题)

---

## 项目简介

**游戏投放素材工坊**是一套面向手机游戏买量团队的 AI 自动化工具。你只需将游戏的截图、角色图、玩法介绍等素材文件放入文件夹，系统即可自动完成从创意构思到视频素材输出的完整链路。

**适用场景**：手游信息流广告、应用商店预览视频、社交媒体买量素材。

### 一句话概括

> 把游戏素材文件夹丢进去，AI 帮你分析、出创意、写脚本、做视频。

---

## 核心亮点

| 亮点 | 说明 |
|------|------|
| 🧠 **AI 全流程自动化** | 从素材分析到视频输出，6 阶段 Pipeline 全自动串联 |
| 🎨 **多创意方向并行** | 每次生成 4 个不同策略的创意方向（反转/福利/悬念/玩法秀等），供你挑选 |
| 📝 **专业视频脚本** | AI 导演级脚本创作，输出可直接用于 Seedance/Seedream 的提示词 |
| 🔄 **多 Provider 切换** | 一行配置切换火山引擎 / MiniMax / 混合模式 |
| 💾 **全流程持久化** | 所有分析结果、脚本、生成记录自动保存，刷新不丢失 |
| 📱 **竖屏优先设计** | 9:16 竖屏比例，15 秒标准时长，专为信息流广告优化 |
| 🌐 **Web 操作界面** | 暗色主题现代化 UI，Step-by-Step 引导式操作 |

---

## 工作流程

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  ① 素材上传   │───▶│  ② AI 分析    │───▶│  ③ 创意方向   │───▶│  ④ 详细脚本   │───▶│  ⑤ 参考图     │
│ 扫描文件夹    │    │ 游戏特征档案  │    │ 4选1 用户决策 │    │ 提示词输出   │    │ 视频生成     │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

### 阶段 1：素材上传
将游戏相关素材放入一个文件夹：
- **图片**（.png / .jpg / .webp）：角色图、场景截图、UI 截图、美术参考
- **文字**（.txt / .md）：游戏世界观、玩法介绍、角色设定

系统自动扫描并建立素材索引。

### 阶段 2：AI 素材分析
AI（GPT-4o / 豆包）结合文本描述和图片内容，分析并输出：

- 游戏类型（RPG / 策略 / 休闲 / 卡牌等）
- 画风特征（写实 / Q版 / 二次元 / 暗黑等）
- 核心卖点（3-5 个广告可用的吸引点）
- 目标用户画像（年龄段、兴趣标签）
- 核心玩法（精炼概括）
- 情绪基调（热血 / 搞笑 / 治愈等）

分析结果持久化存储，页面刷新不丢失。

### 阶段 3：创意方向生成
AI 从 8 种策略角度（反转剧情、福利诱惑、玩法秀、悬念揭秘、对比反差、社交炫耀、挑战刺激、情感共鸣）中，为你生成 4 个完全不同的 15 秒广告创意方向。

每个方向包含：策略说明、Hook 类型、目标情绪、15 秒一句话大纲。

### 阶段 4：详细脚本创作
选定创意方向后，AI 导演模式生成完整脚本，包含：

- **Hook（0-3 秒）**：开场冲击画面
- **玩法展示（3-13 秒）**：核心玩法呈现
- **CTA（13-15 秒）**：行动号召

每个场景附带：
- `seedancePrompt`：可直接用于 Seedance 2.0 的视频生成提示词（英文，含运镜、光影、特效描述）
- `seedreamPrompt`：可直接用于 Seedream 5.0 的参考图提示词
- 中文配音/文案
- 音效配乐方向
- 制作备注

### 阶段 5：参考图 & 视频生成
- 一键调用 Seedream 5.0 为每个场景生成 9:16 参考帧
- 自动轮询任务状态直到完成
- 支持后续扩展 Seedance 2.0 视频生成

---

## 技术架构

```
┌─────────────────────────────────────────────────┐
│                    Client (Nuxt 3)               │
│  pages/index.vue  ◀──▶  composables/useApi.ts   │
│  pages/projects/[id].vue                        │
│  components/SceneCard.vue                       │
└──────────────────────┬──────────────────────────┘
                       │ HTTP REST
┌──────────────────────┴──────────────────────────┐
│                   Server (Hono)                  │
│                                                  │
│  routes/projects.ts   ◀──▶  routes/scripts.ts   │
│         │                          │             │
│         ▼                          ▼             │
│  ┌──────────────────────────────────────┐       │
│  │          Pipeline (编排层)            │       │
│  │  analyzeProject → generateDirections │       │
│  │  → generateScript → generateRefImages│       │
│  └──────────────┬───────────────────────┘       │
│                 │                                │
│  ┌──────────────┴───────────────────────┐       │
│  │            Agents (AI 层)             │       │
│  │  asset-analyzer / script-generator   │       │
│  │  ref-image-generator / video-generator│       │
│  └──────────────┬───────────────────────┘       │
│                 │                                │
│  ┌──────────────┴───────────────────────┐       │
│  │          Services (服务层)            │       │
│  │  openai.ts  ┊  media-gen.ts          │       │
│  │  volcengine.ts  ┊  minimax.ts        │       │
│  │  provider-config.ts                  │       │
│  └──────────────────────────────────────┘       │
│                                                  │
│  ┌──────────────────────────────────────┐       │
│  │          SQLite (Drizzle ORM)         │       │
│  │  5 张表 / WAL 模式 / 外键级联         │       │
│  └──────────────────────────────────────┘       │
└─────────────────────────────────────────────────┘
```

### 技术栈详情

| 层级 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 前端框架 | Nuxt 3 | 3.11 | SPA 模式 |
| UI 框架 | Vue 3 | 3.4 | Composition API |
| 后端框架 | Hono | 4.4 | 轻量高性能 |
| 运行时 | Node.js | 20+ | TypeScript 执行 |
| 数据库 | SQLite (better-sqlite3) | 11 | WAL 模式 |
| ORM | Drizzle ORM | 0.30 | 类型安全 |
| AI 文本 | GPT-4o / 豆包 Pro | - | 支持多 Provider |
| AI 图片 | Seedream 4.0 / 5.0 | - | 火山引擎 / MiniMax |
| AI 视频 | Seedance 1.0 Pro / 2.0 | - | 火山引擎 / MiniMax |

---

## 快速开始

### 环境要求

- Node.js >= 18
- npm >= 9

### 1. 克隆项目

```bash
git clone https://github.com/xiaobao0818/Game-Ad-Creative-Automation.git
cd Game-Ad-Creative-Automation/game-ad-workshop
```

### 2. 安装依赖

```bash
npm install
cd server && npm install
cd ../client && npm install
cd ..
```

### 3. 配置 AI API Key

```bash
cp server/.env.example server/.env
```

编辑 `server/.env`：

```bash
# ====== 使用火山引擎（推荐，国内首选） ======
AI_PROVIDER=volcengine
VOLCENGINE_API_KEY=你的火山引擎API密钥
VOLCENGINE_ARK_ENDPOINT_ID=ep-你的推理接入点ID

# ====== 或使用 MiniMax ======
# AI_PROVIDER=minimax
# OPENAI_API_KEY=sk-你的OpenAI密钥
# MINIMAX_API_KEY=你的MiniMax密钥
```

### 4. 启动

```bash
# 前端 + 后端同时启动
npm run dev

# 前端 → http://localhost:3000
# 后端 → http://localhost:3001
```

### 5. 开始使用

1. 准备一个素材文件夹，放入游戏相关图片和文字介绍
2. 打开浏览器访问 `http://localhost:3000`
3. 点击「新建项目」，填写项目名和素材文件夹路径
4. 点击「开始分析」→ AI 自动分析游戏特征
5. 点击「生成创意方向」→ 查看 4 个不同策略
6. 选择一个方向 → 点击「生成详细脚本」
7. 查看/复制提示词 → 点击「生成参考图」

---

## 使用指南

### 素材文件夹准备

推荐的素材文件夹结构：

```
my-game-assets/
├── 游戏介绍.txt           # 游戏世界观、核心玩法、特色系统
├── 角色介绍.md            # 主要角色说明
├── hero_01.png           # 主角展示图
├── hero_02.png           # 重要角色展示图
├── battle_scene_01.jpg   # 战斗场景截图
├── battle_scene_02.jpg   # 不同玩法场景
├── ui_home.jpg           # 主界面截图
├── ui_gacha.jpg          # 抽卡/福利界面
└── art_style_ref.webp    # 画风参考图
```

**素材建议**：
- 图片尽量清晰，至少 512px 宽
- 文字描述越详细越好（玩法、特色系统、付费点等）
- 图片数量建议 5-15 张，前 5 张会用于 AI 视觉分析

### 创意方向选择

每个方向有 8 种策略：

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

生成的 Seedance 视频提示词可直接用于：
- 火山引擎方舟 → Seedance 1.0 Pro
- MiniMax → Seedance 2.0

生成的 Seedream 参考图提示词可直接用于：
- 火山引擎方舟 → Seedream 4.0
- MiniMax → Seedream 5.0

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

使用：
- 文本：豆包（通过方舟推理接入点）
- 图片：豆包 Seedream 4.0
- 视频：豆包 Seedance 1.0 Pro

### 方案二：MiniMax 全链路

```bash
AI_PROVIDER=minimax
OPENAI_API_KEY=sk-xxxxxxxx
MINIMAX_API_KEY=你的MiniMax密钥
```

使用：
- 文本：OpenAI GPT-4o
- 图片：MiniMax Seedream 5.0
- 视频：MiniMax Seedance 2.0

### 方案三：混合模式

```bash
AI_PROVIDER=hybrid
VOLCENGINE_API_KEY=你的火山密钥
VOLCENGINE_ARK_ENDPOINT_ID=ep-xxxxxxxxxxxx
MINIMAX_API_KEY=你的MiniMax密钥
```

使用：
- 文本：火山引擎豆包
- 图片：MiniMax Seedream 5.0
- 视频：MiniMax Seedance 2.0

### 查看当前 Provider

启动后访问 `http://localhost:3001/api/provider` 查看当前活跃的 Provider 配置。

---

## API 文档

Base URL: `http://localhost:3001/api`

### 项目管理

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/projects` | 获取所有项目 |
| `POST` | `/projects` | 创建项目 |
| `GET` | `/projects/:id` | 获取项目详情 |
| `DELETE` | `/projects/:id` | 删除项目 |

### Pipeline 操作

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/projects/:id/analyze` | 扫描素材 + AI 分析游戏特征 |
| `POST` | `/projects/:id/directions` | 生成 4 个创意方向 |
| `GET` | `/projects/:id/directions` | 获取已有创意方向 |
| `POST` | `/projects/:id/generate-script` | 选定方向，生成详细脚本 |
| `POST` | `/projects/:id/generate-ref-images` | 调用 AI 生成参考图 |
| `GET` | `/projects/:id/scripts` | 获取项目下所有脚本 |

### 脚本管理

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/scripts/:id` | 获取脚本详情 |
| `PATCH` | `/scripts/:id` | 更新脚本内容 |
| `GET` | `/scripts/:id/ref-images` | 获取脚本的参考图 |
| `GET` | `/scripts/:id/videos` | 获取脚本的视频记录 |

### 生成状态轮询

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/scripts/ref-image/:id/check` | 查询参考图生成状态 |
| `GET` | `/scripts/video/:id/check` | 查询视频生成状态 |

### 系统

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/health` | 健康检查 |
| `GET` | `/provider` | 查看当前 AI Provider 配置 |

### Pipeline API 示例

**分析素材**：
```bash
curl -X POST http://localhost:3001/api/projects/1/analyze
```
返回：
```json
{
  "status": "analyzed",
  "gameProfile": {
    "gameGenre": "卡牌RPG",
    "artStyle": "二次元",
    "coreUSPs": ["精美立绘", "策略搭配", "福利丰厚"],
    "coreGameplay": "回合制策略卡牌对战",
    "emotionalTone": ["热血", "治愈"],
    "summary": "一款画风精美的二次元卡牌RPG..."
  },
  "stats": { "textCount": 2, "imageCount": 8 }
}
```

**生成创意方向**：
```bash
curl -X POST http://localhost:3001/api/projects/1/directions
```
返回：
```json
{
  "status": "ready",
  "directions": [
    {
      "id": "dir_1",
      "name": "抽卡逆袭",
      "strategy": "开局抽到废卡被嘲笑，关键时刻神卡觉醒",
      "hookType": "反转剧情",
      "targetEmotion": "热血",
      "rationale": "反转剧情能制造强烈反差...",
      "outline": "开局被虐→欧皇附体→战力碾压→下载"
    }
  ],
  "scriptIds": [1, 2, 3, 4]
}
```

**生成详细脚本**：
```bash
curl -X POST http://localhost:3001/api/projects/1/generate-script \
  -H "Content-Type: application/json" \
  -d '{"scriptId": 1, "direction": {...}}'
```

---

## 项目结构

```
game-ad-workshop/
├── package.json                    # Monorepo 根配置
├── README.md                       # 本文件
│
├── server/                         # 后端服务
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example                # 环境变量模板
│   └── src/
│       ├── index.ts                # 入口：启动服务、建表、挂载路由
│       ├── db/
│       │   ├── schema.ts           # Drizzle ORM 表定义（5 张表）
│       │   └── index.ts            # 数据库连接（SQLite WAL 模式）
│       ├── agents/                 # AI Agent 层
│       │   ├── asset-analyzer.ts   # 素材分析：输出 GameProfile
│       │   ├── script-generator.ts # 脚本创作：创意方向 + 详细脚本
│       │   ├── ref-image-generator.ts # 参考图提示词 + Seedream 调用
│       │   └── video-generator.ts  # 视频提示词 + Seedance 调用
│       ├── pipeline/
│       │   └── index.ts            # 流程编排：串联 5 个 Pipeline 阶段
│       ├── routes/
│       │   ├── projects.ts         # 项目 CRUD + Pipeline API
│       │   └── scripts.ts          # 脚本 CRUD + 生成状态轮询
│       └── services/               # 基础服务层
│           ├── provider-config.ts  # Provider 配置中心
│           ├── openai.ts           # 文本对话 + Vision（支持多 Provider）
│           ├── volcengine.ts       # 火山引擎图片/视频 API
│           ├── minimax.ts          # MiniMax 图片/视频 API
│           └── media-gen.ts        # 统一媒体生成抽象层
│
└── client/                         # 前端应用
    ├── package.json
    ├── nuxt.config.ts
    ├── app.vue                     # 根组件
    ├── assets/styles/main.css      # 暗色主题全局样式
    ├── pages/
    │   ├── index.vue               # 项目列表 + 创建弹窗
    │   └── projects/[id].vue       # 项目工作台（4 步流程）
    ├── components/
    │   └── SceneCard.vue           # 场景卡片（展示 Hook/玩法/CTA）
    └── composables/
        └── useApi.ts               # API 调用封装（useProjects/useScripts/useGenerationStatus）
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

### projects 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| name | TEXT | 项目名称 |
| description | TEXT | 项目描述 |
| game_genre | TEXT | 游戏类型 |
| art_style | TEXT | 画风 |
| asset_path | TEXT | 素材文件夹路径 |
| profile_json | TEXT | 完整 GameProfile JSON（分析结果持久化） |
| status | TEXT | 状态：draft / analyzed / directions_ready / done |
| created_at | TEXT | 创建时间 |
| updated_at | TEXT | 更新时间 |

### scripts 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| project_id | INTEGER | 外键 → projects |
| title | TEXT | 脚本标题 |
| hook_scene | TEXT | Hook 场景 JSON |
| gameplay_scenes | TEXT | 玩法场景数组 JSON |
| cta_scene | TEXT | CTA 场景 JSON |
| ref_image_prompts | TEXT | Seedream 参考图提示词数组 JSON |
| production_notes | TEXT | 制作备注 |
| status | TEXT | draft / direction / detailed / in_production / done |
| created_at | TEXT | 创建时间 |

### reference_images 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| script_id | INTEGER | 外键 → scripts |
| scene_key | TEXT | 场景标识（hook / gameplay_0 / gameplay_1 / cta） |
| prompt | TEXT | 生成提示词 |
| image_url | TEXT | 生成结果 URL |
| seedream_task_id | TEXT | Seedream 异步任务 ID |
| status | TEXT | pending / generating / done / failed |

### video_generations 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| script_id | INTEGER | 外键 → scripts |
| prompt | TEXT | Seedance 视频提示词 |
| video_url | TEXT | 生成结果 URL |
| seedance_task_id | TEXT | Seedance 异步任务 ID |
| status | TEXT | pending / generating / done / failed |
| duration | INTEGER | 时长（秒），默认 15 |

---

## 常见问题

### Q: 如何获取火山引擎 API Key 和推理接入点？

1. 注册 [火山引擎方舟控制台](https://console.volcengine.com/ark)
2. 创建 API Key（右上角 → API Key 管理）
3. 创建推理接入点（在线推理 → 创建接入点 → 选择豆包模型）
4. 将接入点 ID（形如 `ep-2024xxxxxxxx`）填入 `VOLCENGINE_ARK_ENDPOINT_ID`

### Q: 图片不会被 AI 分析到？

检查：
1. 图片格式是否为 `.png` / `.jpg` / `.webp` / `.gif`
2. 素材文件夹路径是否正确（绝对路径）
3. 服务器是否能访问该路径

### Q: 创意方向生成结果不理想？

- 确保游戏文字描述足够详细（玩法、特色系统、目标用户等）
- 素材图片清晰、有代表性
- 可以多次点击「生成创意方向」重新生成

### Q: 如何切换 AI Provider？

修改 `server/.env` 中的 `AI_PROVIDER` 值，重启服务生效。访问 `/api/provider` 确认切换成功。

### Q: 支持哪些图片和视频模型？

| Provider | 图片模型 | 视频模型 |
|----------|---------|---------|
| 火山引擎 | Seedream 4.0 | Seedance 1.0 Pro |
| MiniMax | Seedream 5.0 | Seedance 2.0 |

---

## License

MIT License

---

**Made with ❤️ by 小宝**
