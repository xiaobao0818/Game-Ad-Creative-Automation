import { chat } from '../services/openai'
import type { GameProfile } from './asset-analyzer'

/**
 * 创意方向 — 高层级的广告策略概念，供用户选择
 */
export interface CreativeDirection {
  id: string
  name: string
  strategy: string       // 策略说明
  hookType: string       // Hook 类型
  targetEmotion: string  // 目标情绪
  rationale: string      // 为什么适合这个游戏
  outline: string        // 15秒视频大纲（一句话）
}

const DIRECTION_SYSTEM_PROMPT = `你是顶级游戏广告创意策划。基于游戏分析结果，提出4个不同的视频广告创意方向。

每个方向需要完全不同的策略角度。从以下角度中选择组合：
- 反转剧情：从失败到逆袭
- 福利诱惑：送资源/SSR/648抽
- 玩法秀：酷炫操作/阵容搭配
- 悬念揭秘：神秘剧情/隐藏内容
- 对比反差：新老玩家/氪金vs零氪
- 社交炫耀：公会/排行/皮肤
- 挑战刺激：高难度通关/极限操作
- 情感共鸣：角色故事/剧情代入

输出JSON格式（只输出JSON）：
{
  "directions": [
    {
      "id": "dir_1",
      "name": "方向名称（10字以内）",
      "strategy": "策略说明（30字）",
      "hookType": "反转剧情/福利诱惑/玩法秀/悬念揭秘/对比反差/社交炫耀/挑战刺激/情感共鸣",
      "targetEmotion": "热血/好奇/羡慕/紧张/治愈/搞笑",
      "rationale": "为什么适合这个游戏（50字）",
      "outline": "15秒视频一句话大纲"
    }
  ]
}`

export async function generateCreativeDirections(gameProfile: GameProfile): Promise<CreativeDirection[]> {
  const userPrompt = [
    '游戏信息：',
    `- 类型：${gameProfile.gameGenre}`,
    `- 画风：${gameProfile.artStyle}`,
    `- 核心卖点：${gameProfile.coreUSPs.join('、')}`,
    `- 核心玩法：${gameProfile.coreGameplay}`,
    `- 情绪基调：${gameProfile.emotionalTone.join('、')}`,
    `- 目标用户：${gameProfile.targetAudience.age}岁，${gameProfile.targetAudience.interests.join('、')}`,
    `- 概述：${gameProfile.summary}`,
    '',
    `请为这款游戏生成4个完全不同的15秒竖屏广告创意方向。`,
  ].join('\n')

  const result = await chat({
    systemPrompt: DIRECTION_SYSTEM_PROMPT,
    userPrompt,
    temperature: 0.9,
    maxTokens: 4000,
  })

  const cleaned = result.replace(/```json\n?/g, '').replace(/```/g, '').trim()
  return (JSON.parse(cleaned) as { directions: CreativeDirection[] }).directions
}

/**
 * 详细脚本 — 基于用户选择的创意方向，生成详细的视频脚本和提示词
 */
const SCRIPT_SYSTEM_PROMPT = `你是顶级游戏广告创意导演，专门制作15秒手机竖屏(9:16)视频广告。

基于游戏的素材参考和选定的创意方向，设计一个15秒广告。
你需要深入理解游戏的画风、角色、场景，让脚本中的视觉描述贴合游戏实际素材。

输出格式（JSON，只输出JSON）：

{
  "script": {
    "title": "广告标题",
    "tone": "情绪基调",
    "creativeDirection": "选定的创意方向名",
    "hook": {
      "time": "0-3秒",
      "visual": "详细的画面描述。用英文写Seedance提示词风格。描述具体场景元素、动作、构图。例如：Close-up shot of a warrior character in dark fantasy armor, dramatic lighting, camera zooms in as character unleashes a powerful skill, particle effects swirling, 9:16 vertical frame",
      "audio": "音效和配乐描述",
      "copy": "广告文案/配音（中文）",
      "seedancePrompt": "完整的Seedance 2.0视频生成提示词。包含：场景描述、运镜方式、画面风格、色彩基调、特效。英文，详细。"
    },
    "gameplayScenes": [
      {
        "time": "3-8秒",
        "visual": "详细画面描述",
        "audio": "音效配乐",
        "copy": "广告文案",
        "seedancePrompt": "Seedance 2.0 提示词"
      },
      {
        "time": "8-13秒",
        "visual": "详细画面描述",
        "audio": "音效配乐",
        "copy": "广告文案",
        "seedancePrompt": "Seedance 2.0 提示词"
      }
    ],
    "cta": {
      "time": "13-15秒",
      "visual": "CTA画面描述",
      "copy": "行动号召文案（中文）",
      "seedancePrompt": "Seedance 2.0 提示词"
    },
    "refImagePrompts": [
      {
        "sceneKey": "hook",
        "seedreamPrompt": "Seedream 5.0 参考图生成提示词。英文，详细。9:16竖屏。包含画风、角色、场景、光影、构图等。不包含文字/水印。"
      },
      {
        "sceneKey": "gameplay_0",
        "seedreamPrompt": "Seedream 5.0 提示词"
      },
      {
        "sceneKey": "gameplay_1",
        "seedreamPrompt": "Seedream 5.0 提示词"
      },
      {
        "sceneKey": "cta",
        "seedreamPrompt": "Seedream 5.0 提示词"
      }
    ],
    "productionNotes": "制作备注：推荐的运镜手法、转场方式、节奏控制等"
  }
}

要求：
1. 每个场景的seedancePrompt要详细具体，能直接用于生成高质量视频
2. seedreamPrompt要与对应场景的视觉风格一致，但作为静态参考图更注重构图和光影
3. 画面描述要贴合游戏的实际画风和素材特征
4. 15秒节奏紧凑，前3秒必须有强冲击力
5. 文案要简短有力，符合广告语法`

export interface DetailedScene {
  time: string
  visual: string
  audio: string
  copy: string
  seedancePrompt: string
}

export interface RefImagePrompt {
  sceneKey: string
  seedreamPrompt: string
}

export interface DetailedScript {
  title: string
  tone: string
  creativeDirection: string
  hook: DetailedScene
  gameplayScenes: DetailedScene[]
  cta: DetailedScene
  refImagePrompts: RefImagePrompt[]
  productionNotes: string
}

export async function generateDetailedScript(
  gameProfile: GameProfile,
  direction: CreativeDirection,
  gameAssetsSummary: string
): Promise<DetailedScript> {
  const userPrompt = [
    '=== 游戏信息 ===',
    `类型：${gameProfile.gameGenre}`,
    `画风：${gameProfile.artStyle}`,
    `核心玩法：${gameProfile.coreGameplay}`,
    `核心卖点：${gameProfile.coreUSPs.join('、')}`,
    `情绪基调：${gameProfile.emotionalTone.join('、')}`,
    `概述：${gameProfile.summary}`,
    '',
    '=== 选定的创意方向 ===',
    `名称：${direction.name}`,
    `策略：${direction.strategy}`,
    `Hook类型：${direction.hookType}`,
    `目标情绪：${direction.targetEmotion}`,
    `大纲：${direction.outline}`,
    '',
    '=== 可用游戏素材 ===',
    gameAssetsSummary,
    '',
    '请基于以上信息，创建一个详细的15秒竖屏广告脚本，包含完整的Seedance视频提示词和Seedream参考图提示词。',
    '注意：视觉描述要紧密贴合游戏的素材特征（画风、角色、场景等），让最终生成的视频画面与游戏一致。',
  ].join('\n')

  const result = await chat({
    systemPrompt: SCRIPT_SYSTEM_PROMPT,
    userPrompt,
    temperature: 0.85,
    maxTokens: 6000,
  })

  const cleaned = result.replace(/```json\n?/g, '').replace(/```/g, '').trim()
  const parsed = JSON.parse(cleaned)
  return parsed.script as DetailedScript
}
