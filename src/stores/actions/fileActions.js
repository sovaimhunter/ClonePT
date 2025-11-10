/**
 * 文件上传相关的 actions
 */

import { supportsFileUpload, ERROR_MESSAGES } from '../../constants/index.js'
import { handleErrorWithCleanup } from '../helpers/errorHandler.js'
import { processFile } from '../helpers/fileProcessor.js'

/**
 * 获取 Supabase 配置
 */
function getSupabaseConfig() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const functionBaseUrl =
    import.meta.env.VITE_SUPABASE_FUNCTION_URL ??
    (supabaseUrl ? `${supabaseUrl.replace(/\/$/, '')}/functions/v1` : '')
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!functionBaseUrl) {
    throw new Error('Supabase Function 地址未配置')
  }

  return { functionBaseUrl, supabaseAnonKey }
}

/**
 * 验证文件是否被支持
 */
function validateFileSupport(files, model) {
  const isSupported = files.every((file) => {
    const isImage = file.type?.startsWith('image/')
    return isImage || supportsFileUpload(model)
  })

  if (!isSupported) {
    throw new Error(ERROR_MESSAGES.UNSUPPORTED_TYPE)
  }
}

export function createFileActions(set, get) {
  return {
    /**
     * 上传多个文件
     */
    async uploadFiles(files) {
      const { activeSessionId, model } = get()
      set({ uploadingFiles: true, error: null })

      try {
        // 获取配置
        const { functionBaseUrl, supabaseAnonKey } = getSupabaseConfig()

        // 验证文件支持
        validateFileSupport(files, model)

        // 处理配置
        const config = {
          functionBaseUrl,
          supabaseAnonKey,
          activeSessionId,
          setStatus: (status) => set({ error: status }),
        }

        // 处理每个文件
        for (const file of files) {
          const attachment = await processFile(file, model, config)
          get().addAttachment(attachment)
        }
      } catch (error) {
        handleErrorWithCleanup(error, set, ERROR_MESSAGES.UPLOAD_FAILED)
      } finally {
        set({ uploadingFiles: false })
      }
    },
  }
}

