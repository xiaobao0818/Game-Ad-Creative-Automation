/**
 * MiniMax API 服务
 * Seedream 5.0: 参考图生成
 * Seedance 2.0: 视频生成
 */

const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || ''
const MINIMAX_BASE = 'https://api.minimax.chat'

interface SeedreamRequest {
  prompt: string
  aspectRatio?: string
  imageCount?: number
  negativePrompt?: string
  styleRefImgUrl?: string
}

interface SeedanceRequest {
  prompt: string
  firstFrameImage?: string
  duration?: number    // seconds
  aspectRatio?: string
  resolution?: string
}

interface TaskResult {
  taskId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  outputUrl?: string
  errorMessage?: string
}

async function minimaxPost(endpoint: string, body: any): Promise<any> {
  const res = await fetch(`${MINIMAX_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MINIMAX_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`MiniMax API error (${res.status}): ${errText}`)
  }
  return res.json()
}

/** 调用 Seedream 5.0 生成参考图 */
export async function generateImage(params: SeedreamRequest): Promise<{ taskId: string }> {
  const body = {
    model: 'seedream-5.0',
    prompt: params.prompt,
    aspect_ratio: params.aspectRatio || '9:16',
    n: params.imageCount || 1,
    negative_prompt: params.negativePrompt || 'low quality, blurry, distorted, watermark, text',
    ...(params.styleRefImgUrl ? { style_ref_img_url: params.styleRefImgUrl } : {}),
  }
  const result = await minimaxPost('/v1/image/generation', body)
  return { taskId: result.task_id || result.id }
}

/** 查询 Seedream 任务状态 */
export async function queryImageTask(taskId: string): Promise<TaskResult> {
  const result = await minimaxPost('/v1/query/image_generation', { task_id: taskId })
  return {
    taskId,
    status: mapStatus(result.status),
    outputUrl: result.file_url || result.result?.[0]?.url,
    errorMessage: result.error?.message,
  }
}

/** 调用 Seedance 2.0 生成视频 */
export async function generateVideo(params: SeedanceRequest): Promise<{ taskId: string }> {
  const body = {
    model: 'seedance-2.0',
    prompt: params.prompt,
    duration: params.duration || 15,
    aspect_ratio: params.aspectRatio || '9:16',
    resolution: params.resolution || '1080p',
    ...(params.firstFrameImage ? { first_frame_image: params.firstFrameImage } : {}),
  }
  const result = await minimaxPost('/v1/video/generation', body)
  return { taskId: result.task_id || result.id }
}

/** 查询 Seedance 任务状态 */
export async function queryVideoTask(taskId: string): Promise<TaskResult> {
  const result = await minimaxPost('/v1/query/video_generation', { task_id: taskId })
  return {
    taskId,
    status: mapStatus(result.status),
    outputUrl: result.file_url || result.result?.url,
    errorMessage: result.error?.message,
  }
}

function mapStatus(s: string): TaskResult['status'] {
  if (!s) return 'pending'
  if (s === 'SUCCESS' || s === 'succeeded' || s === 'completed') return 'completed'
  if (s === 'FAILED' || s === 'failed') return 'failed'
  return 'processing'
}
