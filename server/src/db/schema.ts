import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export interface RefImagePrompt {
  sceneKey: string
  seedreamPrompt: string
}

export interface DetailedSceneJson {
  time: string
  visual: string
  audio?: string
  copy: string
  seedancePrompt?: string
}

export interface GameProfileJson {
  gameGenre: string
  artStyle: string
  coreUSPs: string[]
  targetAudience: { age: string; interests: string[] }
  coreGameplay: string
  emotionalTone: string[]
  summary: string
}

/** 游戏项目 */
export const projects = sqliteTable('projects', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description').default(''),
  gameGenre: text('game_genre').default(''),
  artStyle: text('art_style').default(''),
  assetPath: text('asset_path').default(''),
  profileJson: text('profile_json', { mode: 'json' }).$type<GameProfileJson>().default({} as GameProfileJson),
  status: text('status').default('draft'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
})

/** 素材文件 */
export const assets = sqliteTable('assets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),    // 'image' | 'text'
  filename: text('filename').notNull(),
  filePath: text('file_path').notNull(),
  aiDescription: text('ai_description').default(''),
  aiTags: text('ai_tags', { mode: 'json' }).$type<string[]>().default([] as string[]),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
})

/** 广告脚本 */
export const scripts = sqliteTable('scripts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  hookScene: text('hook_scene', { mode: 'json' }).$type<DetailedSceneJson>().notNull().default({} as DetailedSceneJson),
  gameplayScenes: text('gameplay_scenes', { mode: 'json' }).$type<DetailedSceneJson[]>().notNull().default([] as DetailedSceneJson[]),
  ctaScene: text('cta_scene', { mode: 'json' }).$type<DetailedSceneJson>().notNull().default({} as DetailedSceneJson),
  fullCopy: text('full_copy').default(''),
  tone: text('tone').default('exciting'),
  refImagePrompts: text('ref_image_prompts', { mode: 'json' }).$type<RefImagePrompt[]>().default([] as RefImagePrompt[]),
  productionNotes: text('production_notes').default(''),
  status: text('status').default('draft'),   // draft | direction | detailed | selected | in_production | done
  createdAt: text('created_at').default(sql`(datetime('now'))`),
})

/** 参考图生成记录 */
export const referenceImages = sqliteTable('reference_images', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  scriptId: integer('script_id').notNull().references(() => scripts.id, { onDelete: 'cascade' }),
  sceneKey: text('scene_key').notNull(),     // 'hook' | 'gameplay_0' | 'gameplay_1' | 'cta'
  prompt: text('prompt').notNull(),
  imageUrl: text('image_url').default(''),
  seedreamTaskId: text('seedream_task_id').default(''),
  status: text('status').default('pending'),  // pending | generating | done | failed
  createdAt: text('created_at').default(sql`(datetime('now'))`),
})

/** 视频生成记录 */
export const videoGenerations = sqliteTable('video_generations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  scriptId: integer('script_id').notNull().references(() => scripts.id, { onDelete: 'cascade' }),
  prompt: text('prompt').notNull(),
  refImageIds: text('ref_image_ids', { mode: 'json' }).$type<number[]>().default([] as number[]),
  videoUrl: text('video_url').default(''),
  seedanceTaskId: text('seedance_task_id').default(''),
  status: text('status').default('pending'),   // pending | generating | done | failed
  duration: integer('duration').default(15),
  /** 实际用到的视频模型名（便于排查） */
  model: text('model').default(''),
  /** 分辨率（720p / 1080p 等） */
  resolution: text('resolution').default(''),
  /** 画幅（9:16 / 16:9 等） */
  ratio: text('ratio').default(''),
  /** 上游/SDK 报错信息 */
  errorMessage: text('error_message').default(''),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
})
