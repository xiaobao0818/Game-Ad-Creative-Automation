<template>
  <div class="scene-card" :style="{ borderLeftColor: color }">
    <div class="scene-card-header">
      <div class="scene-card-badge" :style="{ background: color + '22', color }">
        {{ title }}
      </div>
      <span class="scene-card-time">{{ time }}</span>
    </div>
    <div class="scene-card-body">
      <div class="scene-field">
        <span class="field-label">文案</span>
        <p class="field-value copy-text">{{ scene.copy }}</p>
      </div>
      <div class="scene-field">
        <span class="field-label">视觉描述</span>
        <p class="field-value">{{ scene.visual }}</p>
      </div>
      <div class="scene-field" v-if="scene.audio">
        <span class="field-label">音效</span>
        <p class="field-value">{{ scene.audio }}</p>
      </div>
      <div class="scene-field" v-if="scene.seedancePrompt">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <span class="field-label">Seedance 提示词</span>
          <button class="btn btn-sm" @click="copy(scene.seedancePrompt)">复制</button>
        </div>
        <pre class="seedance-prompt">{{ scene.seedancePrompt }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  scene: any
  title: string
  time: string
  color: string
}>()

function copy(text: string) {
  navigator.clipboard.writeText(text)
}
</script>

<style scoped>
.scene-card {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-left: 3px solid var(--color-primary);
  border-radius: var(--radius-sm);
  margin-bottom: 12px;
  overflow: hidden;
}

.scene-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  border-bottom: 1px solid var(--color-border);
}

.scene-card-badge {
  font-size: 13px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 4px;
}

.scene-card-time {
  font-size: 13px;
  color: var(--color-text-muted);
}

.scene-card-body {
  padding: 14px;
}

.scene-field {
  margin-bottom: 12px;
}

.scene-field:last-child {
  margin-bottom: 0;
}

.field-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--color-text-muted);
  display: block;
  margin-bottom: 4px;
}

.field-value {
  font-size: 14px;
  line-height: 1.5;
  color: var(--color-text);
}

.copy-text {
  font-weight: 500;
  color: var(--color-warning);
}

.seedance-prompt {
  font-size: 12px;
  line-height: 1.5;
  color: var(--color-text-muted);
  white-space: pre-wrap;
  word-break: break-word;
  background: var(--color-surface);
  padding: 10px;
  border-radius: 6px;
  max-height: 200px;
  overflow-y: auto;
}
</style>
