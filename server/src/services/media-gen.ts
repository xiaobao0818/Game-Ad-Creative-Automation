/**
 * 统一媒体生成服务
 * 根据 Provider 配置自动选择火山引擎或 MiniMax
 *
 * 视频侧：默认 / volcengine 走火山方舟的 contents/generations/tasks；
 * 设 VIDEO_PROVIDER=minimax 时保留 MiniMax 路径作为回退。
 */

import { getProviderConfig, type ProviderType } from './provider-config'
import {
  volcGenerateImage,
  volcQueryImageTask,
  volcGenerateVideo,
  volcQueryVideoTask,
  volcCancelVideoTask,
} from './volcengine'
import { generateImage, queryImageTask, generateVideo, queryVideoTask } from './minimax'

export interface ImageGenRequest {
  prompt: string
  aspectRatio?: string
  imageCount?: number
  negativePrompt?: string
  styleRefImgUrl?: string
}

export interface VideoGenRequest {
  /** 视频主描述 */
  text: string
  /** 多模态参考图 URL 列表 */
  imageUrls?: string[]
  /** 单张首帧 URL（MiniMax 兼容字段，会被并入 imageUrls） */
  firstFrameImage?: string
  /** 时长（秒） */
  duration?: number
  /** 画幅（9:16 等），视频侧使用 ratio 字段 */
  aspectRatio?: string
  /** 分辨率（火山: 480p | 720p | 1080p） */
  resolution?: string
}

export interface TaskResult {
  taskId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  outputUrl?: string
  errorMessage?: string
  /** 上游真实状态（火山侧: queued/running/succeeded/failed/cancelled） */
  rawStatus?: string
  /** 实际命中的 provider（便于排查） */
  providerUsed?: ProviderType
}

// ============================================================================
// 图片
// ============================================================================

/** 生成图片（自动选择 provider） */
export async function genImage(params: ImageGenRequest): Promise<{ taskId: string }> {
  const config = getProviderConfig()
  if (config.imageProvider === 'minimax') {
    return generateImage(params)
  }
  // 默认火山引擎
  return volcGenerateImage(params)
}

/** 查询图片任务状态 */
export async function queryImageGenTask(taskId: string): Promise<TaskResult> {
  const config = getProviderConfig()
  if (config.imageProvider === 'minimax') {
    return queryImageTask(taskId)
  }
  return volcQueryImageTask(taskId)
}

// ============================================================================
// 视频 —— 火山方舟（默认）/ MiniMax（兜底）
// ============================================================================

const VALID_RATIOS = ['16:9', '4:3', '1:1', '9:16', '3:4'] as const
const VALID_RESOLUTIONS = ['480p', '720p', '1080p'] as const
const VALID_DURATIONS = [5, 10, 15] as const

/** 边界校验视频参数，错误时抛可读 Error(路由层 try/catch 会转 400) */
function validateVideoParams(params: VideoGenRequest): {
  ratio: typeof VALID_RATIOS[number]
  duration: typeof VALID_DURATIONS[number]
  resolution: typeof VALID_RESOLUTIONS[number]
} {
  const ratio = (params.aspectRatio as any) || '9:16'
  if (!VALID_RATIOS.includes(ratio)) {
    throw new Error(`无效的视频比例 "${params.aspectRatio}",可选: ${VALID_RATIOS.join(', ')}`)
  }
  const duration = (params.duration || 15) as typeof VALID_DURATIONS[number]
  if (!VALID_DURATIONS.includes(duration)) {
    throw new Error(`无效的时长 ${params.duration} 秒,Seedance 仅支持: ${VALID_DURATIONS.join(', ')}`)
  }
  const resolution = (params.resolution as any) || '720p'
  if (!VALID_RESOLUTIONS.includes(resolution)) {
    throw new Error(`无效的分辨率 "${params.resolution}",可选: ${VALID_RESOLUTIONS.join(', ')}`)
  }
  return { ratio, duration, resolution }
}

/** 生成视频（默认走火山方舟 Seedance） */
export async function genVideo(params: VideoGenRequest): Promise<{ taskId: string }> {
  const config = getProviderConfig()

  if (config.videoProvider === 'minimax') {
    // MiniMax 不在这里校验（参数较少,直接透传）
    return generateVideo({
      prompt: params.text,
      firstFrameImage: params.firstFrameImage || params.imageUrls?.[0],
      duration: params.duration,
      aspectRatio: params.aspectRatio,
    })
  }

  // 火山方舟路径：先校验参数,再决定怎么拼
  const { ratio, duration, resolution } = validateVideoParams(params)

  const imageUrls = [...(params.imageUrls || [])]
  if (params.firstFrameImage && !imageUrls.includes(params.firstFrameImage)) {
    imageUrls.unshift(params.firstFrameImage)
  }

  return volcGenerateVideo({
    text: params.text,
    imageUrls,
    ratio,
    duration,
    resolution,
    watermark: config.volcengine.videoWatermark,
  })
}

/** 查询视频任务状态 */
export async function queryVideoGenTask(taskId: string): Promise<TaskResult> {
  const config = getProviderConfig()
  if (config.videoProvider === 'minimax') {
    const r = await queryVideoTask(taskId)
    return { ...r, providerUsed: 'minimax' }
  }
  const r = await volcQueryVideoTask(taskId)
  return { ...r, providerUsed: 'volcengine' }
}

/** 取消/删除视频任务（仅火山方舟） */
export async function cancelVideoGenTask(taskId: string): Promise<{ ok: boolean }> {
  return volcCancelVideoTask(taskId)
}

// ============================================================================
// 当前 provider 信息
// ============================================================================

/** 获取当前活跃的 provider 信息 */
export function getActiveProviders() {
  const config = getProviderConfig()
  return {
    text: config.textProvider,
    image: config.imageProvider,
    video: config.videoProvider,
  }
}
