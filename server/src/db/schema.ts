import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

/** 游戏项目 */
export const projects = sqliteTable('projects', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description').default(''),
  gameGenre: text('game_genre').default(''),
  artStyle: text('art_style').default(''),
  assetPath: text('asset_path').default(''),
  profileJson: text('profile_json').default('{}'),   // 完整 GameProfile JSON
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
  aiTags: text('ai_tags').default('[]'),   // JSON array
  createdAt: text('created_at').default(sql`(datetime('now'))`),
})

/** 广告脚本 */
export const scripts = sqliteTable('scripts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  hookScene: text('hook_scene').notNull(),
  gameplayScenes: text('gameplay_scenes').notNull(),   // JSON array of scenes
  ctaScene: text('cta_scene').notNull(),
  fullCopy: text('full_copy').default(''),
  tone: text('tone').default('exciting'),
  refImagePrompts: text('ref_image_prompts').default('[]'),  // JSON: RefImagePrompt[]
  productionNotes: text('production_notes').default(''),
  status: text('status').default('draft'),   // draft | direction | detailed | selected | in_production
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
  refImageIds: text('ref_image_ids').default('[]'),  // JSON array of reference image IDs
  videoUrl: text('video_url').default(''),
  seedanceTaskId: text('seedance_task_id').default(''),
  status: text('status').default('pending'),   // pending | generating | done | failed
  duration: integer('duration').default(15),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
})
