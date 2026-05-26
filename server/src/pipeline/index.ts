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
import fs from 'fs'
import path from 'path'

/**
 * Stage 1 + 2: 扫描素材 + AI 分析游戏特征
 * 分析结果完整存储在 project.profileJson 中
 */
export async function analyzeProject(
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
      profileJson: JSON.stringify(gameProfile),
      status: 'analyzed',
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.projects.id, projectId))

  return { gameProfile, texts, imagePaths }
}

/** 从项目记录中恢复完整的 GameProfile */
function loadGameProfile(project: any): GameProfile {
  try {
    const stored = JSON.parse(project.profileJson || '{}')
    if (stored.gameGenre) return stored as GameProfile
  } catch { /* fall through */ }

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
      hookScene: JSON.stringify({ copy: d.outline, visual: '', audio: '', time: '' }),
      gameplayScenes: '[]',
      ctaScene: JSON.stringify({ copy: '', visual: '', audio: '', time: '' }),
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
  const gameAssetsSummary = buildAssetsSummary(assetPath)
  const detailedScript = await generateDetailedScript(gameProfile, direction, gameAssetsSummary)

  // 更新脚本记录 — 存储完整内容（包括 refImagePrompts 和 productionNotes）
  await db.update(schema.scripts)
    .set({
      title: detailedScript.title,
      hookScene: JSON.stringify(detailedScript.hook),
      gameplayScenes: JSON.stringify(detailedScript.gameplayScenes),
      ctaScene: JSON.stringify(detailedScript.cta),
      fullCopy: [
        detailedScript.hook.copy,
        ...detailedScript.gameplayScenes.map(s => s.copy),
        detailedScript.cta.copy,
      ].join(' '),
      tone: detailedScript.tone,
      refImagePrompts: JSON.stringify(detailedScript.refImagePrompts || []),
      productionNotes: detailedScript.productionNotes || '',
      status: 'detailed',
    })
    .where(eq(schema.scripts.id, scriptId))

  return detailedScript
}

/**
 * Stage 5: 生成参考图（调用 Seedream 5.0）
 */
export async function generateReferenceImages(
  scriptId: number,
  refImagePrompts: { sceneKey: string; seedreamPrompt: string }[]
): Promise<number[]> {
  const ids: number[] = []

  for (const ref of refImagePrompts) {
    const [record] = await db.insert(schema.referenceImages).values({
      scriptId,
      sceneKey: ref.sceneKey,
      prompt: ref.seedreamPrompt,
      status: 'generating',
    }).returning({ id: schema.referenceImages.id })

    ids.push(record.id)

    try {
      const { taskId } = await genImage({
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
  }

  return ids
}

/** 汇总素材文件夹内容 */
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
