import { Hono } from 'hono'
import { db, schema } from '../db'
import { eq } from 'drizzle-orm'
import { queryImageGenTask, queryVideoGenTask } from '../services/media-gen'

const app = new Hono()

// 状态白名单：避免 PATCH 写入任意值
const SCRIPT_STATUS_VALUES = new Set(['draft', 'direction', 'detailed', 'in_production', 'done'])

/** 更新脚本内容（用户编辑后保存） */
app.patch('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json()

  const updates: Partial<typeof schema.scripts.$inferInsert> = {}
  if (body.title !== undefined) updates.title = body.title
  if (body.hookScene !== undefined) updates.hookScene = body.hookScene
  if (body.gameplayScenes !== undefined) updates.gameplayScenes = body.gameplayScenes
  if (body.ctaScene !== undefined) updates.ctaScene = body.ctaScene
  if (body.fullCopy !== undefined) updates.fullCopy = body.fullCopy
  if (body.status !== undefined) {
    if (!SCRIPT_STATUS_VALUES.has(body.status)) {
      return c.json({ error: `无效的 status 值: ${body.status}` }, 400)
    }
    updates.status = body.status
  }
  if (body.tone !== undefined) updates.tone = body.tone
  if (body.refImagePrompts !== undefined) updates.refImagePrompts = body.refImagePrompts
  if (body.productionNotes !== undefined) updates.productionNotes = body.productionNotes

  if (Object.keys(updates).length === 0) {
    return c.json({ error: '没有要更新的字段' }, 400)
  }

  await db.update(schema.scripts).set(updates).where(eq(schema.scripts.id, id))
  const updated = await db.query.scripts.findFirst({ where: eq(schema.scripts.id, id) })
  if (!updated) return c.json({ error: '脚本不存在' }, 404)

  return c.json(updated)
})

/** 获取单个脚本详情 */
app.get('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const script = await db.query.scripts.findFirst({ where: eq(schema.scripts.id, id) })
  if (!script) return c.json({ error: '脚本不存在' }, 404)
  return c.json(script)
})

/** 获取脚本的参考图 */
app.get('/:id/ref-images', async (c) => {
  const id = Number(c.req.param('id'))
  const images = await db.select().from(schema.referenceImages)
    .where(eq(schema.referenceImages.scriptId, id))
  return c.json(images)
})

/** 获取脚本的视频生成记录 */
app.get('/:id/videos', async (c) => {
  const id = Number(c.req.param('id'))
  const videos = await db.select().from(schema.videoGenerations)
    .where(eq(schema.videoGenerations.scriptId, id))
  return c.json(videos)
})

// ========== 生成状态轮询 ==========

/** 轮询参考图状态 */
app.get('/ref-image/:id/check', async (c) => {
  const id = Number(c.req.param('id'))
  const img = await db.query.referenceImages.findFirst({ where: eq(schema.referenceImages.id, id) })
  if (!img) return c.json({ error: '记录不存在' }, 404)
  if (!img.seedreamTaskId) return c.json({ status: 'pending' })

  try {
    const result = await queryImageGenTask(img.seedreamTaskId)
    if (result.status === 'completed' && result.outputUrl) {
      await db.update(schema.referenceImages)
        .set({ status: 'done', imageUrl: result.outputUrl })
        .where(eq(schema.referenceImages.id, id))
    } else if (result.status === 'failed') {
      await db.update(schema.referenceImages)
        .set({
          status: 'failed',
          // 参考图表没加 errorMessage 列,放 prompt 末尾或省略;此处不写避免破坏 schema
        })
        .where(eq(schema.referenceImages.id, id))
    }
    return c.json(result)
  } catch (err: any) {
    return c.json({ status: 'error', message: err?.message ?? String(err) }, 500)
  }
})

/** 轮询视频状态 */
app.get('/video/:id/check', async (c) => {
  const id = Number(c.req.param('id'))
  const video = await db.query.videoGenerations.findFirst({ where: eq(schema.videoGenerations.id, id) })
  if (!video) return c.json({ error: '记录不存在' }, 404)
  if (!video.seedanceTaskId) return c.json({ status: 'pending' })

  try {
    const result = await queryVideoGenTask(video.seedanceTaskId)
    if (result.status === 'completed' && result.outputUrl) {
      await db.update(schema.videoGenerations)
        .set({ status: 'done', videoUrl: result.outputUrl })
        .where(eq(schema.videoGenerations.id, id))
    } else if (result.status === 'failed') {
      await db.update(schema.videoGenerations)
        .set({
          status: 'failed',
          errorMessage: result.errorMessage || '视频生成失败(上游未返回原因)',
        })
        .where(eq(schema.videoGenerations.id, id))
    }
    return c.json(result)
  } catch (err: any) {
    return c.json({ status: 'error', message: err?.message ?? String(err) }, 500)
  }
})

export default app
