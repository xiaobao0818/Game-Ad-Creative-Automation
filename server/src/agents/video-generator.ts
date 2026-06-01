import { volcGenerateVideo, type VolcVideoRequest } from '../services/volcengine'
import { getProviderConfig } from '../services/provider-config'
import { db, schema } from '../db'
import { eq } from 'drizzle-orm'
import type { DetailedScene } from './script-generator'

interface AdScriptLike {
  hook: DetailedScene
  gameplayScenes: DetailedScene[]
  cta: DetailedScene
  tone: string
}

export interface VideoPromptParts {
  /** 给 Seedance 的整段自然语言描述（场景分段 + 全局风格） */
  text: string
  /** 多模态参考图 URL 列表（按 hook → gameplay_0 → gameplay_1 → cta 顺序） */
  imageUrls: string[]
}

/**
 * 拼接 Seedance 视频提示词。
 * 不再用 OpenAI 风格的 [0-3s] 时间戳前缀，改用自然语言场景分段 + 全局风格说明，
 * 符合 Seedance 1.5 Pro / 2.0 提示词指南的写法。
 */
export function assembleVideoPrompt(
  script: AdScriptLike,
  refImageUrls: Record<string, string>
): VideoPromptParts {
  const sceneBlocks: string[] = []

  sceneBlocks.push(`【开场冲击 · 0-3 秒】\n${script.hook.visual}`)

  script.gameplayScenes.forEach((s, i) => {
    sceneBlocks.push(`【玩法展示 ${i + 1} · ${s.time || `${3 + i * 5}-${3 + (i + 1) * 5} 秒`}】\n${s.visual}`)
  })

  sceneBlocks.push(`【行动号召 · 13-15 秒】\n${script.cta.visual}`)

  // 全局风格 + 运镜 + 节奏（Seedance 对这些提示非常敏感，建议显式写出）
  const styleBlock = [
    '',
    '【整体风格】',
    '画风: 游戏级电影感渲染，色彩饱和，光影强烈。',
    '运镜: 连续的电影感剪辑，开场有强烈推拉镜头，过程中多用平移和跟随镜头，结尾轻微拉远收束。',
    '节奏: 15 秒紧凑叙事，前 3 秒必须抓眼球，结尾给观众明确的行动指引。',
    `整体情绪: ${script.tone || '热血、激动'}。`,
    '画面: 9:16 竖屏，移动端信息流广告质感，高保真 30 帧流畅运镜。',
  ].join('\n')

  const text = sceneBlocks.join('\n\n') + '\n' + styleBlock

  // 参考图按 hook → gameplay_0 → gameplay_1 → cta 顺序排，前面有就放
  const imageUrls: string[] = []
  if (refImageUrls.hook) imageUrls.push(refImageUrls.hook)
  if (refImageUrls.gameplay_0) imageUrls.push(refImageUrls.gameplay_0)
  if (refImageUrls.gameplay_1) imageUrls.push(refImageUrls.gameplay_1)
  if (refImageUrls.cta) imageUrls.push(refImageUrls.cta)

  return { text, imageUrls }
}

/**
 * 直接调用火山方舟 Seedance 提交视频任务（不走 media-gen 的通用路由）。
 * 返回新建的 videoGenerations 行 ID。
 */
export async function generateAdVideo(
  scriptId: number,
  script: AdScriptLike,
  refImageIds: number[],
  refImageUrls: Record<string, string>
): Promise<number> {
  const cfg = getProviderConfig().volcengine
  const { text, imageUrls } = assembleVideoPrompt(script, refImageUrls)

  // 先写库（status=generating），拿自增 ID
  const [record] = await db.insert(schema.videoGenerations).values({
    scriptId,
    prompt: text,
    refImageIds,
    status: 'generating',
    duration: 15,
    model: cfg.videoModel,
    resolution: cfg.videoResolution || '720p',
    ratio: cfg.videoRatio || '9:16',
  } as any).returning({ id: schema.videoGenerations.id })

  const req: VolcVideoRequest = {
    text,
    imageUrls,
    ratio: (cfg.videoRatio as VolcVideoRequest['ratio']) || '9:16',
    duration: 15,
    resolution: (cfg.videoResolution as VolcVideoRequest['resolution']) || '720p',
    watermark: cfg.videoWatermark ?? false,
  }

  try {
    const { taskId } = await volcGenerateVideo(req)
    // 把 taskId 写回 DB；如果这一句失败,上游 task 已经在跑了,任务会"孤儿"存在。
    // 用单独 try/catch 捕获并打日志,运营可以从上游控制台拿 task_id 手工补 DB。
    try {
      await db.update(schema.videoGenerations)
        .set({ seedanceTaskId: taskId })
        .where(eq(schema.videoGenerations.id, record.id))
    } catch (dbErr) {
      console.error(
        `[generateAdVideo] 上游任务已创建 (taskId=${taskId}) 但 DB 写入 seedanceTaskId 失败:`,
        dbErr
      )
    }
  } catch (err) {
    console.error('Seedance video generation failed:', err)
    await db.update(schema.videoGenerations)
      .set({
        status: 'failed',
        errorMessage: err instanceof Error ? err.message : String(err),
      })
      .where(eq(schema.videoGenerations.id, record.id))
  }

  return record.id
}
