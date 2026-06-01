/**
 * 火山引擎视觉 API 服务
 *
 * 图片生成: 豆包 Seedream 4.0 (通过方舟 API)
 * 视频生成: 豆包 Seedance 1.0 Pro / 1.5 Pro / 2.0 (通过方舟 contents/generations/tasks)
 *
 * 参考:
 *  - https://www.volcengine.com/docs/82379/1520757  (创建视频任务)
 *  - https://www.volcengine.com/docs/82379/1521309  (查询视频任务)
 */

import { getProviderConfig } from './provider-config'

interface VolcImageRequest {
  prompt: string
  aspectRatio?: string
  imageCount?: number
  negativePrompt?: string
  styleRefImgUrl?: string
}

export type VolcVideoRatio = '16:9' | '4:3' | '1:1' | '9:16' | '3:4'
export type VolcVideoResolution = '480p' | '720p' | '1080p'
export type VolcVideoDuration = 5 | 10 | 15

export interface VolcVideoRequest {
  /** 覆盖默认视频模型；留空走 providerConfig.volcengine.videoModel */
  model?: string
  /** 视频主描述 */
  text: string
  /** 多模态参考图 URL 列表（可传 hook、gameplay、cta 多张） */
  imageUrls?: string[]
  /** 画面比例，默认 9:16 */
  ratio?: VolcVideoRatio
  /** 视频时长（秒），默认 15 */
  duration?: VolcVideoDuration
  /** 分辨率，默认 720p */
  resolution?: VolcVideoResolution
  /** 是否带水印，默认 false */
  watermark?: boolean
  /** 随机种子；-1 表示随机 */
  seed?: number
  /** 透传给 camera_control 字段的高级运镜控制 */
  cameraControl?: Record<string, any>
}

export interface TaskResult {
  taskId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  outputUrl?: string
  errorMessage?: string
  /** 上游真实状态原文（queued / running / succeeded / failed / cancelled） */
  rawStatus?: string
}

// ============================================================================
// 通用 HTTP 封装（函数内取 config，避免模块加载时钉死）
// ============================================================================

async function volcPost(endpoint: string, body: any): Promise<any> {
  const config = getProviderConfig()
  const res = await fetch(`${config.volcengine.arkBaseUrl}${endpoint}`, {
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

async function volcGet(endpoint: string): Promise<any> {
  const config = getProviderConfig()
  const res = await fetch(`${config.volcengine.arkBaseUrl}${endpoint}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${config.volcengine.apiKey}`,
    },
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`火山引擎 API 错误 (${res.status}): ${errText}`)
  }
  return res.json()
}

async function volcDelete(endpoint: string): Promise<any> {
  const config = getProviderConfig()
  const res = await fetch(`${config.volcengine.arkBaseUrl}${endpoint}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${config.volcengine.apiKey}`,
    },
  })
  // 204 No Content 视为成功
  if (res.status === 204) return { ok: true }
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`火山引擎 API 错误 (${res.status}): ${errText}`)
  }
  // 200 OK 时 body 可能为空，不能直接 res.json()
  const text = await res.text()
  return text ? JSON.parse(text) : { ok: true }
}

// ============================================================================
// 图片生成 (Seedream 4.0)
// ============================================================================

export async function volcGenerateImage(params: VolcImageRequest): Promise<{ taskId: string }> {
  const config = getProviderConfig()
  const body = {
    model: config.volcengine.imageModel,
    prompt: params.prompt,
    size: mapAspectRatio(params.aspectRatio || '9:16'),
    n: params.imageCount || 1,
    negative_prompt: params.negativePrompt || 'low quality, blurry, distorted, watermark, text, UI, logo, letters',
    ...(params.styleRefImgUrl ? { reference_image: params.styleRefImgUrl } : {}),
  }
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
    rawStatus: result.status || result.data?.status,
  }
}

// ============================================================================
// 视频生成 (Seedance 1.0 Pro / 1.5 Pro / 2.0)
// 端点: POST /contents/generations/tasks
// ============================================================================

export async function volcGenerateVideo(params: VolcVideoRequest): Promise<{ taskId: string }> {
  const config = getProviderConfig()
  const cfg = config.volcengine

  // 组装 content[] —— 1 段 text + N 段 image_url
  const content: any[] = [{ type: 'text', text: params.text }]
  for (const url of params.imageUrls || []) {
    if (!url) continue
    content.push({ type: 'image_url', image_url: { url } })
  }

  const body: Record<string, any> = {
    model: params.model || cfg.videoModel,
    content,
    parameters: {
      ratio: params.ratio || cfg.videoRatio || '9:16',
      duration: params.duration || 15,
      resolution: params.resolution || cfg.videoResolution || '720p',
      watermark: params.watermark ?? cfg.videoWatermark ?? false,
      seed: params.seed ?? -1,
    },
  }
  if (params.cameraControl) {
    body.parameters.camera_control = params.cameraControl
  }

  const result = await volcPost('/contents/generations/tasks', body)

  // 真实 Seedance API 在顶层返回 id
  const taskId = result.id || result.task_id || result.data?.id
  if (!taskId) {
    throw new Error(`火山引擎视频任务创建成功但未返回 task_id: ${JSON.stringify(result)}`)
  }
  return { taskId }
}

/** 查询视频任务: GET /contents/generations/tasks/{task_id} */
export async function volcQueryVideoTask(taskId: string): Promise<TaskResult> {
  const result = await volcGet(`/contents/generations/tasks/${taskId}`)

  // 真实响应: { id, model, status, content: { video_url }, error: { code, message } }
  const rawStatus: string = result.status || ''
  const videoUrl: string | undefined =
    result.content?.video_url ||
    result.content?.url ||
    result.video_url

  return {
    taskId,
    status: mapVolcStatus(rawStatus),
    outputUrl: videoUrl,
    errorMessage: result.error?.message,
    rawStatus,
  }
}

/** 取消/删除视频任务: DELETE /contents/generations/tasks/{task_id} */
export async function volcCancelVideoTask(taskId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await volcDelete(`/contents/generations/tasks/${taskId}`)
    return { ok: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    // 任务已结束（succeeded/failed/cancelled）或上游返回 404 视为幂等成功
    if (/404|not[ _-]?found|already[ _-]?(finished|ended|cancelled|completed)/i.test(msg)) {
      return { ok: true }
    }
    // 其他错误（401/403/500 等）需要让调用方知道
    console.error(`[volcCancelVideoTask] ${taskId}:`, msg)
    return { ok: false, error: msg }
  }
}

// ============================================================================
// 工具函数
// ============================================================================

/** 把 9:16 这样的比例字符串映射到 Seedream 用的 "宽x高" */
function mapAspectRatio(ratio: string): string {
  const map: Record<string, string> = {
    '9:16': '1080x1920',
    '16:9': '1920x1080',
    '1:1': '1024x1024',
    '4:3': '1024x768',
    '3:4': '768x1024',
  }
  return map[ratio] || '1080x1920'
}

/** 把 Seedance 真实状态（queued/running/succeeded/failed/cancelled）映射到内部 4 值枚举 */
function mapVolcStatus(s: string | undefined): TaskResult['status'] {
  if (!s) return 'pending'
  const status = s.toLowerCase()
  if (status === 'succeeded' || status === 'success' || status === 'completed') return 'completed'
  if (status === 'failed' || status === 'error') return 'failed'
  // cancelled/canceled 也落 failed（业务上视作终止态，不在前端暴露 "cancelled"）
  if (status === 'cancelled' || status === 'canceled') return 'failed'
  if (status === 'running' || status === 'processing' || status === 'in_progress') return 'processing'
  // queued / pending / 其他
  return 'pending'
}
