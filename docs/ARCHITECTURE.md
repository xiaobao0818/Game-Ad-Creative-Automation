# 游戏投放素材工坊 - 架构设计

## 概述

面向手机游戏视频广告的全流程自动化工具。输入游戏素材（文字+图片），AI 自动分析并生成多套广告脚本创意，用户选择调整后，系统调用 Seedream 5.0 生成参考图，再调用 Seedance 2.0 生成 15 秒竖屏视频广告。

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端 | Nuxt 3 + Vue 3 + TypeScript | SPA 模式，移动端优先 |
| 后端 | Hono (Node.js) + TypeScript | 轻量 API 服务 |
| 数据库 | SQLite + Drizzle ORM | 本地持久化 |
| AI 文本 | OpenAI GPT-4o | 素材分析、脚本生成 |
| AI 图片 | MiniMax Seedream 5.0 | 参考帧生成 |
| AI 视频 | MiniMax Seedance 2.0 | 最终视频生成 |

## Pipeline 流程（6 阶段）

```
素材上传 → 素材分析 → 脚本创意 → 用户审核 → 参考图生成 → 视频生成
   ↑           ↑          ↑         ↑           ↑            ↑
 assets/   analyzer   generator   scripts    seedream     seedance
```

### Stage 1: 素材上传 (Asset Ingestion)
- 用户选择游戏项目文件夹
- 系统扫描所有图片和文本文件
- 建立素材索引

### Stage 2: 素材分析 (Asset Analysis)
- AI 分析所有素材
- 提取：游戏类型、画风、角色、场景、玩法、卖点
- 生成结构化的游戏档案

### Stage 3: 脚本创意 (Script Generation)
- 基于游戏档案生成 3-5 套广告脚本
- 每套包含：Hook（前 3 秒）、核心展示、CTA
- 脚本文案适配 15 秒竖屏广告格式

### Stage 4: 用户审核 (User Review)
- 展示所有脚本供用户选择
- 支持修改脚本各元素
- 确认后进入生产阶段

### Stage 5: 参考图生成 (Reference Image)
- 调用 Seedream 5.0 为每个场景生成参考图
- 9:16 竖屏比例
- 风格与游戏美术保持一致

### Stage 6: 视频生成 (Video Generation)
- 组合参考图 + 视频提示词
- 调用 Seedance 2.0 生成 15 秒视频
- 异步任务轮询直到完成

## 项目结构

```
game-ad-workshop/
├── package.json
├── server/
│   ├── src/
│   │   ├── index.ts
│   │   ├── db/schema.ts
│   │   ├── agents/
│   │   │   ├── asset-analyzer.ts
│   │   │   ├── script-generator.ts
│   │   │   ├── ref-image-generator.ts
│   │   │   └── video-generator.ts
│   │   ├── pipeline/index.ts
│   │   ├── routes/
│   │   │   ├── projects.ts
│   │   │   ├── assets.ts
│   │   │   ├── scripts.ts
│   │   │   └── generation.ts
│   │   └── services/
│   │       ├── minimax.ts
│   │       └── openai.ts
├── client/
│   ├── nuxt.config.ts
│   ├── app.vue
│   ├── pages/
│   │   ├── index.vue
│   │   └── projects/[id].vue
│   ├── components/
│   └── composables/
```

## 数据库 Schema

### projects
- id, name, description, game_genre, art_style, asset_path, **profile_json**, status, created_at, updated_at
- profile_json 存储完整的 GameProfile（分析结果持久化）

### assets
- id, project_id, type, filename, file_path, ai_description, ai_tags, created_at

### scripts
- id, project_id, title, hook_scene, gameplay_scenes, cta_scene, full_copy, tone, **ref_image_prompts**, **production_notes**, status, created_at
- ref_image_prompts 存储参考图提示词（JSON）
- production_notes 存储制作备注

### reference_images
- id, script_id, scene_key, prompt, image_url, seedream_task_id, status, created_at

### video_generations
- id, script_id, prompt, ref_image_ids, video_url, seedance_task_id, status, duration, created_at
