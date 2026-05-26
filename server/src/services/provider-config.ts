/**
 * AI Provider 配置
 * 支持火山引擎(豆包/即梦) 和 MiniMax(Seedream/Seedance) 两种方案
 *
 * 通过环境变量 AI_PROVIDER 切换:
 *   - "volcengine" (默认): 火山引擎全链路
 *   - "minimax": MiniMax 全链路
 *   - "hybrid": 文本用火山引擎，图片视频用 MiniMax
 *
 * 也可以独立配置每个环节:
 *   TEXT_PROVIDER=volcengine|openai
 *   IMAGE_PROVIDER=volcengine|minimax
 *   VIDEO_PROVIDER=volcengine|minimax
 */

export type ProviderType = 'volcengine' | 'minimax' | 'openai'

export interface ProviderConfig {
  /** 文本生成 provider */
  textProvider: ProviderType
  /** 图片生成 provider */
  imageProvider: ProviderType
  /** 视频生成 provider */
  videoProvider: ProviderType

  // 火山引擎配置
  volcengine: {
    apiKey: string
    /** 方舟推理接入点 ID（文本） */
    arkEndpointId: string
    /** 方舟 base URL */
    arkBaseUrl: string
    /** 即梦图片模型 */
    imageModel: string
    /** 视频模型 */
    videoModel: string
  }

  // MiniMax 配置
  minimax: {
    apiKey: string
    baseUrl: string
  }

  // OpenAI 配置（可选，兼容模式）
  openai: {
    apiKey: string
    baseUrl: string
  }
}

function getEnv(key: string, fallback = ''): string {
  return process.env[key] || fallback
}

/** 解析全局 AI_PROVIDER，推导各环节 provider */
function resolveProviders(): { text: ProviderType; image: ProviderType; video: ProviderType } {
  const global = getEnv('AI_PROVIDER', 'volcengine')

  const text = (getEnv('TEXT_PROVIDER') || global) as ProviderType
  const image = (getEnv('IMAGE_PROVIDER') || global) as ProviderType
  const video = (getEnv('VIDEO_PROVIDER') || global) as ProviderType

  return { text, image, video }
}

let _config: ProviderConfig | null = null

export function getProviderConfig(): ProviderConfig {
  if (_config) return _config

  const providers = resolveProviders()

  _config = {
    textProvider: providers.text,
    imageProvider: providers.image,
    videoProvider: providers.video,

    volcengine: {
      apiKey: getEnv('VOLCENGINE_API_KEY'),
      arkEndpointId: getEnv('VOLCENGINE_ARK_ENDPOINT_ID'),
      arkBaseUrl: getEnv('VOLCENGINE_ARK_BASE_URL', 'https://ark.cn-beijing.volces.com/api/v3'),
      imageModel: getEnv('VOLCENGINE_IMAGE_MODEL', 'doubao-seedream-4-0-250828'),
      videoModel: getEnv('VOLCENGINE_VIDEO_MODEL', 'doubao-seedance-1-0-pro-250528'),
    },

    minimax: {
      apiKey: getEnv('MINIMAX_API_KEY'),
      baseUrl: 'https://api.minimax.chat',
    },

    openai: {
      apiKey: getEnv('OPENAI_API_KEY'),
      baseUrl: getEnv('OPENAI_BASE_URL', 'https://api.openai.com/v1'),
    },
  }

  return _config
}

/** 重置配置缓存（测试用） */
export function resetProviderConfig(): void {
  _config = null
}
