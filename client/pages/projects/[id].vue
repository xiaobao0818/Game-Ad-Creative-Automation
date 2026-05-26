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
            素材: {{ project.assetPath || '未设置' }}
            <span v-if="!project.assetPath" style="color: var(--color-danger);">
              — 请先设置素材文件夹路径
            </span>
          </p>
        </div>
        <span class="badge" :class="`badge-${project.status}`">{{ statusMap[project.status] || project.status }}</span>
      </header>

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
            :disabled="analyzing || !project.assetPath"
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

          <!-- Seedance 合并提示词 -->
          <div class="prompt-box" style="margin-top: 20px;">
            <h4 style="margin-bottom: 8px;">完整 Seedance 2.0 视频提示词</h4>
            <pre class="prompt-text">{{ combinedSeedancePrompt }}</pre>
            <button class="btn btn-sm" style="margin-top: 8px;" @click="copyText(combinedSeedancePrompt)">复制提示词</button>
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
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const projectId = Number(route.params.id)
const { getProject, analyzeProject, generateDirections, generateScript, generateRefImages, fetchScripts } = useProjects()
const { getRefImages } = useScripts()
const { checkRefImage } = useGenerationStatus()

const project = ref<any>(null)
const gameProfile = ref<any>(null)
const directions = ref<any[]>([])
const directionScriptIds = ref<number[]>([])
const selectedDirectionIndex = ref<number | null>(null)
const currentScriptId = ref<number>(0)
const detailedScript = ref<any>(null)
const refImages = ref<any[]>([])
const refImageStatus = ref('')
const currentStep = ref(1)

const analyzing = ref(false)
const generatingDirections = ref(false)
const generatingScript = ref(false)
const generatingRefImages = ref(false)
const analyzeError = ref('')
const directionsError = ref('')

const statusMap: Record<string, string> = {
  draft: '草稿', analyzed: '已分析', directions_ready: '方向就绪', detailed: '脚本就绪', done: '完成',
}

const selectedDirection = computed(() =>
  selectedDirectionIndex.value !== null && selectedDirectionIndex.value < directions.value.length
    ? directions.value[selectedDirectionIndex.value]
    : null
)

const combinedSeedancePrompt = computed(() => {
  if (!detailedScript.value) return ''
  const parts = [
    `// Hook (0-3s)\n${detailedScript.value.hook.seedancePrompt}`,
    ...detailedScript.value.gameplayScenes.map((s: any, i: number) =>
      `// Scene ${i + 1} (${s.time})\n${s.seedancePrompt}`
    ),
    `// CTA (${detailedScript.value.cta.time})\n${detailedScript.value.cta.seedancePrompt}`,
    '\n// Global\n9:16 vertical, 15 seconds, cinematic transitions, high quality, 30fps',
  ]
  return parts.join('\n\n')
})

onMounted(async () => {
  project.value = await getProject(projectId)
  // 如果有已保存的 profile，恢复
  try {
    const stored = JSON.parse(project.value.profileJson || '{}')
    if (stored.gameGenre) gameProfile.value = stored
  } catch { /* 无已保存档案 */ }

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
    if ((img.status === 'generating' || img.status === 'pending') && img.seedreamTaskId) {
      pollRefImage(img.id)
    }
  }
}

async function pollRefImage(id: number) {
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
}

function copyText(text: string) {
  navigator.clipboard.writeText(text)
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

@media (max-width: 768px) {
  .direction-grid { grid-template-columns: 1fr; }
  .profile-grid { grid-template-columns: repeat(2, 1fr); }
  .ref-images-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
