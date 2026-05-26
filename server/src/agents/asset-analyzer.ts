import { chat, chatWithImages } from '../services/openai'

const SYSTEM_PROMPT = `你是一位资深游戏广告创意分析师。用户会提供一款手机游戏的文字描述和参考图片。
请从广告投放角度全面分析这款游戏，输出结构化JSON。

分析维度：
1. 游戏类型（RPG/策略/休闲/卡牌/模拟经营等）
2. 核心卖点（3-5个，用于广告吸引用户）
3. 画风特征（写实/Q版/像素/二次元/暗黑等）
4. 目标用户画像（年龄段、兴趣标签）
5. 核心玩法描述（15字以内精炼概括）
6. 情绪基调（热血/休闲/搞笑/治愈/紧张等，选1-2个）

输出格式（只输出JSON，不要其他内容）：
{
  "gameGenre": "string",
  "artStyle": "string",
  "coreUSPs": ["string"],
  "targetAudience": {"age": "string", "interests": ["string"]},
  "coreGameplay": "string",
  "emotionalTone": ["string"],
  "summary": "一段50字以内的游戏广告文案概述"
}`

export interface GameProfile {
  gameGenre: string
  artStyle: string
  coreUSPs: string[]
  targetAudience: { age: string; interests: string[] }
  coreGameplay: string
  emotionalTone: string[]
  summary: string
}

export async function analyzeGameAssets(
  textDescriptions: string[],
  imageDescriptions: string[],
  imagePaths?: string[]
): Promise<GameProfile> {
  const userPrompt = [
    '请分析以下游戏素材：',
    '',
    '=== 文字描述 ===',
    ...textDescriptions.map((t, i) => `【素材${i + 1}】${t}`),
    '',
    '=== 图片描述 ===',
    ...imageDescriptions.map((d, i) => `【图片${i + 1}】${d}`),
    '',
    '请输出上述JSON格式的分析结果。',
  ].join('\n')

  let result: string
  if (imagePaths && imagePaths.length > 0) {
    result = await chatWithImages({
      systemPrompt: SYSTEM_PROMPT,
      userPrompt,
      imagePaths,
      temperature: 0.7,
    })
  } else {
    result = await chat({
      systemPrompt: SYSTEM_PROMPT,
      userPrompt,
      temperature: 0.7,
    })
  }

  // 清理可能的 Markdown 代码块包裹
  const cleaned = result.replace(/```json\n?/g, '').replace(/```/g, '').trim()
  return JSON.parse(cleaned) as GameProfile
}
