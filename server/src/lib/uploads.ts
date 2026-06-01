/**
 * 项目素材上传目录管理
 *
 * 每个项目拥有独立的 uploads 目录:
 *   server/uploads/projects/<projectId>/
 *
 * 流水线（analyzeProject 等）默认从这个目录读素材，
 * 不再要求用户提供任意本地路径，规避路径穿越 / 任意文件读取风险。
 */

import path from 'path'
import fs from 'fs'

const UPLOADS_ROOT = path.join(process.cwd(), 'uploads', 'projects')

/** 取得项目 uploads 目录的绝对路径（不保证已存在） */
export function getProjectUploadsDir(projectId: number): string {
  return path.join(UPLOADS_ROOT, String(projectId))
}

/** 取得项目 uploads 目录，不存在则创建 */
export function ensureProjectUploadsDir(projectId: number): string {
  const dir = getProjectUploadsDir(projectId)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

/** 删除项目 uploads 目录（项目被删时调用） */
export function cleanupProjectUploads(projectId: number): void {
  const dir = getProjectUploadsDir(projectId)
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

/** 检查文件名是否在允许的扩展名白名单内（图片 + 文本） */
export function isAllowedUploadExt(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase()
  return ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.txt', '.md'].includes(ext)
}
