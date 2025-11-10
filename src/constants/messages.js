/**
 * 提示消息常量
 */

/**
 * 占位符消息
 */
export const PLACEHOLDER_MESSAGES = {
  LOADING_SESSIONS: '正在加载会话…',
  LOADING_MESSAGES: '正在加载消息…',
  EMPTY_CHAT: '暂时没有消息，开始输入与 DeepSeek 对话吧。',
  NO_SESSION: '新建一个会话或选择已有会话开始聊天。',
  NO_SESSIONS_YET: '还没有开始对话',
  SELECT_OR_CREATE: '选择左侧会话或新建一个',
}

/**
 * 错误消息
 */
export const ERROR_MESSAGES = {
  FILE_TOO_LARGE: '文件过大，请选择小于 10MB 的文件',
  UNSUPPORTED_TYPE: '不支持的文件类型或模型（仅 GPT-4o Mini 支持文档上传）',
  PDF_EMPTY: 'PDF 中没有可提取的文本（可能是扫描版）',
  PDF_EXTRACT_FAILED: 'PDF 提取失败',
  TEXT_FILE_EMPTY: '文件内容为空',
  TEXT_FILE_READ_FAILED: '文本文件读取失败',
  UPLOAD_FAILED: '文件上传失败',
  IMAGE_UPLOAD_FAILED: '图片上传失败',
  DOCUMENT_UPLOAD_FAILED: '文档上传失败',
  SESSION_CREATE_FAILED: '创建会话失败',
  SESSION_DELETE_FAILED: '删除会话失败',
  SESSION_LOAD_FAILED: '加载会话失败',
  MESSAGE_LOAD_FAILED: '加载消息失败',
  MESSAGE_SEND_FAILED: '发送消息失败',
  NO_SESSION_SELECTED: '请先选择或新建一个会话',
  SUPABASE_CONFIG_MISSING: 'Supabase Function 地址未配置',
}

/**
 * 成功消息
 */
export const SUCCESS_MESSAGES = {
  FILE_UPLOADED: '文件上传成功',
  SESSION_CREATED: '会话创建成功',
  SESSION_DELETED: '会话已删除',
  MESSAGE_COPIED: '已复制到剪贴板',
}

/**
 * 提示消息
 */
export const HINT_MESSAGES = {
  COMPOSER_PLACEHOLDER: '向 AI 提问，Shift+Enter 换行',
  COMPOSER_DRAFT: '草稿将自动保存',
  COMPOSER_READY: '输入内容后按 Enter 发送',
  COMPOSER_NO_SESSION: '新建会话后可开始输入',
  STREAMING_SEND: 'Enter 发送 · Shift+Enter 换行',
  STREAMING_STOP: '生成中 · Enter 停止',
  FILE_UPLOAD_GPT4O_ONLY: '上传文件（仅 GPT-4o Mini）',
  COPY_FAILED_MANUAL: '复制失败，请手动复制以下内容：',
}

/**
 * 状态消息
 */
export const STATUS_MESSAGES = {
  EXTRACTING_PDF: '正在提取 PDF 文本...',
  READING_FILE: '正在读取文件...',
  UPLOADING_FILE: '正在上传文件...',
  UPLOADING_TO_OPENAI: '正在上传到 OpenAI...',
  GENERATING: '生成中…',
  PDF_EXTRACTED: 'PDF 文本提取成功',
  TEXT_FILE_READ: '文本文件读取成功',
}

/**
 * 确认消息
 */
export const CONFIRM_MESSAGES = {
  DELETE_SESSION: '确定要删除该对话吗？此操作不可撤销，将删除会话及其全部消息。',
  DELETE_ATTACHMENT: '确定要删除该附件吗？',
}

/**
 * Token 信息格式化
 */
export function formatTokenInfo(tokens) {
  return tokens ? `消耗 ${tokens} tokens` : null
}

/**
 * 文件大小格式化
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

