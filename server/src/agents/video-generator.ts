import { genVideo } from '../services/media-gen'
import { db, schema } from '../db'
import { eq } from 'drizzle-orm'
import type { DetailedScene } from './script-generator'

interface AdScriptLike {
  hook: DetailedScene
  gameplayScenes: DetailedScene[]
  cta: DetailedScene
  tone: string
}

interface VideoPromptParts {
  fullPrompt: string
  firstFrameImageUrl?: string
}

/**
 * 将脚本所有场景拼接为一个连续的视频提示词
 * Seedance 2.0 支持通过提示词描述整个视频的运动和转场
 */
export function assembleVideoPrompt(script: AdScriptLike, refImageUrls: Record<string, string>): VideoPromptParts {
  const scenes = [
    `[0-3s] ${script.hook.visual}. Camera movement: dramatic reveal.`,
    ...script.gameplayScenes.map((s, i) => {
      const startTime = 3 + i * 5
      const endTime = startTime + 5
      return `[${startTime}-${endTime}s] ${s.visual}. Camera movement: smooth pan, action focus.`
    }),
    `[13-15s] ${script.cta.visual}. Camera movement: zoom out to full frame.`,
  ]

  const styleNotes = [
    `Art style: game-like cinematic render.`,
    `Aspect ratio: 9:16 vertical mobile format.`,
    `Duration: 15 seconds.`,
    `Transitions: smooth cinematic cuts, dynamic camera movements.`,
    `Quality: high fidelity, vibrant colors, anti-aliased, 30fps smooth motion.`,
    `Overall mood: ${script.tone}.`,
  ]

  const fullPrompt = [
    ...scenes,
    '',
    'Style requirements:',
    ...styleNotes,
  ].join('\n')

  return {
    fullPrompt,
    firstFrameImageUrl: refImageUrls['hook'],
  }
}

/** 调用 Seedance 2.0 生成视频 */
export async function generateAdVideo(
  scriptId: number,
  script: AdScriptLike,
  refImageIds: number[],
  refImageUrls: Record<string, string>
): Promise<number> {
  const { fullPrompt, firstFrameImageUrl } = assembleVideoPrompt(script, refImageUrls)

  const [record] = await db.insert(schema.videoGenerations).values({
    scriptId,
    prompt: fullPrompt,
    refImageIds: JSON.stringify(refImageIds),
    status: 'generating',
    duration: 15,
  }).returning({ id: schema.videoGenerations.id })

  try {
    const { taskId } = await genVideo({
      prompt: fullPrompt,
      firstFrameImage: firstFrameImageUrl,
      duration: 15,
      aspectRatio: '9:16',
    })
    await db.update(schema.videoGenerations)
      .set({ seedanceTaskId: taskId })
      .where(eq(schema.videoGenerations.id, record.id))
  } catch (err) {
    console.error('Seedance video generation failed:', err)
    await db.update(schema.videoGenerations)
      .set({ status: 'failed' })
      .where(eq(schema.videoGenerations.id, record.id))
  }

  return record.id
}
