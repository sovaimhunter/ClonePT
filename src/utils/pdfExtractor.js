import * as pdfjsLib from 'pdfjs-dist'

// 配置 PDF.js worker - 使用 jsDelivr CDN（更稳定）
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

/**
 * 从 PDF 文件中提取文本内容
 * @param {File} file - PDF 文件对象
 * @param {Object} options - 配置选项
 * @param {number} options.maxPages - 最大页数（默认 50）
 * @param {number} options.maxChars - 最大字符数（默认 50000）
 * @returns {Promise<string>} 提取的文本内容
 */
export async function extractTextFromPDF(file, options = {}) {
  const { maxPages = 50, maxChars = 50000 } = options

  try {
    // 读取文件为 ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()

    // 加载 PDF 文档
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
    const pdf = await loadingTask.promise

    const numPages = Math.min(pdf.numPages, maxPages)
    let fullText = ''

    // 逐页提取文本
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum)
      const textContent = await page.getTextContent()

      // 拼接文本项
      const pageText = textContent.items
        .map((item) => item.str)
        .join(' ')

      fullText += `\n--- 第 ${pageNum} 页 ---\n${pageText}\n`

      // 检查是否超过最大字符数
      if (fullText.length > maxChars) {
        fullText = fullText.slice(0, maxChars)
        fullText += `\n\n... (PDF 内容过长，已截断。总共 ${pdf.numPages} 页，已提取 ${pageNum} 页)`
        break
      }
    }

    // 如果有更多页未提取
    if (numPages < pdf.numPages) {
      fullText += `\n\n... (PDF 共 ${pdf.numPages} 页，已提取前 ${numPages} 页)`
    }

    return fullText.trim()
  } catch (error) {
    console.error('PDF 文本提取失败:', error)
    throw new Error(`无法提取 PDF 文本: ${error.message}`)
  }
}

/**
 * 检查文件是否为 PDF
 * @param {File} file - 文件对象
 * @returns {boolean}
 */
export function isPDF(file) {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

