/**
 * 文件类型配置常量
 */

/**
 * 支持的图片类型
 */
export const IMAGE_TYPES = ['image/*']

/**
 * 支持的文档类型
 */
export const DOCUMENT_TYPES = [
  '.pdf',
  '.txt',
  '.md',
  '.json',
  '.csv',
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.py',
  '.java',
  '.cpp',
  '.c',
  '.h',
  '.html',
  '.css',
]

/**
 * 所有支持的文件类型（用于 file input accept）
 */
export const ACCEPTED_FILE_TYPES = [...IMAGE_TYPES, ...DOCUMENT_TYPES].join(',')

/**
 * 文本文件 MIME 类型
 */
export const TEXT_FILE_MIME_TYPES = [
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
  'text/html',
  'text/css',
  'text/javascript',
  'application/javascript',
]

/**
 * 文本文件扩展名正则
 */
export const TEXT_FILE_EXTENSIONS = /\.(txt|md|csv|json|js|jsx|ts|tsx|html|css|py|java|cpp|c|h)$/i

/**
 * 文件大小限制
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

/**
 * PDF 处理限制
 */
export const MAX_PDF_PAGES = 100
export const MAX_PDF_CHARS = 100000

/**
 * 文本内容长度限制
 */
export const MAX_TEXT_LENGTH = 100000

/**
 * 检查是否为图片类型
 */
export function isImageType(type) {
  return type?.startsWith('image/')
}

/**
 * 检查是否为 PDF
 */
export function isPDFType(file) {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

/**
 * 检查是否为文本文件
 */
export function isTextFileType(file) {
  return (
    TEXT_FILE_MIME_TYPES.includes(file.type) ||
    TEXT_FILE_EXTENSIONS.test(file.name)
  )
}

/**
 * 验证文件大小
 */
export function validateFileSize(file) {
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `文件 ${file.name} 过大，请选择小于 ${MAX_FILE_SIZE / 1024 / 1024}MB 的文件`,
    }
  }
  return { valid: true }
}

