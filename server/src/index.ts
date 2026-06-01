import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import projectsRouter from './routes/projects'
import scriptsRouter from './routes/scripts'
import { getActiveProviders } from './services/media-gen'
import { rawDb } from './db'

// 确保数据库表存在
rawDb.exec(`CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  game_genre TEXT DEFAULT '',
  art_style TEXT DEFAULT '',
  asset_path TEXT DEFAULT '',
  profile_json TEXT DEFAULT '{}',
  status TEXT DEFAULT 'draft',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
)`)
// 兼容旧表无 profile_json 列
try { rawDb.exec(`ALTER TABLE projects ADD COLUMN profile_json TEXT DEFAULT '{}'`) } catch {}
rawDb.exec(`CREATE TABLE IF NOT EXISTS assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  ai_description TEXT DEFAULT '',
  ai_tags TEXT DEFAULT '[]',
  created_at TEXT DEFAULT (datetime('now'))
)`)
rawDb.exec(`CREATE TABLE IF NOT EXISTS scripts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  hook_scene TEXT NOT NULL,
  gameplay_scenes TEXT NOT NULL,
  cta_scene TEXT NOT NULL,
  full_copy TEXT DEFAULT '',
  tone TEXT DEFAULT 'exciting',
  ref_image_prompts TEXT DEFAULT '[]',
  production_notes TEXT DEFAULT '',
  status TEXT DEFAULT 'draft',
  created_at TEXT DEFAULT (datetime('now'))
)`)
// 兼容旧表无新列
try { rawDb.exec(`ALTER TABLE scripts ADD COLUMN ref_image_prompts TEXT DEFAULT '[]'`) } catch {}
try { rawDb.exec(`ALTER TABLE scripts ADD COLUMN production_notes TEXT DEFAULT ''`) } catch {}
rawDb.exec(`CREATE TABLE IF NOT EXISTS reference_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  script_id INTEGER NOT NULL REFERENCES scripts(id) ON DELETE CASCADE,
  scene_key TEXT NOT NULL,
  prompt TEXT NOT NULL,
  image_url TEXT DEFAULT '',
  seedream_task_id TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now'))
)`)
rawDb.exec(`CREATE TABLE IF NOT EXISTS video_generations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  script_id INTEGER NOT NULL REFERENCES scripts(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  ref_image_ids TEXT DEFAULT '[]',
  video_url TEXT DEFAULT '',
  seedance_task_id TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',
  duration INTEGER DEFAULT 15,
  model TEXT DEFAULT '',
  resolution TEXT DEFAULT '',
  ratio TEXT DEFAULT '',
  error_message TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
)`)
// 兼容旧表（按需添加新列）
try { rawDb.exec(`ALTER TABLE video_generations ADD COLUMN model TEXT DEFAULT ''`) } catch {}
try { rawDb.exec(`ALTER TABLE video_generations ADD COLUMN resolution TEXT DEFAULT ''`) } catch {}
try { rawDb.exec(`ALTER TABLE video_generations ADD COLUMN ratio TEXT DEFAULT ''`) } catch {}
try { rawDb.exec(`ALTER TABLE video_generations ADD COLUMN error_message TEXT DEFAULT ''`) } catch {}

const app = new Hono()
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:3001')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)
app.use('/*', cors({
  origin: allowedOrigins,
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
}))

app.route('/api/projects', projectsRouter)
app.route('/api/scripts', scriptsRouter)
app.get('/api/health', (c) => c.json({ status: 'ok' }))
app.get('/api/provider', (c) => c.json(getActiveProviders()))

const port = Number(process.env.PORT) || 3001
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`🎮 游戏投放素材工坊 API: http://localhost:${port}`)
  console.log(`   表已就绪: projects, assets, scripts, reference_images, video_generations`)
})
