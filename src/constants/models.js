/**
 * 模型配置常量
 * 
 * - DeepSeek Chat: 快速通用对话模型
 * - DeepSeek Reasoner: 深度思考推理模型（显示思维链）
 * - GPT-4o Mini: OpenAI 多模态模型（支持图片识别、文件上传）
 */

export const MODEL_OPTIONS = [
  { value: 'deepseek-chat', label: 'DeepSeek Chat', icon: '💬' },
  { value: 'deepseek-reasoner', label: 'DeepSeek Reasoner', icon: '🧠' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini', icon: '🤖' },
]

/**
 * 支持文件上传的模型
 * GPT-4o Mini 支持图片识别、PDF 和文本文件处理
 */
export const MODEL_SUPPORTS_FILES = ['gpt-4o-mini']

/**
 * 默认模型
 */
export const DEFAULT_MODEL = 'deepseek-chat'

/**
 * 检查模型是否支持文件上传
 */
export function supportsFileUpload(model) {
  return MODEL_SUPPORTS_FILES.includes(model)
}

