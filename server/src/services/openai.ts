import OpenAI from 'openai'
import fs from 'fs'
import path from 'path'
import { getProviderConfig, type ProviderType } from './provider-config'

/** 创建 OpenAI 客户端（支持火山引擎方舟等 OpenAI 兼容 API） */
function createClient(provider: ProviderType = 'volcengine'): OpenAI {
  const config = getProviderConfig()

  if (provider === 'volcengine') {
    return new OpenAI({
      apiKey: config.volcengine.apiKey,
      baseURL: config.volcengine.arkBaseUrl,
    })
  }

  // openai 原生
  return new OpenAI({
    apiKey: config.openai.apiKey,
    baseURL: config.openai.baseUrl || undefined,
  })
}

/** 将本地文件转为 base64 data URI（OpenAI Vision API 需要） */
function fileToDataUri(filePath: string): string {
  const buffer = fs.readFileSync(filePath)
  const maxBytes = Number(process.env.MAX_IMAGE_BYTES) || 4 * 1024 * 1024  // 默认 4MB
  if (buffer.byteLength > maxBytes) {
    throw new Error(`图片 ${filePath} 超过大小限制 (${(buffer.byteLength / 1024 / 1024).toFixed(1)}MB > ${(maxBytes / 1024 / 1024).toFixed(1)}MB)`)
  }
  const ext = path.extname(filePath).toLowerCase().replace('.', '')
  const mimeMap: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    gif: 'image/gif',
  }
  const mime = mimeMap[ext] || 'image/png'
  return `data:${mime};base64,${buffer.toString('base64')}`
}

export interface ChatOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  systemPrompt: string
  userPrompt: string
}

/** 纯文本对话 */
export async function chat(options: ChatOptions): Promise<string> {
  const config = getProviderConfig()
  const client = createClient(config.textProvider)

  // 火山引擎方舟使用推理接入点 ID 作为 model
  const model = config.textProvider === 'volcengine'
    ? config.volcengine.arkEndpointId
    : (options.model || 'gpt-4o')

  const response = await client.chat.completions.create({
    model,
    temperature: options.temperature ?? 0.8,
    max_tokens: options.maxTokens || 4096,
    messages: [
      { role: 'system', content: options.systemPrompt },
      { role: 'user', content: options.userPrompt },
    ],
  })
  return response.choices[0]?.message?.content || ''
}

/** 支持本地图片路径的 Vision 对话（自动转 base64） */
export async function chatWithImages(
  options: ChatOptions & { imagePaths: string[] }
): Promise<string> {
  const config = getProviderConfig()
  const client = createClient(config.textProvider)

  const model = config.textProvider === 'volcengine'
    ? config.volcengine.arkEndpointId
    : (options.model || 'gpt-4o')

  const content: any[] = [{ type: 'text', text: options.userPrompt }]
  for (const imgPath of options.imagePaths) {
    let url: string
    if (imgPath.startsWith('http://') || imgPath.startsWith('https://')) {
      url = imgPath
    } else {
      try {
        url = fileToDataUri(imgPath)
      } catch {
        console.warn(`无法读取图片: ${imgPath}，跳过`)
        continue
      }
    }
    content.push({
      type: 'image_url',
      image_url: { url, detail: 'high' },
    })
  }

  const response = await client.chat.completions.create({
    model,
    temperature: options.temperature ?? 0.8,
    max_tokens: options.maxTokens || 4096,
    messages: [
      { role: 'system', content: options.systemPrompt },
      { role: 'user', content },
    ],
  })
  return response.choices[0]?.message?.content || ''
}
