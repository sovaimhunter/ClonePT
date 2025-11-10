/**
 * 文件处理辅助函数
 */

import { extractTextFromPDF } from '../../utils/pdfExtractor.js'
import {
  isImageType,
  isPDFType,
  isTextFileType,
  MAX_PDF_PAGES,
  MAX_PDF_CHARS,
  MAX_TEXT_LENGTH,
  ERROR_MESSAGES,
  STATUS_MESSAGES,
} from '../../constants/index.js'

/**
 * 上传图片到 Supabase Storage
 */
export async function uploadImage(file, functionBaseUrl, supabaseAnonKey, activeSessionId) {
  const preview = URL.createObjectURL(file)

  const formData = new FormData()
  formData.append('file', file)
  formData.append('sessionId', activeSessionId || '')
  formData.append('type', 'vision')

  const response = await fetch(`${functionBaseUrl}/upload-file`, {
    method: 'POST',
    headers: {
      ...(supabaseAnonKey
        ? {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${supabaseAnonKey}`,
          }
        : {}),
    },
    body: formData,
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || ERROR_MESSAGES.IMAGE_UPLOAD_FAILED)
  }

  const uploadedFile = await response.json()
  return { preview, url: uploadedFile.url }
}

/**
 * 提取 PDF 文本内容
 */
export async function processPDF(file, setStatus) {
  setStatus(`${STATUS_MESSAGES.EXTRACTING_PDF.replace('...', '')} ${file.name}...`)

  try {
    const textContent = await extractTextFromPDF(file, {
      maxPages: MAX_PDF_PAGES,
      maxChars: MAX_PDF_CHARS,
    })

    if (!textContent || textContent.trim().length === 0) {
      throw new Error(ERROR_MESSAGES.PDF_EMPTY)
    }

    console.log(`${STATUS_MESSAGES.PDF_EXTRACTED}: ${textContent.length} 字符`)
    setStatus(null)
    return textContent
  } catch (err) {
    console.error(ERROR_MESSAGES.PDF_EXTRACT_FAILED, err)
    setStatus(null)
    throw new Error(`${ERROR_MESSAGES.PDF_EXTRACT_FAILED}: ${err.message}`)
  }
}

/**
 * 读取文本文件内容
 */
export async function processTextFile(file, setStatus) {
  setStatus(`${STATUS_MESSAGES.READING_FILE.replace('...', '')} ${file.name}...`)

  try {
    let textContent = await file.text()

    if (!textContent || textContent.trim().length === 0) {
      throw new Error(ERROR_MESSAGES.TEXT_FILE_EMPTY)
    }

    // 限制文本长度
    if (textContent.length > MAX_TEXT_LENGTH) {
      textContent = textContent.slice(0, MAX_TEXT_LENGTH) + '\n\n... (文件过长，已截断)'
    }

    console.log(`${STATUS_MESSAGES.TEXT_FILE_READ}: ${textContent.length} 字符`)
    setStatus(null)
    return textContent
  } catch (err) {
    console.error(ERROR_MESSAGES.TEXT_FILE_READ_FAILED, err)
    setStatus(null)
    throw new Error(`${ERROR_MESSAGES.TEXT_FILE_READ_FAILED}: ${err.message}`)
  }
}

/**
 * 根据文件类型处理文件
 */
export async function processFile(file, model, config) {
  const { functionBaseUrl, supabaseAnonKey, activeSessionId, setStatus } = config

  let preview = null
  let textContent = null
  let url = null

  // 判断文件类型
  const isImage = isImageType(file.type)
  const isPDF = isPDFType(file)
  const isTextFile = isTextFileType(file)

  if (isImage) {
    // 图片：上传到 Supabase Storage
    const result = await uploadImage(file, functionBaseUrl, supabaseAnonKey, activeSessionId)
    preview = result.preview
    url = result.url
  } else if (isPDF) {
    // PDF：在前端提取文本
    textContent = await processPDF(file, setStatus)
  } else if (isTextFile) {
    // TXT 等文本文件：直接读取内容
    textContent = await processTextFile(file, setStatus)
  } else {
    throw new Error(ERROR_MESSAGES.UNSUPPORTED_TYPE)
  }

  return {
    name: file.name,
    type: file.type,
    size: file.size,
    preview,
    url,
    textContent,
  }
}

