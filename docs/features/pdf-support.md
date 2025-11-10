# PDF 文件支持说明

## 功能概述

现在支持上传 PDF 文件，系统会自动提取文本内容，GPT-4o 可以直接阅读和分析 PDF 中的文字。

## 工作原理

### 1. PDF.js 库

使用 Mozilla 的 PDF.js 库在浏览器中解析 PDF：

```javascript
import * as pdfjsLib from 'pdfjs-dist'

// 加载 PDF
const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

// 逐页提取文本
for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
  const page = await pdf.getPage(pageNum)
  const textContent = await page.getTextContent()
  const pageText = textContent.items.map(item => item.str).join(' ')
}
```

### 2. 提取流程

```
用户上传 PDF
    ↓
读取为 ArrayBuffer
    ↓
PDF.js 解析文档
    ↓
逐页提取文本
    ↓
拼接成完整文本
    ↓
嵌入到消息中
    ↓
GPT-4o 分析内容
```

### 3. 消息格式

````markdown
**文件: document.pdf**
```
--- 第 1 页 ---
这是 PDF 的第一页内容...

--- 第 2 页 ---
这是 PDF 的第二页内容...
```

请帮我总结这份文档
````

## 使用示例

### 示例 1: 分析报告

**上传**: `年度报告.pdf` (10 页)

**用户提问**: "总结这份报告的要点"

**GPT-4o 看到的**:
````
**文件: 年度报告.pdf**
```
--- 第 1 页 ---
2024年度工作总结
公司概况：...

--- 第 2 页 ---
财务数据：...
```

请帮我总结这份报告的要点
````

**GPT-4o 回复**: "根据报告内容，主要要点包括：1. 公司业绩增长..."

### 示例 2: 提取数据

**上传**: `销售数据.pdf`

**用户提问**: "提取所有销售额数据"

**GPT-4o** 可以识别 PDF 中的数字并提取。

### 示例 3: 翻译文档

**上传**: `英文论文.pdf`

**用户提问**: "翻译成中文"

**GPT-4o** 会翻译 PDF 中提取的文本。

## 限制说明

### 1. 文件大小限制

```javascript
{
  maxPages: 50,      // 最多提取 50 页
  maxChars: 50000,   // 最多 5 万字符
}
```

**原因**：
- 避免消耗过多 tokens
- 提升处理速度
- 防止浏览器卡顿

### 2. 支持的 PDF 类型

✅ **支持**：
- 文本型 PDF（可选择复制的）
- 扫描后 OCR 处理的 PDF
- 电子书 PDF
- 报告、论文 PDF

❌ **不支持**：
- 纯图片扫描 PDF（无 OCR）
- 加密/受保护的 PDF
- 复杂排版的 PDF（可能乱序）

### 3. 提取质量

| PDF 类型 | 提取质量 | 说明 |
|---------|---------|------|
| 纯文本 PDF | ⭐⭐⭐⭐⭐ | 完美提取 |
| 简单排版 | ⭐⭐⭐⭐ | 基本准确 |
| 复杂排版 | ⭐⭐⭐ | 可能乱序 |
| 表格 PDF | ⭐⭐ | 格式可能丢失 |
| 图片扫描 | ❌ | 无法提取 |

## 技术实现

### PDF 文本提取器

**src/utils/pdfExtractor.js**:

```javascript
export async function extractTextFromPDF(file, options = {}) {
  const { maxPages = 50, maxChars = 50000 } = options

  // 读取文件
  const arrayBuffer = await file.arrayBuffer()

  // 加载 PDF
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  let fullText = ''

  // 逐页提取
  for (let pageNum = 1; pageNum <= Math.min(pdf.numPages, maxPages); pageNum++) {
    const page = await pdf.getPage(pageNum)
    const textContent = await page.getTextContent()
    const pageText = textContent.items.map(item => item.str).join(' ')

    fullText += `\n--- 第 ${pageNum} 页 ---\n${pageText}\n`

    // 检查长度限制
    if (fullText.length > maxChars) {
      fullText = fullText.slice(0, maxChars)
      fullText += '\n\n... (内容过长，已截断)'
      break
    }
  }

  return fullText
}
```

### 集成到上传流程

```javascript
// 检测 PDF
if (isPDF(file)) {
  try {
    set({ error: '正在提取 PDF 文本...' })
    textContent = await extractTextFromPDF(file, {
      maxPages: 50,
      maxChars: 50000,
    })
    set({ error: null })
  } catch (err) {
    set({ error: `PDF 提取失败: ${err.message}` })
  }
}

// 保存到附件
attachment.textContent = textContent
```

## 性能优化

### 1. 分页处理

```javascript
// 不是一次性加载所有页
for (let pageNum = 1; pageNum <= numPages; pageNum++) {
  const page = await pdf.getPage(pageNum)
  // 处理单页
}
```

### 2. 长度限制

```javascript
if (fullText.length > maxChars) {
  fullText = fullText.slice(0, maxChars)
  fullText += '\n\n... (已截断)'
  break
}
```

### 3. Worker 加载

```javascript
// 使用 CDN 加载 worker，避免打包体积过大
pdfjsLib.GlobalWorkerOptions.workerSrc = 
  `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
```

## 用户体验

### 1. 加载提示

```javascript
set({ error: '正在提取 PDF 文本...' })
// 提取完成后
set({ error: null })
```

### 2. 错误处理

```javascript
try {
  textContent = await extractTextFromPDF(file)
} catch (err) {
  set({ error: `PDF 提取失败: ${err.message}` })
  // 继续上传，但没有文本内容
}
```

### 3. 进度反馈

未来可以添加进度条：

```javascript
for (let pageNum = 1; pageNum <= numPages; pageNum++) {
  // 更新进度
  set({ uploadProgress: (pageNum / numPages) * 100 })
  // 提取页面
}
```

## 常见问题

**Q: 为什么有些 PDF 提取不出文字？**
A: 可能是图片扫描的 PDF，需要先进行 OCR 处理。

**Q: PDF 太大怎么办？**
A: 系统会自动截断：
- 最多提取 50 页
- 最多 5 万字符
- 超出部分会显示"已截断"

**Q: 提取的文字顺序乱了？**
A: 复杂排版的 PDF 可能出现这种情况，建议：
- 使用简单排版的 PDF
- 或手动复制粘贴文本

**Q: 可以提取 PDF 中的图片吗？**
A: 目前不支持，只提取文本。

**Q: 加密的 PDF 能读取吗？**
A: 不能，需要先解密。

## 未来扩展

### 1. OCR 支持

对于图片扫描的 PDF，使用 Tesseract.js：

```javascript
import Tesseract from 'tesseract.js'

// 将 PDF 页面转为图片
const canvas = await page.render({ canvasContext }).promise

// OCR 识别
const { data: { text } } = await Tesseract.recognize(canvas)
```

### 2. 表格提取

保留表格格式：

```javascript
// 识别表格结构
const tables = detectTables(textContent)

// 转换为 Markdown 表格
const markdown = tablesToMarkdown(tables)
```

### 3. 图片提取

提取 PDF 中的图片：

```javascript
const images = await extractImagesFromPDF(pdf)

// 上传图片到 Storage
for (const image of images) {
  await uploadImage(image)
}
```

### 4. 分段处理

对于超大 PDF，分段上传：

```javascript
// 每 10 页一段
const chunks = splitPDFIntoChunks(pdf, 10)

for (const chunk of chunks) {
  await sendChunk(chunk)
}
```

## 对比其他方案

| 方案 | 优势 | 劣势 | 成本 |
|------|------|------|------|
| **PDF.js** | ✅ 免费<br>✅ 浏览器端处理<br>✅ 即时反馈 | ❌ 仅文本<br>❌ 复杂 PDF 可能失败 | 免费 |
| **OpenAI Files API** | ✅ 官方支持<br>✅ 处理完善<br>✅ 支持复杂 PDF | ❌ 需要上传<br>❌ 需要 Assistants API | 付费 |
| **第三方 OCR** | ✅ 支持扫描 PDF<br>✅ 识别图片 | ❌ 需要 API<br>❌ 速度慢 | 付费 |

## 测试建议

### 功能测试
1. ✅ 上传纯文本 PDF
2. ✅ 上传多页 PDF（> 10 页）
3. ✅ 上传超大 PDF（> 50 页）
4. ✅ 上传加密 PDF（应该失败）
5. ✅ 上传图片扫描 PDF（提取失败）
6. ✅ GPT-4o 能正确理解内容

### 性能测试
1. 小 PDF（< 5 页）- 应该 < 2 秒
2. 中 PDF（10-20 页）- 应该 < 5 秒
3. 大 PDF（> 50 页）- 应该截断

### 边界测试
1. 空 PDF
2. 损坏的 PDF
3. 非 PDF 文件（改扩展名）
4. 特殊字符文件名

## 部署步骤

### 1. 安装依赖

```bash
npm install pdfjs-dist
```

### 2. 构建前端

```bash
npm run build
```

### 3. 部署

```bash
# 部署 dist/
```

## 总结

通过 PDF.js 库，现在可以：

- ✅ 提取 PDF 文本内容
- ✅ GPT-4o 直接分析 PDF
- ✅ 支持多页文档
- ✅ 自动截断超长内容
- ✅ 浏览器端处理，无需服务器

**核心优势**：
- 📄 支持 PDF 文件
- 🔍 自动提取文本
- 💾 内容永久保存
- 🚀 免费且即时
- 🎯 GPT-4o 可分析

**注意事项**：
- 仅支持文本型 PDF
- 最多 50 页 / 5 万字符
- 复杂排版可能乱序

