import { db, schema } from '../db'
import { eq } from 'drizzle-orm'
import { analyzeGameAssets, type GameProfile } from '../agents/asset-analyzer'
import {
  generateCreativeDirections,
  generateDetailedScript,
  type CreativeDirection,
  type DetailedScript,
} from '../agents/script-generator'
import { genImage } from '../services/media-gen'
import { generateAdVideo } from '../agents/video-generator'
import { getProjectUploadsDir } from '../lib/uploads'
import fs from 'fs'
import path from 'path'

/**
 * Stage 1 + 2: 扫描素材 + AI 分析游戏特征
 * 分析结果完整存储在 project.profileJson 中
 *
 * assetPath 留空时默认读 uploads dir。
 */
export async function analyzeProject(
  projectId: number,
  assetPath: string
): Promise<{ gameProfile: GameProfile; texts: string[]; imagePaths: string[] }> {
  const resolvedPath = resolveAssetDir(projectId, assetPath)
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`素材文件夹不存在: ${resolvedPath}`)
  }
  // 用 resolvedPath 替换原 assetPath 在函数内的使用
  return await analyzeProjectInDir(projectId, resolvedPath)
}

async function analyzeProjectInDir(
  projectId: number,
  assetPath: string
): Promise<{ gameProfile: GameProfile; texts: string[]; imagePaths: string[] }> {
  if (!fs.existsSync(assetPath)) {
    throw new Error(`素材文件夹不存在: ${assetPath}`)
  }

  // 清理旧素材记录，避免重复
  await db.delete(schema.assets).where(eq(schema.assets.projectId, projectId))

  const texts: string[] = []
  const imagePaths: string[] = []

  const files = fs.readdirSync(assetPath)
  for (const file of files) {
    const fullPath = path.join(assetPath, file)
    const ext = path.extname(file).toLowerCase()

    if (['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(ext)) {
      imagePaths.push(fullPath)
      await db.insert(schema.assets).values({
        projectId,
        type: 'image',
        filename: file,
        filePath: fullPath,
      })
    } else if (['.txt', '.md'].includes(ext)) {
      const content = fs.readFileSync(fullPath, 'utf-8')
      texts.push(content)
    }
  }

  if (texts.length === 0 && imagePaths.length === 0) {
    throw new Error('素材文件夹中没有找到图片或文本文件（支持 .png .jpg .webp .txt .md）')
  }

  // 保存文本内容为素材记录
  if (texts.length > 0) {
    await db.insert(schema.assets).values({
      projectId,
      type: 'text',
      filename: 'game_description',
      filePath: assetPath,
      aiDescription: texts.join('\n\n'),
    })
  }

  // AI 分析游戏（传本地路径，openai 服务会自动转 base64）
  const gameProfile = await analyzeGameAssets(texts, imagePaths.map(() => ''), imagePaths.slice(0, 5))

  // 完整保存 gameProfile 到项目，同时也存关键字段便于列表展示
  await db.update(schema.projects)
    .set({
      gameGenre: gameProfile.gameGenre,
      artStyle: gameProfile.artStyle,
      profileJson: gameProfile,
      status: 'analyzed',
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.projects.id, projectId))

  return { gameProfile, texts, imagePaths }
}

/** 从项目记录中恢复完整的 GameProfile */
function loadGameProfile(project: typeof schema.projects.$inferSelect): GameProfile {
  const stored = project.profileJson
  if (stored && stored.gameGenre) {
    return stored as unknown as GameProfile
  }
  // 兼容旧数据：从单字段重建
  return {
    gameGenre: project.gameGenre || '',
    artStyle: project.artStyle || '',
    coreUSPs: [],
    targetAudience: { age: '18-35', interests: [] },
    coreGameplay: '',
    emotionalTone: [],
    summary: project.description || '',
  }
}

/**
 * 校验 scriptId 是否属于指定 project（防 IDOR）。
 * 不属于则抛出（路由层 try/catch 会转成 400/404）。
 */
export async function assertScriptBelongsToProject(scriptId: number, projectId: number): Promise<void> {
  if (!scriptId || isNaN(scriptId)) throw new Error(`无效的 scriptId: ${scriptId}`)
  const script = await db.query.scripts.findFirst({
    where: eq(schema.scripts.id, scriptId),
    columns: { id: true, projectId: true },
  })
  if (!script) throw new Error(`脚本不存在: ${scriptId}`)
  if (script.projectId !== projectId) {
    throw new Error(`脚本 ${scriptId} 不属于项目 ${projectId}`)
  }
}

/** 通过 scriptId 查 projectId(只取 projectId 字段) */
async function getProjectIdByScriptId(scriptId: number): Promise<number> {
  const script = await db.query.scripts.findFirst({
    where: eq(schema.scripts.id, scriptId),
    columns: { projectId: true },
  })
  return script?.projectId ?? 0
}

/**
 * Stage 3: 生成创意方向（供用户选择）
 * 返回 direction 数据以及对应的脚本 ID 列表
 */
export async function generateDirections(
  projectId: number,
  gameProfile: GameProfile
): Promise<{ directions: CreativeDirection[]; scriptIds: number[] }> {
  const directions = await generateCreativeDirections(gameProfile)

  const scriptIds: number[] = []
  for (const d of directions) {
    const [record] = await db.insert(schema.scripts).values({
      projectId,
      title: d.name,
      hookScene: { copy: d.outline, visual: '', audio: '', time: '' } as any,
      gameplayScenes: [] as any,
      ctaScene: { copy: '', visual: '', audio: '', time: '' } as any,
      fullCopy: `${d.strategy} | ${d.rationale}`,
      tone: d.targetEmotion,
      status: 'direction',
    }).returning({ id: schema.scripts.id })
    scriptIds.push(record.id)
  }

  await db.update(schema.projects)
    .set({ status: 'directions_ready', updatedAt: new Date().toISOString() })
    .where(eq(schema.projects.id, projectId))

  return { directions, scriptIds }
}

/**
 * Stage 4: 基于选定方向，生成详细脚本和提示词
 */
export async function generateScriptForDirection(
  scriptId: number,
  gameProfile: GameProfile,
  direction: CreativeDirection,
  assetPath: string
): Promise<DetailedScript> {
  const gameAssetsSummary = buildAssetsSummaryForProject(scriptId ? await getProjectIdByScriptId(scriptId) : 0, assetPath)
  const detailedScript = await generateDetailedScript(gameProfile, direction, gameAssetsSummary)

  // 更新脚本记录 — 存储完整内容（包括 refImagePrompts 和 productionNotes）
  await db.update(schema.scripts)
    .set({
      title: detailedScript.title,
      hookScene: detailedScript.hook as any,
      gameplayScenes: detailedScript.gameplayScenes as any,
      ctaScene: detailedScript.cta as any,
      fullCopy: [
        detailedScript.hook.copy,
        ...detailedScript.gameplayScenes.map(s => s.copy),
        detailedScript.cta.copy,
      ].join(' '),
      tone: detailedScript.tone,
      refImagePrompts: detailedScript.refImagePrompts || [],
      productionNotes: detailedScript.productionNotes || '',
      status: 'detailed',
    })
    .where(eq(schema.scripts.id, scriptId))

  return detailedScript
}

/**
 * Stage 5: 生成参考图（调用 Seedream）
 * 串行失败被吞的旧实现换成并行 + 简单重试
 */
export async function generateReferenceImages(
  scriptId: number,
  refImagePrompts: { sceneKey: string; seedreamPrompt: string }[]
): Promise<number[]> {
  // 1) 并行插入所有 referenceImages 行
  const records = await db.insert(schema.referenceImages)
    .values(
      refImagePrompts.map(ref => ({
        scriptId,
        sceneKey: ref.sceneKey,
        prompt: ref.seedreamPrompt,
        status: 'generating' as const,
      }))
    )
    .returning({ id: schema.referenceImages.id })

  const ids = records.map(r => r.id)

  // 2) 并行触发 Seedream 任务（写入 taskId 或标记 failed）
  await Promise.all(records.map(async (record, i) => {
    const ref = refImagePrompts[i]
    try {
      const { taskId } = await callGenImageWithRetry({
        prompt: ref.seedreamPrompt,
        aspectRatio: '9:16',
        negativePrompt: 'low quality, blurry, distorted, watermark, text, UI, logo, letters',
      })
      await db.update(schema.referenceImages)
        .set({ seedreamTaskId: taskId })
        .where(eq(schema.referenceImages.id, record.id))
    } catch (err) {
      console.error(`Seedream failed for ${ref.sceneKey}:`, err)
      await db.update(schema.referenceImages)
        .set({ status: 'failed' })
        .where(eq(schema.referenceImages.id, record.id))
    }
  }))

  return ids
}

/** 调用 genImage，失败时简单退避重试 */
async function callGenImageWithRetry(
  params: Parameters<typeof genImage>[0],
  maxRetries = 2
): Promise<{ taskId: string }> {
  let lastErr: unknown
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await genImage(params)
    } catch (err) {
      lastErr = err
      if (attempt === maxRetries) break
      const waitMs = 500 * Math.pow(2, attempt)
      await new Promise(r => setTimeout(r, waitMs))
    }
  }
  throw lastErr
}

/**
 * Stage 6: 基于脚本 + 已生成的参考图，调用 Seedance 生成最终视频
 * 复用了 agents/video-generator.ts 中的 assembleVideoPrompt 和 generateAdVideo 逻辑
 */
export async function generateAdVideoForScript(
  scriptId: number,
  refImageIds: number[]
): Promise<number> {
  const script = await db.query.scripts.findFirst({ where: eq(schema.scripts.id, scriptId) })
  if (!script) throw new Error(`脚本不存在: ${scriptId}`)

  // 加载参考图以拿到 imageUrl（供 Seedance 作为首帧）
  const refImageRows = await db.select().from(schema.referenceImages)
    .where(eq(schema.referenceImages.scriptId, scriptId))
  const refImageUrls: Record<string, string> = {}
  for (const img of refImageRows) {
    if (img.imageUrl) refImageUrls[img.sceneKey] = img.imageUrl
  }

  // 标记脚本进入 production
  await db.update(schema.scripts)
    .set({ status: 'in_production', updatedAt: new Date().toISOString() } as any)
    .where(eq(schema.scripts.id, scriptId))

  return await generateAdVideo(
    scriptId,
    {
      hook: script.hookScene as any,
      gameplayScenes: (script.gameplayScenes as any) || [],
      cta: script.ctaScene as any,
      tone: script.tone || 'exciting',
    },
    refImageIds,
    refImageUrls
  )
}

/** 决定本次分析/汇总使用的素材目录。优先项目自带的 assetPath，否则用 uploads dir */
function resolveAssetDir(projectId: number, assetPath: string): string {
  if (assetPath && fs.existsSync(assetPath)) return assetPath
  const uploadsDir = getProjectUploadsDir(projectId)
  if (fs.existsSync(uploadsDir)) return uploadsDir
  // 都没有：让上层报错（"素材文件夹不存在"）
  return assetPath || uploadsDir
}

/** 汇总素材文件夹内容 */
function buildAssetsSummaryForProject(projectId: number, assetPath: string): string {
  return buildAssetsSummary(resolveAssetDir(projectId, assetPath))
}

function buildAssetsSummary(assetPath: string): string {
  if (!fs.existsSync(assetPath)) return '暂无素材'

  const parts: string[] = []
  const files = fs.readdirSync(assetPath)

  const imageFiles = files.filter(f => /\.(png|jpg|jpeg|webp|gif)$/i.test(f))
  const textFiles = files.filter(f => /\.(txt|md)$/i.test(f))

  if (imageFiles.length > 0) {
    parts.push(`可用图片素材 (${imageFiles.length}张): ${imageFiles.join(', ')}`)
  }

  for (const tf of textFiles) {
    const content = fs.readFileSync(path.join(assetPath, tf), 'utf-8').slice(0, 2000)
    parts.push(`文本素材 [${tf}]: ${content}`)
  }

  return parts.join('\n\n') || '暂无素材'
}

export { loadGameProfile }
