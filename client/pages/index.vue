<template>
  <div class="page-container">
    <!-- 头部 -->
    <header style="margin-bottom: 32px;">
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <div>
          <h1 style="font-size: 28px; font-weight: 700;">游戏投放素材工坊</h1>
          <p style="color: var(--color-text-muted); margin-top: 4px;">AI 驱动的游戏视频广告自动化生成平台</p>
        </div>
        <button class="btn btn-primary" @click="showCreate = true">
          + 新建项目
        </button>
      </div>
    </header>

    <!-- 创建项目弹窗 -->
    <div v-if="showCreate" class="modal-overlay" @click.self="showCreate = false">
      <div class="modal" style="max-width: 540px;">
        <h3 style="margin-bottom: 16px;">新建游戏项目</h3>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <input
            v-model="newProject.name"
            class="input"
            placeholder="项目名称（如：XX游戏-公测投放）"
          />
          <textarea
            v-model="newProject.description"
            class="textarea"
            placeholder="游戏简介（可选）"
            rows="2"
          />

          <!-- 素材上传区 -->
          <div>
            <label style="font-size: 13px; color: var(--color-text-muted); display: block; margin-bottom: 6px;">
              素材（图片 .png/.jpg/.webp/.gif，文字 .txt/.md，可稍后补充）
            </label>
            <div
              class="drop-zone"
              :class="{ active: dragOver }"
              @dragover.prevent="dragOver = true"
              @dragleave="dragOver = false"
              @drop.prevent="onDrop"
              @click="fileInput?.click()"
            >
              <input
                ref="fileInput"
                type="file"
                multiple
                accept=".png,.jpg,.jpeg,.webp,.gif,.txt,.md"
                style="display: none;"
                @change="onFilePick"
              />
              <div v-if="!pickedFiles.length" style="color: var(--color-text-muted); font-size: 13px;">
                拖拽文件到此处，或<u style="cursor: pointer; color: var(--color-primary);">点击选择</u>
              </div>
              <div v-else style="text-align: left; font-size: 13px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                  <strong>已选 {{ pickedFiles.length }} 个文件</strong>
                  <button class="btn btn-sm" @click.stop="pickedFiles = []">清空</button>
                </div>
                <div v-for="(f, i) in pickedFiles" :key="i" class="picked-file">
                  <span class="picked-file-name">{{ f.name }}</span>
                  <span class="picked-file-size">{{ formatBytes(f.size) }}</span>
                </div>
              </div>
            </div>
          </div>

          <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 8px;">
            <button class="btn" @click="showCreate = false" :disabled="creating">取消</button>
            <button
              class="btn btn-primary"
              :disabled="!newProject.name || creating"
              @click="handleCreate"
            >
              <span v-if="creating" class="spinner" style="width: 12px; height: 12px; margin-right: 6px;"></span>
              {{ creating ? '创建中...' : '创建项目' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 项目列表 -->
    <div v-if="loading" style="text-align: center; padding: 60px; color: var(--color-text-muted);">
      <div class="spinner" style="margin: 0 auto 12px;"></div>
      加载中...
    </div>

    <div v-else-if="projects.length === 0" class="empty-state">
      <p style="font-size: 18px; margin-bottom: 8px;">还没有项目</p>
      <p style="color: var(--color-text-muted);">点击「新建项目」开始制作你的第一个游戏广告素材</p>
    </div>

    <div v-else class="grid-2">
      <div
        v-for="project in projects"
        :key="project.id"
        class="card project-card"
        @click="navigateTo(`/projects/${project.id}`)"
      >
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <h3 style="font-size: 18px; margin-bottom: 8px;">{{ project.name }}</h3>
          <span class="badge" :class="`badge-${project.status}`">
            {{ statusLabel(project.status) }}
          </span>
        </div>
        <p style="color: var(--color-text-muted); font-size: 14px; margin-bottom: 12px;">
          {{ project.description || '暂无描述' }}
        </p>
        <div style="display: flex; gap: 12px; font-size: 12px; color: var(--color-text-muted);">
          <span v-if="project.gameGenre">类型: {{ project.gameGenre }}</span>
          <span v-if="project.artStyle">画风: {{ project.artStyle }}</span>
        </div>
        <div style="margin-top: 12px; font-size: 12px; color: var(--color-text-muted);">
          {{ project.assetPath ? '素材: 已上传' : '素材: 未上传' }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { projects, loading, fetchAll, create, uploadAssets } = useProjects()

const showCreate = ref(false)
const creating = ref(false)
const newProject = ref({ name: '', description: '', assetPath: '' })
const pickedFiles = ref<File[]>([])
const dragOver = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

onMounted(() => fetchAll())

function onDrop(e: DragEvent) {
  dragOver.value = false
  const files = e.dataTransfer?.files
  if (files) addFiles(Array.from(files))
}

function onFilePick(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files) addFiles(Array.from(input.files))
  input.value = ''  // 允许重选同一文件
}

function addFiles(files: File[]) {
  const allowed = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.txt', '.md']
  for (const f of files) {
    const ext = '.' + (f.name.split('.').pop() || '').toLowerCase()
    if (allowed.includes(ext) && !pickedFiles.value.some(p => p.name === f.name && p.size === f.size)) {
      pickedFiles.value.push(f)
    }
  }
}

function formatBytes(n: number) {
  if (n < 1024) return n + ' B'
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB'
  return (n / 1024 / 1024).toFixed(2) + ' MB'
}

async function handleCreate() {
  if (!newProject.value.name || creating.value) return
  creating.value = true
  try {
    const project = await create(newProject.value)
    // 创建成功后,如果选了文件,立刻上传
    if (pickedFiles.value.length > 0) {
      try {
        await uploadAssets(project.id, pickedFiles.value)
      } catch (e: any) {
        alert('项目已创建,但素材上传失败: ' + e.message)
      }
    }
    showCreate.value = false
    newProject.value = { name: '', description: '', assetPath: '' }
    pickedFiles.value = []
  } catch (e: any) {
    alert('创建失败: ' + e.message)
  } finally {
    creating.value = false
  }
}

function statusLabel(s: string) {
  const map: Record<string, string> = { draft: '草稿', generating: '生成中', done: '已完成' }
  return map[s] || s
}
</script>

<style scoped>
.project-card {
  cursor: pointer;
}

.project-card:hover {
  transform: translateY(-2px);
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 24px;
  width: 90%;
  max-width: 480px;
}

.empty-state {
  text-align: center;
  padding: 80px 20px;
  color: var(--color-text-muted);
}

.drop-zone {
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-sm);
  padding: 20px;
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

.picked-file {
  display: flex;
  justify-content: space-between;
  padding: 3px 0;
  color: var(--color-text-muted);
  font-size: 12px;
}
.picked-file-name {
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.picked-file-size {
  flex-shrink: 0;
  margin-left: 8px;
}
</style>
