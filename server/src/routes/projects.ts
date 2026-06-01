import { Hono } from 'hono'
import { db, schema } from '../db'
import { eq, desc, inArray } from 'drizzle-orm'
import {
  analyzeProject,
  generateDirections,
  generateScriptForDirection,
  generateReferenceImages,
  generateAdVideoForScript,
  loadGameProfile,
  assertScriptBelongsToProject,
} from '../pipeline'
import {
  ensureProjectUploadsDir,
  cleanupProjectUploads,
  isAllowedUploadExt,
  getProjectUploadsDir,
} from '../lib/uploads'
import path from 'path'
import fs from 'fs'

const app = new Hono()

/** 获取所有项目 */
app.get('/', async (c) => {
  const projects = await db.select().from(schema.projects).orderBy(desc(schema.projects.updatedAt))
  return c.json(projects)
})

/** 创建项目 */
app.post('/', async (c) => {
  const body = await c.req.json()
  if (!body.name) return c.json({ error: '项目名称不能为空' }, 400)
  const [project] = await db.insert(schema.projects).values({
    name: body.name,
    description: body.description || '',
    assetPath: body.assetPath || '',
  }).returning()
  return c.json(project, 201)
})

/** 获取单个项目 */
app.get('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  if (isNaN(id)) return c.json({ error: '无效的项目ID' }, 400)
  const project = await db.query.projects.findFirst({ where: eq(schema.projects.id, id) })
  if (!project) return c.json({ error: '项目不存在' }, 404)
  return c.json(project)
})

/** 删除项目 */
app.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  await db.delete(schema.projects).where(eq(schema.projects.id, id))
  // 同时清理 uploads 目录
  cleanupProjectUploads(id)
  return c.json({ ok: true })
})

// ========== 素材上传 ==========

/** 获取项目下已上传的素材列表 */
app.get('/:id/assets', async (c) => {
  const id = Number(c.req.param('id'))
  const rows = await db.select().from(schema.assets)
    .where(eq(schema.assets.projectId, id))
    .orderBy(desc(schema.assets.createdAt))
  return c.json(rows)
})

/** 上传素材文件（multipart/form-data，字段名 files） */
app.post('/:id/assets/upload', async (c) => {
  const id = Number(c.req.param('id'))

  const project = await db.query.projects.findFirst({ where: eq(schema.projects.id, id) })
  if (!project) return c.json({ error: '项目不存在' }, 404)

  const maxFileBytes = Number(process.env.MAX_UPLOAD_BYTES) || 50 * 1024 * 1024  // 50MB
  const maxFiles = Number(process.env.MAX_FILES_PER_UPLOAD) || 20

  let form: FormData
  try {
    form = await c.req.formData()
  } catch {
    return c.json({ error: '请求不是合法的 multipart/form-data' }, 400)
  }

  // 收集所有 files 字段（前端可能传多次同名字段）
  const fileEntries: File[] = []
  for (const [key, value] of form.entries()) {
    if (key !== 'files') continue
    if (value instanceof File) fileEntries.push(value)
  }

  if (fileEntries.length === 0) {
    return c.json({ error: '没有收到任何文件（请用 files 字段）' }, 400)
  }
  if (fileEntries.length > maxFiles) {
    return c.json({ error: `一次最多上传 ${maxFiles} 个文件,收到 ${fileEntries.length} 个` }, 400)
  }

  const uploadsDir = ensureProjectUploadsDir(id)
  const created: { id: number; filename: string; size: number; type: 'image' | 'text' }[] = []
  const rejected: { filename: string; reason: string }[] = []

  for (const file of fileEntries) {
    // 1) 文件名清洗：去掉路径前缀，只保留 basename
    const cleanName = path.basename(file.name || 'unnamed')
    if (!isAllowedUploadExt(cleanName)) {
      rejected.push({ filename: cleanName, reason: '不支持的文件类型（仅 .png/.jpg/.webp/.gif/.txt/.md）' })
      continue
    }
    if (file.size > maxFileBytes) {
      rejected.push({
        filename: cleanName,
        reason: `文件超过 ${(maxFileBytes / 1024 / 1024).toFixed(0)}MB`,
      })
      continue
    }
    if (file.size === 0) {
      rejected.push({ filename: cleanName, reason: '空文件' })
      continue
    }

    // 2) 写入磁盘（同名文件加后缀避免覆盖）
    const targetPath = getUniquePath(uploadsDir, cleanName)
    const buffer = Buffer.from(await file.arrayBuffer())
    fs.writeFileSync(targetPath, buffer)

    // 3) 入库
    const ext = path.extname(cleanName).toLowerCase()
    const isImage = ['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(ext)
    const [record] = await db.insert(schema.assets).values({
      projectId: id,
      type: isImage ? 'image' : 'text',
      filename: path.basename(targetPath),
      filePath: targetPath,
    }).returning({ id: schema.assets.id })

    created.push({
      id: record.id,
      filename: path.basename(targetPath),
      size: file.size,
      type: isImage ? 'image' : 'text',
    })
  }

  return c.json({
    ok: true,
    uploaded: created,
    rejected,
    uploadsDir,
    projectAssetPath: getProjectUploadsDir(id),
  }, 201)
})

/** 在 uploadsDir 下找一个不冲突的文件路径（同名加 _1 _2 ...） */
function getUniquePath(dir: string, filename: string): string {
  const ext = path.extname(filename)
  const base = path.basename(filename, ext)
  let candidate = path.join(dir, filename)
  let n = 1
  while (fs.existsSync(candidate)) {
    candidate = path.join(dir, `${base}_${n}${ext}`)
    n++
  }
  return candidate
}

/** 删除单个素材（同时删文件 + DB 记录） */
app.delete('/:id/assets/:assetId', async (c) => {
  const id = Number(c.req.param('id'))
  const assetId = Number(c.req.param('assetId'))
  if (isNaN(id) || isNaN(assetId)) {
    return c.json({ error: '无效的 ID' }, 400)
  }

  const asset = await db.query.assets.findFirst({
    where: eq(schema.assets.id, assetId),
  })
  if (!asset) return c.json({ error: '素材不存在' }, 404)
  if (asset.projectId !== id) {
    return c.json({ error: '素材不属于该项目' }, 403)
  }

  // 删磁盘文件（best-effort）
  try {
    if (fs.existsSync(asset.filePath)) {
      fs.unlinkSync(asset.filePath)
    }
  } catch (err) {
    console.warn(`[delete asset] 文件删除失败: ${asset.filePath}`, err)
  }
  // 删 DB 记录
  await db.delete(schema.assets).where(eq(schema.assets.id, assetId))
  return c.json({ ok: true })
})

// ========== Pipeline 阶段 API ==========

/** Stage 1+2: 扫描素材 + AI 分析游戏 */
app.post('/:id/analyze', async (c) => {
  const id = Number(c.req.param('id'))
  const project = await db.query.projects.findFirst({ where: eq(schema.projects.id, id) })
  if (!project) return c.json({ error: '项目不存在' }, 404)
  if (!project.assetPath) return c.json({ error: '请先设置素材文件夹路径' }, 400)

  try {
    const { gameProfile, texts, imagePaths } = await analyzeProject(id, project.assetPath)
    return c.json({
      status: 'analyzed',
      gameProfile,
      stats: { textCount: texts.length, imageCount: imagePaths.length },
    })
  } catch (err: any) {
    return c.json({ status: 'error', message: err?.message ?? String(err) }, 500)
  }
})

/** Stage 3: 生成创意方向 */
app.post('/:id/directions', async (c) => {
  const id = Number(c.req.param('id'))
  const project = await db.query.projects.findFirst({ where: eq(schema.projects.id, id) })
  if (!project) return c.json({ error: '项目不存在' }, 404)

  // 从数据库恢复完整的 gameProfile
  const gameProfile = loadGameProfile(project)

  try {
    const { directions, scriptIds } = await generateDirections(id, gameProfile)
    return c.json({ status: 'ready', directions, scriptIds })
  } catch (err: any) {
    return c.json({ status: 'error', message: err?.message ?? String(err) }, 500)
  }
})

/** 获取创意方向列表 */
app.get('/:id/directions', async (c) => {
  const id = Number(c.req.param('id'))
  const scripts = await db.select().from(schema.scripts)
    .where(eq(schema.scripts.projectId, id))
  return c.json(scripts.filter(s => s.status === 'direction'))
})

/** Stage 4: 选定方向，生成详细脚本 */
app.post('/:id/generate-script', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json()
  const { scriptId, directionIndex, direction } = body

  const project = await db.query.projects.findFirst({ where: eq(schema.projects.id, id) })
  if (!project) return c.json({ error: '项目不存在' }, 404)

  // IDOR 检查：scriptId 必须属于这个项目
  try {
    await assertScriptBelongsToProject(scriptId, id)
  } catch (err: any) {
    return c.json({ error: err.message }, 400)
  }

  // 从数据库恢复 gameProfile
  const gameProfile = loadGameProfile(project)

  // 如果提供了 directionIndex，从 stored profile 重新加载方向
  let finalDirection = direction
  if (directionIndex !== undefined && !finalDirection) {
    // 从 pipeline 暂存的 directions 不可用，这里需要 direction 对象由前端传入
    return c.json({ error: '缺少创意方向数据，请传入 direction 对象' }, 400)
  }

  if (!finalDirection) {
    return c.json({ error: '缺少 direction 参数' }, 400)
  }

  try {
    const detailedScript = await generateScriptForDirection(
      scriptId,
      gameProfile,
      finalDirection,
      project.assetPath || ''
    )
    return c.json({ status: 'done', script: detailedScript })
  } catch (err: any) {
    return c.json({ status: 'error', message: err?.message ?? String(err) }, 500)
  }
})

/** Stage 5: 为脚本生成参考图 */
app.post('/:id/generate-ref-images', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json()
  const { scriptId, refImagePrompts } = body

  if (!scriptId || !refImagePrompts?.length) {
    return c.json({ error: '缺少 scriptId 或 refImagePrompts' }, 400)
  }

  // IDOR 检查
  try {
    await assertScriptBelongsToProject(scriptId, id)
  } catch (err: any) {
    return c.json({ error: err.message }, 400)
  }

  try {
    const ids = await generateReferenceImages(scriptId, refImagePrompts)
    return c.json({ status: 'generating', refImageIds: ids })
  } catch (err: any) {
    return c.json({ status: 'error', message: err?.message ?? String(err) }, 500)
  }
})

/** Stage 6: 基于脚本和参考图，生成最终视频（Seedance） */
app.post('/:id/generate-video', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json()
  const { scriptId, refImageIds } = body

  if (!scriptId) {
    return c.json({ error: '缺少 scriptId' }, 400)
  }

  const project = await db.query.projects.findFirst({ where: eq(schema.projects.id, id) })
  if (!project) return c.json({ error: '项目不存在' }, 404)

  // IDOR 检查 + 引用图也要属于该脚本
  try {
    await assertScriptBelongsToProject(scriptId, id)
    if (refImageIds?.length) {
      const rows = await db.select({ id: schema.referenceImages.id, scriptId: schema.referenceImages.scriptId })
        .from(schema.referenceImages)
        .where(inArray(schema.referenceImages.id, refImageIds))
      const orphan = rows.find(r => r.scriptId !== scriptId)
      if (orphan) {
        return c.json({ error: `参考图 ${orphan.id} 不属于脚本 ${scriptId}` }, 400)
      }
    }
  } catch (err: any) {
    return c.json({ error: err.message }, 400)
  }

  try {
    const videoId = await generateAdVideoForScript(scriptId, refImageIds || [])
    return c.json({ status: 'generating', videoId })
  } catch (err: any) {
    return c.json({ status: 'error', message: err?.message ?? String(err) }, 500)
  }
})

/** 获取项目下所有脚本 */
app.get('/:id/scripts', async (c) => {
  const id = Number(c.req.param('id'))
  const scripts = await db.select().from(schema.scripts)
    .where(eq(schema.scripts.projectId, id))
    .orderBy(desc(schema.scripts.createdAt))

  return c.json(scripts)
})

export default app
