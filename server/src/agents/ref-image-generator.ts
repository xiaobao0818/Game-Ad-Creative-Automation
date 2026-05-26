import { genImage } from '../services/media-gen'
import { db, schema } from '../db'
import { eq } from 'drizzle-orm'
import type { DetailedScene } from './script-generator'

interface AdScriptLike {
  hook: DetailedScene
  gameplayScenes: DetailedScene[]
  cta: DetailedScene
  tone: string
}

const IMAGE_SYSTEM_PROMPT = `You are a professional game ad keyframe designer. Generate detailed image prompts for Seedream 5.0.

Requirements:
- 9:16 vertical aspect ratio for mobile ads
- High quality, cinematic lighting, game-like rendering
- Match the game's art style and emotional tone
- NO text/watermark/UI elements in the image
- Vivid colors, eye-catching composition suitable for ad thumbnails

For each scene, generate a prompt in this format:
{
  "sceneKey": "hook" | "gameplay_0" | "gameplay_1" | "cta",
  "prompt": "Detailed English prompt for Seedream 5.0",
  "styleNotes": "Style reference notes"
}`

export interface RefImageTask {
  sceneKey: string
  prompt: string
  styleNotes: string
}

export async function generateReferenceImagePrompts(
  script: AdScriptLike,
  artStyle: string,
  emotionalTone: string[]
): Promise<RefImageTask[]> {
  // 直接基于脚本的视觉描述生成 Seedream 提示词
  const tasks: RefImageTask[] = []

  // Hook 画面
  tasks.push({
    sceneKey: 'hook',
    prompt: `${script.hook.visual}, 9:16 vertical mobile ad keyframe, ${artStyle} art style, ${emotionalTone.join(', ')} mood, cinematic lighting, high quality game render, vivid colors, no text no watermark`,
    styleNotes: `风格: ${artStyle} | 基调: ${emotionalTone.join(', ')}`,
  })

  // 玩法画面
  script.gameplayScenes.forEach((scene, i) => {
    tasks.push({
      sceneKey: `gameplay_${i}`,
      prompt: `${scene.visual}, 9:16 vertical mobile ad keyframe, ${artStyle} art style, ${emotionalTone.join(', ')} mood, gameplay action shot, cinematic lighting, high quality game render, vivid colors, no text no watermark`,
      styleNotes: `风格: ${artStyle}`,
    })
  })

  // CTA 画面
  tasks.push({
    sceneKey: 'cta',
    prompt: `${script.cta.visual}, 9:16 vertical mobile ad end card, ${artStyle} art style, call to action background, cinematic lighting, high quality game render, vivid colors, no text no watermark`,
    styleNotes: `风格: ${artStyle} | CTA画面`,
  })

  return tasks
}

/** 批量调用 Seedream 生成参考图，返回数据库记录 */
export async function batchGenerateReferenceImages(
  scriptId: number,
  refTasks: RefImageTask[]
): Promise<number[]> {
  const ids: number[] = []

  for (const task of refTasks) {
    const [record] = await db.insert(schema.referenceImages).values({
      scriptId,
      sceneKey: task.sceneKey,
      prompt: task.prompt,
      status: 'generating',
    }).returning({ id: schema.referenceImages.id })
    ids.push(record.id)

    // 异步调用 Seedream（不等待结果）
    try {
      const { taskId } = await genImage({ prompt: task.prompt, aspectRatio: '9:16' })
      await db.update(schema.referenceImages)
        .set({ seedreamTaskId: taskId })
        .where(eq(schema.referenceImages.id, record.id))
    } catch (err) {
      console.error(`Seedream generation failed for scene ${task.sceneKey}:`, err)
      await db.update(schema.referenceImages)
        .set({ status: 'failed' })
        .where(eq(schema.referenceImages.id, record.id))
    }
  }

  return ids
}
