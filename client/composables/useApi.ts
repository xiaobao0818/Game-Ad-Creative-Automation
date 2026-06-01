const API_BASE = 'http://localhost:3001/api'

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.message || err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

// ====== 项目管理 ======
export function useProjects() {
  const projects = ref<any[]>([])
  const loading = ref(false)

  const fetchAll = async () => {
    loading.value = true
    try { projects.value = await apiFetch('/projects') } finally { loading.value = false }
  }

  const create = async (data: any) => {
    const p = await apiFetch('/projects', { method: 'POST', body: JSON.stringify(data) })
    await fetchAll()
    return p
  }

  const getProject = (id: number) => apiFetch(`/projects/${id}`)

  // Stage 1+2: 分析素材
  const analyzeProject = (id: number) =>
    apiFetch(`/projects/${id}/analyze`, { method: 'POST' })

  // Stage 3: 生成创意方向
  const getDirections = (id: number) =>
    apiFetch(`/projects/${id}/directions`)

  // Stage 3: 生成创意方向（返回 directions + scriptIds）
  const generateDirections = (id: number) =>
    apiFetch<{ status: string; directions: any[]; scriptIds: number[] }>(`/projects/${id}/directions`, { method: 'POST' })

  // Stage 4: 选定方向，生成详细脚本
  const generateScript = (projectId: number, scriptId: number, direction: any) =>
    apiFetch(`/projects/${projectId}/generate-script`, {
      method: 'POST',
      body: JSON.stringify({ scriptId, direction }),
    })

  // Stage 5: 生成参考图
  const generateRefImages = (projectId: number, scriptId: number, refImagePrompts: any[]) =>
    apiFetch(`/projects/${projectId}/generate-ref-images`, {
      method: 'POST',
      body: JSON.stringify({ scriptId, refImagePrompts }),
    })

  // Stage 6: 生成最终视频（Seedance）
  const generateVideo = (projectId: number, scriptId: number, refImageIds: number[]) =>
    apiFetch<{ status: string; videoId: number }>(`/projects/${projectId}/generate-video`, {
      method: 'POST',
      body: JSON.stringify({ scriptId, refImageIds }),
    })

  // 获取项目下脚本列表
  const fetchScripts = (projectId: number) =>
    apiFetch(`/projects/${projectId}/scripts`)

  return {
    projects, loading,
    fetchAll, create, getProject,
    analyzeProject, getDirections, generateDirections,
    generateScript, generateRefImages, generateVideo, fetchScripts,
  }
}

// ====== 脚本管理 ======
export function useScripts() {
  const getScript = (id: number) => apiFetch(`/scripts/${id}`)

  const updateScript = (id: number, data: any) =>
    apiFetch(`/scripts/${id}`, { method: 'PATCH', body: JSON.stringify(data) })

  const getRefImages = (scriptId: number) =>
    apiFetch(`/scripts/${scriptId}/ref-images`)

  const getVideos = (scriptId: number) =>
    apiFetch(`/scripts/${scriptId}/videos`)

  return { getScript, updateScript, getRefImages, getVideos }
}

// ====== 生成状态轮询 ======
export function useGenerationStatus() {
  const checkRefImage = (id: number) =>
    apiFetch(`/scripts/ref-image/${id}/check`)

  const checkVideo = (id: number) =>
    apiFetch(`/scripts/video/${id}/check`)

  return { checkRefImage, checkVideo }
}
