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
      <div class="modal">
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
          />
          <input
            v-model="newProject.assetPath"
            class="input"
            placeholder="素材文件夹路径（如：/path/to/game/assets）"
          />
          <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 8px;">
            <button class="btn" @click="showCreate = false">取消</button>
            <button
              class="btn btn-primary"
              :disabled="!newProject.name"
              @click="handleCreate"
            >
              创建项目
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
          素材路径: {{ project.assetPath || '未设置' }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { projects, loading, fetchAll, create } = useProjects()

const showCreate = ref(false)
const newProject = ref({ name: '', description: '', assetPath: '' })

onMounted(() => fetchAll())

async function handleCreate() {
  try {
    await create(newProject.value)
    showCreate.value = false
    newProject.value = { name: '', description: '', assetPath: '' }
  } catch (e: any) {
    alert('创建失败: ' + e.message)
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
</style>
