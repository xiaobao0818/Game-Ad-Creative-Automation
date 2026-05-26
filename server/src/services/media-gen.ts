/**
 * 统一媒体生成服务
 * 根据 Provider 配置自动选择火山引擎或 MiniMax
 */

import { getProviderConfig } from './provider-config'
import { volcGenerateImage, volcQueryImageTask, volcGenerateVideo, volcQueryVideoTask } from './volcengine'
import { generateImage, queryImageTask, generateVideo, queryVideoTask } from './minimax'

export interface ImageGenRequest {
  prompt: string
  aspectRatio?: string
  imageCount?: number
  negativePrompt?: string
  styleRefImgUrl?: string
}

export interface VideoGenRequest {
  prompt: string
  firstFrameImage?: string
  duration?: number
  aspectRatio?: string
  resolution?: string
}

export interface TaskResult {
  taskId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  outputUrl?: string
  errorMessage?: string
}

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

/** 生成视频（自动选择 provider） */
export async function genVideo(params: VideoGenRequest): Promise<{ taskId: string }> {
  const config = getProviderConfig()

  if (config.videoProvider === 'minimax') {
    return generateVideo(params)
  }
  return volcGenerateVideo(params)
}

/** 查询视频任务状态 */
export async function queryVideoGenTask(taskId: string): Promise<TaskResult> {
  const config = getProviderConfig()

  if (config.videoProvider === 'minimax') {
    return queryVideoTask(taskId)
  }
  return volcQueryVideoTask(taskId)
}

/** 获取当前活跃的 provider 信息 */
export function getActiveProviders() {
  const config = getProviderConfig()
  return {
    text: config.textProvider,
    image: config.imageProvider,
    video: config.videoProvider,
  }
}
