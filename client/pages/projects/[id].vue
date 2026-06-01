<template>
  <div class="page-container">
    <div style="margin-bottom: 20px;">
      <NuxtLink to="/" class="btn btn-sm">← 返回</NuxtLink>
    </div>

    <div v-if="!project" style="text-align: center; padding: 60px;">
      <div class="spinner" style="margin: 0 auto 12px;"></div>加载项目...
    </div>

    <template v-else>
      <!-- 项目头 -->
      <header class="project-header">
        <div>
          <h1>{{ project.name }}</h1>
          <p style="color: var(--color-text-muted);">{{ project.description || '暂无描述' }}</p>
          <p style="color: var(--color-text-muted); font-size: 13px; margin-top: 4px;">
            <span v-if="!assets.length" style="color: var(--color-danger);">
              ⚠ 请先上传素材（图片 / 文字介绍）
            </span>
            <span v-else>
              素材: {{ assets.length }} 个文件（{{ assets.filter(a => a.type === 'image').length }} 张图 + {{ assets.filter(a => a.type === 'text').length }} 个文本）
            </span>
          </p>
        </div>
        <span class="badge" :class="`badge-${project.status}`">{{ statusMap[project.status] || project.status }}</span>
      </header>

      <!-- ====== 素材上传区（始终可见） ====== -->
      <div class="step-card card active">
        <div class="step-content">
          <h3 style="font-size: 16px; margin-bottom: 8px;">素材管理</h3>
          <div
            class="drop-zone"
            :class="{ active: dragOver }"
            @dragover.prevent="dragOver = true"
            @dragleave="dragOver = false"
            @drop.prevent="onAssetDrop"
            @click="assetInput?.click()"
          >
            <input
              ref="assetInput"
              type="file"
              multiple
              accept=".png,.jpg,.jpeg,.webp,.gif,.txt,.md"
              style="display: none;"
              @change="onAssetPick"
            />
            <div v-if="uploading" style="display: flex; align-items: center; justify-content: center; gap: 8px;">
              <span class="spinner" style="width: 14px; height: 14px;"></span>
              上传中...
            </div>
            <div v-else style="color: var(--color-text-muted); font-size: 13px;">
              拖拽文件到此处，或<u style="cursor: pointer; color: var(--color-primary);">点击选择</u>
              <span style="font-size: 11px; display: block; margin-top: 4px;">
                支持 .png / .jpg / .webp / .gif / .txt / .md
              </span>
            </div>
          </div>

          <!-- 已上传文件列表 -->
          <div v-if="assets.length" class="asset-list" style="margin-top: 16px;">
            <div v-for="asset in assets" :key="asset.id" class="asset-row">
              <span class="asset-icon">{{ asset.type === 'image' ? '🖼' : '📄' }}</span>
              <span class="asset-name">{{ asset.filename }}</span>
              <span class="asset-meta">
                <span class="asset-type-badge">{{ asset.type === 'image' ? '图' : '文' }}</span>
              </span>
              <button class="btn btn-sm" @click="doDeleteAsset(asset.id)">删除</button>
            </div>
          </div>
          <div v-if="uploadError" style="color: var(--color-danger); margin-top: 8px; font-size: 13px;">
            {{ uploadError }}
          </div>
        </div>
      </div>

      <!-- ====== Step 1: 素材分析 ====== -->
      <div class="step-card card" :class="{ active: currentStep === 1 }">
        <div class="step-number">1</div>
        <div class="step-content">
          <h3>素材分析</h3>
          <p style="color: var(--color-text-muted);">AI 扫描素材文件夹，分析游戏类型、画风、核心卖点</p>

          <div v-if="gameProfile" class="game-profile card" style="margin-top: 16px; background: var(--color-bg);">
            <div class="profile-grid">
              <div><span class="pl">类型</span><span class="pv">{{ gameProfile.gameGenre }}</span></div>
              <div><span class="pl">画风</span><span class="pv">{{ gameProfile.artStyle }}</span></div>
              <div><span class="pl">核心玩法</span><span class="pv">{{ gameProfile.coreGameplay }}</span></div>
              <div><span class="pl">目标用户</span><span class="pv">{{ gameProfile.targetAudience?.age }}岁 / {{ gameProfile.targetAudience?.interests?.join(', ') }}</span></div>
              <div><span class="pl">情绪基调</span><span class="pv">{{ gameProfile.emotionalTone?.join('、') }}</span></div>
              <div><span class="pl">核心卖点</span><span class="pv">{{ gameProfile.coreUSPs?.join('、') }}</span></div>
            </div>
            <p style="margin-top: 12px; color: var(--color-text-muted); font-size: 14px;">{{ gameProfile.summary }}</p>
          </div>

          <button
            v-if="!gameProfile"
            class="btn btn-primary"
            style="margin-top: 16px;"
            :disabled="analyzing || !assets.length"
            @click="doAnalyze"
          >
            <span v-if="analyzing" class="spinner" style="width: 14px; height: 14px; margin-right: 8px;"></span>
            {{ analyzing ? '正在分析素材...' : '开始分析' }}
          </button>
          <button
            v-if="gameProfile && !directions.length"
            class="btn btn-primary"
            style="margin-top: 16px;"
            :disabled="generatingDirections"
            @click="doGenerateDirections"
          >
            <span v-if="generatingDirections" class="spinner" style="width: 14px; height: 14px; margin-right: 8px;"></span>
            {{ generatingDirections ? '生成创意方向中...' : '生成创意方向 →' }}
          </button>
          <div v-if="analyzeError" style="color: var(--color-danger); margin-top: 8px; font-size: 14px;">{{ analyzeError }}</div>
        </div>
      </div>

      <!-- ====== Step 2: 创意方向选择 ====== -->
      <div v-if="directions.length" class="step-card card" :class="{ active: currentStep === 2 }">
        <div class="step-number">2</div>
        <div class="step-content">
          <h3>选择创意方向</h3>
          <p style="color: var(--color-text-muted);">AI 生成了 {{ directions.length }} 个创意方向，请选择你喜欢的</p>

          <div class="direction-grid">
            <div
              v-for="(d, i) in directions"
              :key="i"
              class="direction-card card"
              :class="{ selected: selectedDirectionIndex === i }"
              @click="selectedDirectionIndex = i"
            >
              <div class="direction-header">
                <h4>{{ d.name }}</h4>
                <span class="hook-tag">{{ d.hookType }}</span>
              </div>
              <p class="direction-strategy">{{ d.strategy }}</p>
              <p class="direction-rationale">{{ d.rationale }}</p>
              <div class="direction-meta">
                <span>{{ d.targetEmotion }}</span>
                <span>{{ d.outline }}</span>
              </div>
            </div>
          </div>

          <button
            v-if="selectedDirectionIndex !== null && !detailedScript"
            class="btn btn-primary"
            style="margin-top: 16px;"
            :disabled="generatingScript"
            @click="doGenerateScript"
          >
            {{ generatingScript ? '生成详细脚本中...' : '选定方向，生成详细脚本 →' }}
          </button>
          <div v-if="directionsError" style="color: var(--color-danger); margin-top: 8px; font-size: 14px;">{{ directionsError }}</div>
        </div>
      </div>

      <!-- ====== Step 3: 详细脚本 & 提示词 ====== -->
      <div v-if="detailedScript" class="step-card card active">
        <div class="step-number">3</div>
        <div class="step-content">
          <h3>详细脚本 & 提示词</h3>
          <p style="color: var(--color-text-muted);">基于「{{ selectedDirection?.name }}」，已生成完整脚本和提示词</p>

          <div class="notes-box" v-if="detailedScript.productionNotes">
            <strong>制作备注：</strong>{{ detailedScript.productionNotes }}
          </div>

          <div class="scenes-container">
            <SceneCard
              :scene="detailedScript.hook"
              title="Hook · 开场冲击"
              time="0-3秒"
              color="var(--color-primary)"
            />
            <SceneCard
              v-for="(scene, si) in detailedScript.gameplayScenes"
              :key="si"
              :scene="scene"
              :title="`场景 ${si + 1} · 玩法展示`"
              :time="scene.time"
              color="var(--color-success)"
            />
            <SceneCard
              :scene="detailedScript.cta"
              title="CTA · 行动号召"
              :time="detailedScript.cta.time"
              color="var(--color-warning)"
            />
          </div>

          <!-- Seedance 实际发送的提示词（来自 assembleVideoPrompt）-->
          <div class="prompt-box" style="margin-top: 20px;">
            <h4 style="margin-bottom: 8px;">完整视频提示词</h4>
            <p style="font-size: 12px; color: var(--color-text-muted); margin-bottom: 8px;">
              以下是实际发送给 Seedance 的提示词（含场景分段、全局风格、运镜节奏）
            </p>
            <pre class="prompt-text">{{ actualVideoPrompt }}</pre>
            <button class="btn btn-sm" style="margin-top: 8px;" @click="copyText(actualVideoPrompt)">复制提示词</button>
          </div>

          <!-- Seedream 参考图提示词 -->
          <div v-if="detailedScript.refImagePrompts?.length" class="ref-prompts" style="margin-top: 20px;">
            <h4 style="margin-bottom: 12px;">Seedream 5.0 参考图提示词</h4>
            <div
              v-for="ref in detailedScript.refImagePrompts"
              :key="ref.sceneKey"
              class="prompt-box"
              style="margin-bottom: 8px;"
            >
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <strong>{{ ref.sceneKey }}</strong>
                <button class="btn btn-sm" @click="copyText(ref.seedreamPrompt)">复制</button>
              </div>
              <pre class="prompt-text" style="font-size: 12px;">{{ ref.seedreamPrompt }}</pre>
            </div>

            <button
              class="btn btn-success"
              style="margin-top: 12px;"
              :disabled="generatingRefImages"
              @click="doGenerateRefImages"
            >
              {{ generatingRefImages ? '正在调用 Seedream 生成参考图...' : '生成参考图 (Seedream 5.0)' }}
            </button>
            <div v-if="refImageStatus" style="margin-top: 8px; font-size: 14px;">
              <span v-if="refImageStatus === 'generating'" style="color: var(--color-warning);">
                <span class="spinner" style="width: 12px; height: 12px; margin-right: 6px;"></span>参考图生成中...
              </span>
              <span v-else-if="refImageStatus === 'done'" style="color: var(--color-success);">参考图已生成</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ====== Step 4: 参考图结果 ====== -->
      <div v-if="refImages.length" class="step-card card active">
        <div class="step-number">4</div>
        <div class="step-content">
          <h3>参考图结果</h3>
          <div class="ref-images-grid">
            <div v-for="img in refImages" :key="img.id" class="ref-image-card">
              <div class="ref-image-label">{{ img.sceneKey }}</div>
              <div v-if="img.imageUrl" class="ref-image-wrapper">
                <img :src="img.imageUrl" :alt="img.sceneKey" />
              </div>
              <div v-else class="ref-image-placeholder">
                <span v-if="img.status === 'generating' || img.status === 'pending'" class="spinner" style="width: 20px; height: 20px;"></span>
                <span style="font-size: 12px; color: var(--color-text-muted); margin-top: 8px;">
                  {{ img.status === 'failed' ? '生成失败' : '生成中...' }}
                </span>
              </div>
            </div>
          </div>

          <button
            v-if="canGenerateVideo"
            class="btn btn-success"
            style="margin-top: 16px;"
            :disabled="generatingVideo"
            @click="doGenerateVideo"
          >
            <span v-if="generatingVideo" class="spinner" style="width: 14px; height: 14px; margin-right: 8px;"></span>
            {{ generatingVideo ? '正在调用火山方舟 Seedance 生成视频...' : '生成最终视频' }}
            <span style="opacity: 0.7; font-weight: normal; margin-left: 4px;">(火山方舟 Seedance)</span>
          </button>
          <div v-else-if="refImages.some(i => i.status === 'failed') && refImages.every(i => ['done','failed'].includes(i.status))" style="margin-top: 12px; color: var(--color-warning); font-size: 13px;">
            部分参考图生成失败，仍可继续生成视频（无首帧参考）。
          </div>
        </div>
      </div>

      <!-- ====== Step 5: 视频结果 ====== -->
      <div v-if="videos.length" class="step-card card active">
        <div class="step-number">5</div>
        <div class="step-content">
          <h3>视频（Seedance）</h3>
          <div v-for="v in videos" :key="v.id" class="video-card">
            <div v-if="v.model || v.resolution || v.ratio" style="font-size: 12px; color: var(--color-text-muted); margin-bottom: 6px;">
              模型: {{ v.model || '-' }} · 分辨率: {{ v.resolution || '-' }} · 画幅: {{ v.ratio || '-' }}
            </div>
            <div v-if="v.videoUrl" class="video-wrapper">
              <video :src="v.videoUrl" controls playsinline style="width: 100%; max-width: 360px; aspect-ratio: 9/16; background: #000; border-radius: 8px;"></video>
              <div style="margin-top: 8px;">
                <a class="btn btn-sm" :href="v.videoUrl" target="_blank" download>下载视频</a>
              </div>
            </div>
            <div v-else class="video-placeholder">
              <span v-if="v.status === 'generating' || v.status === 'pending'" class="spinner" style="width: 24px; height: 24px;"></span>
              <span style="font-size: 13px; color: var(--color-text-muted); margin-top: 10px;">
                {{ v.status === 'failed' ? '视频生成失败' : '视频生成中（通常 1-5 分钟）...' }}
              </span>
              <span v-if="v.status === 'failed' && v.errorMessage" style="font-size: 11px; color: var(--color-danger); margin-top: 6px; max-width: 320px; word-break: break-all;">
                {{ v.errorMessage }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const projectId = Number(route.params.id)
const {
  getProject,
  analyzeProject,
  generateDirections,
  generateScript,
  generateRefImages,
  generateVideo,
  fetchScripts,
  uploadAssets,
  listAssets,
  deleteAsset,
} = useProjects()
const { getRefImages, getVideos } = useScripts()
const { checkRefImage, checkVideo } = useGenerationStatus()

const project = ref<any>(null)
const gameProfile = ref<any>(null)
const directions = ref<any[]>([])
const directionScriptIds = ref<number[]>([])
const selectedDirectionIndex = ref<number | null>(null)
const currentScriptId = ref<number>(0)
const detailedScript = ref<any>(null)
const refImages = ref<any[]>([])
const refImageStatus = ref('')
const videos = ref<any[]>([])
const currentStep = ref(1)

// 素材上传相关
const assets = ref<any[]>([])
const uploading = ref(false)
const uploadError = ref('')
const dragOver = ref(false)
const assetInput = ref<HTMLInputElement | null>(null)

const analyzing = ref(false)
const generatingDirections = ref(false)
const generatingScript = ref(false)
const generatingRefImages = ref(false)
const generatingVideo = ref(false)
const analyzeError = ref('')
const directionsError = ref('')

// 轮询去重（防止 onMounted 多次进入时 / 多次点击时重复轮询）
const pollingRefIds = ref(new Set<number>())
const pollingVideoIds = ref(new Set<number>())

const statusMap: Record<string, string> = {
  draft: '草稿', analyzed: '已分析', directions_ready: '方向就绪', detailed: '脚本就绪', in_production: '生产中', done: '完成',
}

const selectedDirection = computed(() =>
  selectedDirectionIndex.value !== null && selectedDirectionIndex.value < directions.value.length
    ? directions.value[selectedDirectionIndex.value]
    : null
)

const allRefImagesDone = computed(() =>
  refImages.value.length > 0 && refImages.value.every(i => i.status === 'done')
)

// 允许视频生成：所有参考图都已"稳定"（done 或 failed），没有还在生成中的
const canGenerateVideo = computed(() =>
  refImages.value.length > 0 &&
  refImages.value.every(i => ['done', 'failed'].includes(i.status))
)

const actualVideoPrompt = computed(() => {
  if (!detailedScript.value) return ''
  // 模拟后端 assembleVideoPrompt 的拼装逻辑，让用户能复制到的就是真正发出去的
  const tone = detailedScript.value.tone || '热血、激动'
  const hook = detailedScript.value.hook
  const scenes = detailedScript.value.gameplayScenes || []
  const cta = detailedScript.value.cta

  const sceneBlocks: string[] = []
  sceneBlocks.push(`【开场冲击 · 0-3 秒】\n${hook.visual}`)
  scenes.forEach((s: any, i: number) => {
    const t = s.time || `${3 + i * 5}-${3 + (i + 1) * 5} 秒`
    sceneBlocks.push(`【玩法展示 ${i + 1} · ${t}】\n${s.visual}`)
  })
  sceneBlocks.push(`【行动号召 · 13-15 秒】\n${cta.visual}`)

  const styleBlock = [
    '',
    '【整体风格】',
    '画风: 游戏级电影感渲染，色彩饱和，光影强烈。',
    '运镜: 连续的电影感剪辑，开场有强烈推拉镜头，过程中多用平移和跟随镜头，结尾轻微拉远收束。',
    '节奏: 15 秒紧凑叙事，前 3 秒必须抓眼球，结尾给观众明确的行动指引。',
    `整体情绪: ${tone}。`,
    '画面: 9:16 竖屏，移动端信息流广告质感，高保真 30 帧流畅运镜。',
  ].join('\n')

  return sceneBlocks.join('\n\n') + '\n' + styleBlock
})

onMounted(async () => {
  project.value = await getProject(projectId)
  // 加载素材列表
  try {
    assets.value = await listAssets(projectId)
  } catch { /* 首次进入 */ }

  // profileJson 已经是 Drizzle JSON mode 自动反序列化后的对象，不要再 JSON.parse
  if (project.value?.profileJson && project.value.profileJson.gameGenre) {
    gameProfile.value = project.value.profileJson
  }

  // 尝试恢复已有的 directions
  try {
    const scripts = await fetchScripts(projectId)
    const directionScripts = scripts.filter((s: any) => s.status === 'direction')
    if (directionScripts.length > 0) {
      // 从 direction 脚本恢复方向数据
      directions.value = directionScripts.map((s: any) => ({
        id: s.title,
        name: s.title,
        strategy: s.fullCopy?.split(' | ')[0] || '',
        hookType: '',
        targetEmotion: s.tone || '',
        rationale: s.fullCopy?.split(' | ')[1] || '',
        outline: (s.hookScene as any)?.copy || '',
      }))
      directionScriptIds.value = directionScripts.map((s: any) => s.id)
      currentStep.value = 2
    }

    // 检查是否有 detailed 脚本
    const detailedScripts = scripts.filter((s: any) => s.status === 'detailed')
    if (detailedScripts.length > 0) {
      const s = detailedScripts[0]
      currentScriptId.value = s.id
      detailedScript.value = {
        title: s.title,
        tone: s.tone,
        creativeDirection: '',
        hook: s.hookScene,
        gameplayScenes: s.gameplayScenes,
        cta: s.ctaScene,
        refImagePrompts: s.refImagePrompts || [],
        productionNotes: s.productionNotes || '',
      }
      currentStep.value = 3

      // 检查参考图
      const imgs = await getRefImages(s.id)
      if (imgs.length > 0) {
        refImages.value = imgs
      }

      // 检查视频
      const vids = await getVideos(s.id)
      if (vids.length > 0) {
        videos.value = vids
        currentStep.value = 5
        for (const v of vids) {
          if ((v.status === 'generating' || v.status === 'pending') && v.seedanceTaskId) {
            pollVideo(v.id)
          }
        }
      }
    }
  } catch { /* 首次进入 */ }
})

async function doAnalyze() {
  analyzing.value = true
  analyzeError.value = ''
  try {
    const result = await analyzeProject(projectId)
    gameProfile.value = result.gameProfile
    currentStep.value = 1
  } catch (e: any) {
    analyzeError.value = e.message
  } finally {
    analyzing.value = false
  }
}

async function doGenerateDirections() {
  generatingDirections.value = true
  directionsError.value = ''
  try {
    const result = await generateDirections(projectId)
    directions.value = result.directions
    directionScriptIds.value = result.scriptIds || []
    currentStep.value = 2
  } catch (e: any) {
    directionsError.value = e.message
  } finally {
    generatingDirections.value = false
  }
}

async function doGenerateScript() {
  if (selectedDirectionIndex.value === null) return
  const dir = directions.value[selectedDirectionIndex.value]
  const scriptId = directionScriptIds.value[selectedDirectionIndex.value] || 0

  generatingScript.value = true
  try {
    const result = await generateScript(projectId, scriptId, dir)
    detailedScript.value = result.script
    currentScriptId.value = scriptId
    currentStep.value = 3
  } catch (e: any) {
    alert('生成脚本失败: ' + e.message)
  } finally {
    generatingScript.value = false
  }
}

async function doGenerateRefImages() {
  if (!detailedScript.value?.refImagePrompts?.length) return
  if (!currentScriptId.value) {
    alert('无法确定脚本ID，请重新生成脚本')
    return
  }

  generatingRefImages.value = true
  refImageStatus.value = 'generating'
  try {
    await generateRefImages(projectId, currentScriptId.value, detailedScript.value.refImagePrompts)
    await loadRefImages(currentScriptId.value)
  } catch (e: any) {
    alert('生成参考图失败: ' + e.message)
  } finally {
    generatingRefImages.value = false
  }
}

async function loadRefImages(scriptId: number) {
  const images = await getRefImages(scriptId)
  refImages.value = images
  for (const img of images) {
    if ((img.status === 'generating' || img.status === 'pending') && img.seedreamTaskId && !pollingRefIds.value.has(img.id)) {
      pollRefImage(img.id)
    }
  }
}

async function pollRefImage(id: number) {
  pollingRefIds.value.add(id)
  try {
    const maxPolls = 30
    for (let i = 0; i < maxPolls; i++) {
      await new Promise(r => setTimeout(r, 3000))
      try {
        const result = await checkRefImage(id)
        if (result.status === 'completed') {
          refImageStatus.value = 'done'
          if (currentScriptId.value) {
            refImages.value = await getRefImages(currentScriptId.value)
          }
          return
        }
        if (result.status === 'failed') return
      } catch { break }
    }
  } finally {
    pollingRefIds.value.delete(id)
  }
}

async function doGenerateVideo() {
  if (!currentScriptId.value) {
    alert('无法确定脚本ID，请重新生成脚本')
    return
  }
  const refImageIds = refImages.value.map(i => i.id)

  generatingVideo.value = true
  try {
    await generateVideo(projectId, currentScriptId.value, refImageIds)
    currentStep.value = 5
    const vids = await getVideos(currentScriptId.value)
    videos.value = vids
    for (const v of vids) {
      if (v.seedanceTaskId) pollVideo(v.id)
    }
  } catch (e: any) {
    alert('生成视频失败: ' + e.message)
  } finally {
    generatingVideo.value = false
  }
}

async function pollVideo(id: number) {
  // Seedance 1.5/2.0 在 1080p 下经常 5-7 分钟，按 4s 间隔最多 15 分钟
  const maxPolls = 225
  const startTime = Date.now()
  const maxDurationMs = 15 * 60 * 1000
  try {
    while (Date.now() - startTime < maxDurationMs) {
      await new Promise(r => setTimeout(r, 4000))
      try {
        const result = await checkVideo(id)
        if (result.status === 'completed') {
          if (currentScriptId.value) {
            videos.value = await getVideos(currentScriptId.value)
          }
          return
        }
        if (result.status === 'failed') return
      } catch { break }
    }
  } finally {
    pollingVideoIds.value.delete(id)
  }
}

function copyText(text: string) {
  navigator.clipboard.writeText(text)
}

// ====== 素材上传 ======

function onAssetDrop(e: DragEvent) {
  dragOver.value = false
  const files = e.dataTransfer?.files
  if (files) doUpload(Array.from(files))
}

function onAssetPick(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files) doUpload(Array.from(input.files))
  input.value = ''
}

async function doUpload(files: File[]) {
  if (!files.length || uploading.value) return
  uploading.value = true
  uploadError.value = ''
  try {
    const result = await uploadAssets(projectId, files)
    // 合并：失败的文件名 + 原因
    if (result.rejected?.length) {
      const msg = result.rejected.map(r => `${r.filename}: ${r.reason}`).join('; ')
      uploadError.value = `部分文件被拒绝 - ${msg}`
    }
    // 重新拉素材列表
    assets.value = await listAssets(projectId)
  } catch (e: any) {
    uploadError.value = e.message
  } finally {
    uploading.value = false
  }
}

async function doDeleteAsset(assetId: number) {
  if (!confirm('确定删除该素材？')) return
  try {
    await deleteAsset(projectId, assetId)
    assets.value = await listAssets(projectId)
  } catch (e: any) {
    alert('删除失败: ' + e.message)
  }
}
</script>

<style scoped>
.project-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
}

.project-header h1 {
  font-size: 24px;
  margin-bottom: 4px;
}

.step-card {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
  opacity: 0.5;
  transition: opacity 0.3s;
}

.step-card.active {
  opacity: 1;
  border-color: var(--color-primary);
}

.step-number {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--color-bg);
  border: 2px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 16px;
  flex-shrink: 0;
}

.step-card.active .step-number {
  border-color: var(--color-primary);
  background: var(--color-primary);
}

.step-content {
  flex: 1;
}

.step-content h3 {
  font-size: 18px;
  margin-bottom: 4px;
}

.game-profile {
  padding: 16px;
}

.profile-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.pl {
  display: block;
  font-size: 12px;
  color: var(--color-text-muted);
  text-transform: uppercase;
}

.pv {
  font-size: 14px;
}

.direction-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-top: 12px;
}

.direction-card {
  cursor: pointer;
  padding: 16px;
  transition: all 0.2s;
}

.direction-card:hover {
  border-color: var(--color-primary);
}

.direction-card.selected {
  border-color: var(--color-primary);
  background: rgba(108, 92, 231, 0.08);
}

.direction-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.direction-header h4 {
  font-size: 16px;
}

.hook-tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(0, 206, 201, 0.2);
  color: var(--color-success);
  white-space: nowrap;
}

.direction-strategy {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 6px;
}

.direction-rationale {
  font-size: 13px;
  color: var(--color-text-muted);
  margin-bottom: 8px;
}

.direction-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--color-text-muted);
}

.notes-box {
  background: rgba(253, 203, 110, 0.1);
  border: 1px solid rgba(253, 203, 110, 0.3);
  border-radius: var(--radius-sm);
  padding: 12px;
  margin: 16px 0;
  font-size: 14px;
}

.prompt-box {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 12px;
}

.prompt-text {
  font-size: 13px;
  line-height: 1.5;
  color: var(--color-text-muted);
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 300px;
  overflow-y: auto;
}

.ref-images-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-top: 12px;
}

.ref-image-card {
  background: var(--color-bg);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.ref-image-label {
  font-size: 12px;
  padding: 8px;
  color: var(--color-text-muted);
  text-align: center;
  border-bottom: 1px solid var(--color-border);
}

.ref-image-wrapper img {
  width: 100%;
  aspect-ratio: 9/16;
  object-fit: cover;
  display: block;
}

.ref-image-placeholder {
  aspect-ratio: 9/16;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.video-card {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.video-wrapper {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.video-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  background: var(--color-bg);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-sm);
  width: 100%;
  max-width: 360px;
}

.drop-zone {
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-sm);
  padding: 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--color-bg);
}
.drop-zone:hover,
.drop-zone.active {
  border-color: var(--color-primary);
  background: rgba(108, 92, 231, 0.05);
}

.asset-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 280px;
  overflow-y: auto;
}
.asset-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  background: var(--color-bg);
  border-radius: 4px;
  font-size: 13px;
}
.asset-icon { font-size: 16px; }
.asset-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-text-muted);
}
.asset-meta { display: flex; align-items: center; gap: 8px; }
.asset-type-badge {
  font-size: 10px;
  padding: 2px 6px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 3px;
  color: var(--color-text-muted);
}

@media (max-width: 768px) {
  .direction-grid { grid-template-columns: 1fr; }
  .profile-grid { grid-template-columns: repeat(2, 1fr); }
  .ref-images-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
