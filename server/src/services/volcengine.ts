/**
 * 火山引擎视觉 API 服务
 *
 * 图片生成: 豆包 Seedream 4.0 (通过方舟 API)
 * 视频生成: 豆包 Seedance 1.0 Pro (通过方舟 API)
 *
 * 火山引擎的图片/视频 API 使用与 MiniMax 不同的端点格式。
 * 参考: https://www.volcengine.com/docs/6791/1347770
 */

import { getProviderConfig } from './provider-config'

const config = getProviderConfig()

interface VolcImageRequest {
  prompt: string
  aspectRatio?: string
  imageCount?: number
  negativePrompt?: string
  styleRefImgUrl?: string
}

interface VolcVideoRequest {
  prompt: string
  firstFrameImage?: string
  duration?: number
  aspectRatio?: string
}

interface TaskResult {
  taskId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  outputUrl?: string
  errorMessage?: string
}

/**
 * 火山引擎方舟 API 调用封装
 * 方舟 API 使用 OpenAI 兼容格式，但非 chat 端点有各自路径
 */
async function volcPost(endpoint: string, body: any): Promise<any> {
  const url = `${config.volcengine.arkBaseUrl}${endpoint}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.volcengine.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`火山引擎 API 错误 (${res.status}): ${errText}`)
  }
  return res.json()
}

/** ====== 图片生成 (Seedream 4.0) ====== */

export async function volcGenerateImage(params: VolcImageRequest): Promise<{ taskId: string }> {
  const body = {
    model: config.volcengine.imageModel,
    prompt: params.prompt,
    size: mapAspectRatio(params.aspectRatio || '9:16'),
    n: params.imageCount || 1,
    negative_prompt: params.negativePrompt || 'low quality, blurry, distorted, watermark, text, UI, logo, letters',
    ...(params.styleRefImgUrl ? { reference_image: params.styleRefImgUrl } : {}),
  }

  // 火山引擎方舟图片生成 — 使用 /images/generations 端点
  const result = await volcPost('/images/generations', body)

  return {
    taskId: result.data?.[0]?.task_id || result.task_id || result.id || '',
  }
}

export async function volcQueryImageTask(taskId: string): Promise<TaskResult> {
  const result = await volcPost('/images/generations/query', { task_id: taskId })

  return {
    taskId,
    status: mapVolcStatus(result.status || result.data?.status),
    outputUrl: result.data?.[0]?.url || result.url || result.output?.image_url,
    errorMessage: result.error?.message || result.message,
  }
}

/** ====== 视频生成 (Seedance 1.0 Pro) ====== */

export async function volcGenerateVideo(params: VolcVideoRequest): Promise<{ taskId: string }> {
  const body = {
    model: config.volcengine.videoModel,
    prompt: params.prompt,
    duration: params.duration || 15,
    size: mapAspectRatio(params.aspectRatio || '9:16'),
    ...(params.firstFrameImage ? { first_frame_image: params.firstFrameImage } : {}),
  }

  // 火山引擎方舟视频生成
  const result = await volcPost('/videos/generations', body)

  return {
    taskId: result.data?.task_id || result.task_id || result.id || '',
  }
}

export async function volcQueryVideoTask(taskId: string): Promise<TaskResult> {
  const result = await volcPost('/videos/generations/query', { task_id: taskId })

  return {
    taskId,
    status: mapVolcStatus(result.status || result.data?.status),
    outputUrl: result.data?.video_url || result.url || result.output?.video_url,
    errorMessage: result.error?.message || result.message,
  }
}

/** ====== 工具函数 ====== */

function mapAspectRatio(ratio: string): string {
  // 火山引擎使用 "宽x高" 格式
  const map: Record<string, string> = {
    '9:16': '1080x1920',
    '16:9': '1920x1080',
    '1:1': '1024x1024',
    '4:3': '1024x768',
    '3:4': '768x1024',
  }
  return map[ratio] || '1080x1920'
}

function mapVolcStatus(s: string): TaskResult['status'] {
  if (!s) return 'pending'
  const status = s.toLowerCase()
  if (status === 'succeeded' || status === 'completed' || status === 'success') return 'completed'
  if (status === 'failed' || status === 'error') return 'failed'
  if (status === 'running' || status === 'processing' || status === 'in_progress') return 'processing'
  return 'pending'
}
