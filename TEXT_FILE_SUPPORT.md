# 文本文件支持说明

## 功能概述

GPT-4o 现在可以读取并理解文本文件内容（txt、md、json、代码文件等）。上传文本文件后，内容会自动嵌入到消息中，AI 可以直接分析。

## 支持的文件类型

### 文本文件（自动读取内容）
- ✅ `.txt` - 纯文本
- ✅ `.md` - Markdown
- ✅ `.csv` - CSV 数据
- ✅ `.json` - JSON 数据
- ✅ `.js` / `.jsx` - JavaScript
- ✅ `.ts` / `.tsx` - TypeScript
- ✅ `.py` - Python
- ✅ `.java` - Java
- ✅ `.cpp` / `.c` / `.h` - C/C++
- ✅ `.html` - HTML
- ✅ `.css` - CSS

### 图片文件（Vision API）
- ✅ `.jpg` / `.jpeg` / `.png` / `.gif` / `.webp`

### 其他文件（仅链接）
- ⚠️ `.pdf` / `.docx` - 需要额外处理（未实现）

## 工作原理

### 1. 文件上传时读取内容

```javascript
// 检测文本文件类型
const textFileTypes = [
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
  // ...
]

// 读取文件内容
if (textFileTypes.includes(file.type) || 
    file.name.match(/\.(txt|md|json|js|py)$/i)) {
  textContent = await file.text()
}

// 保存到附件
{
  name: 'example.txt',
  type: 'text/plain',
  url: 'https://...',
  textContent: '文件的实际内容...'
}
```

### 2. 发送消息时嵌入内容

**图片**：
```markdown
![cat.jpg](https://xxx.supabase.co/.../cat.jpg)
```

**文本文件**：
````markdown
**文件: example.txt**
```
这是文件的实际内容
可以有多行
GPT-4o 可以直接读取
```
````

**其他文件**：
```markdown
[📎 document.pdf](https://xxx.supabase.co/.../document.pdf)
```

### 3. GPT-4o 接收到的消息

```
**文件: config.json**
```
{
  "name": "MyApp",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.0.0"
  }
}
```

请帮我分析这个配置文件
```

GPT-4o 可以直接看到文件内容并进行分析。

## 使用示例

### 示例 1: 分析代码

**上传文件**: `app.js`
```javascript
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0)
}
```

**用户提问**: "这段代码有什么问题？"

**GPT-4o 看到的**:
````
**文件: app.js**
```
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0)
}
```

这段代码有什么问题？
````

**GPT-4o 回复**: "这段代码没有处理 items 为 null 或 undefined 的情况..."

### 示例 2: 分析数据

**上传文件**: `data.csv`
```csv
姓名,年龄,城市
张三,25,北京
李四,30,上海
王五,28,广州
```

**用户提问**: "统计平均年龄"

**GPT-4o 看到的**:
````
**文件: data.csv**
```
姓名,年龄,城市
张三,25,北京
李四,30,上海
王五,28,广州
```

统计平均年龄
````

**GPT-4o 回复**: "根据数据，平均年龄是 (25+30+28)/3 = 27.67 岁"

### 示例 3: 代码审查

**上传文件**: `UserService.java`
```java
public class UserService {
    public User findUser(String id) {
        return database.query("SELECT * FROM users WHERE id = " + id);
    }
}
```

**用户提问**: "这段代码有安全问题吗？"

**GPT-4o 回复**: "是的，这段代码存在 SQL 注入漏洞..."

## 技术实现

### 前端读取文件

```javascript
// 检测文件类型
const textFileTypes = [
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
  'text/html',
  'text/css',
  'text/javascript',
  'application/javascript',
]

// 通过扩展名判断
const isTextFile = textFileTypes.includes(file.type) || 
  file.name.match(/\.(txt|md|csv|json|js|jsx|ts|tsx|html|css|py|java|cpp|c|h)$/i)

// 读取内容
if (isTextFile) {
  try {
    const textContent = await file.text()
    attachment.textContent = textContent
  } catch (err) {
    console.warn('无法读取文件内容', err)
  }
}
```

### 消息格式化

```javascript
const attachmentParts = attachments.map((att) => {
  // 图片：Markdown 图片语法
  if (att.type?.startsWith('image/')) {
    return `![${att.name}](${att.url})`
  }
  
  // 文本文件：代码块嵌入
  if (att.textContent) {
    return `**文件: ${att.name}**\n\`\`\`\n${att.textContent}\n\`\`\``
  }
  
  // 其他：链接
  return `[📎 ${att.name}](${att.url})`
})

const userMessageContent = attachmentParts.join('\n\n') + '\n\n' + text
```

### 数据库存储

```json
{
  "content": "**文件: example.txt**\n```\n文件内容...\n```\n\n请分析这个文件",
  "attachments": [
    {
      "name": "example.txt",
      "type": "text/plain",
      "url": "https://...",
      "textContent": "文件内容..."
    }
  ]
}
```

## 文件大小限制

### 建议限制
- **文本文件**: < 100KB（约 10 万字符）
- **图片文件**: < 20MB
- **总消息长度**: < 128K tokens

### 超大文件处理

```javascript
// 限制文件大小
if (file.size > 100 * 1024) { // 100KB
  // 截断内容
  const fullText = await file.text()
  textContent = fullText.slice(0, 100000) + '\n\n... (文件过大，已截断)'
}
```

## 优势对比

| 方案 | 优势 | 劣势 |
|------|------|------|
| **直接嵌入内容** | ✅ GPT-4o 可直接读取<br>✅ 无需额外 API<br>✅ 实现简单 | ❌ 文件大小受限<br>❌ 仅支持文本 |
| **OpenAI Files API** | ✅ 支持大文件<br>✅ 支持 PDF/Word | ❌ 需要额外上传<br>❌ 需要 Assistants API |
| **仅链接** | ✅ 节省 tokens | ❌ GPT-4o 无法读取 |

## 常见问题

**Q: GPT-4o 能读取 PDF 吗？**
A: 目前不能。需要使用 OpenAI Files API 或提取 PDF 文本后嵌入。

**Q: 文件太大怎么办？**
A: 可以截断内容或分段上传：
```javascript
if (textContent.length > 100000) {
  textContent = textContent.slice(0, 100000) + '\n\n... (已截断)'
}
```

**Q: 支持哪些编程语言？**
A: 所有文本格式的代码文件：
- JavaScript/TypeScript
- Python
- Java
- C/C++
- Go
- Rust
- 等等...

**Q: 中文文件会乱码吗？**
A: 不会，`file.text()` 自动处理 UTF-8 编码。

**Q: 可以上传多个文件吗？**
A: 可以，每个文件的内容都会嵌入到消息中。

## 未来扩展

### 1. PDF 支持
使用 PDF.js 提取文本：
```javascript
import * as pdfjsLib from 'pdfjs-dist'

const pdf = await pdfjsLib.getDocument(file).promise
let text = ''
for (let i = 1; i <= pdf.numPages; i++) {
  const page = await pdf.getPage(i)
  const content = await page.getTextContent()
  text += content.items.map(item => item.str).join(' ')
}
```

### 2. Word 文档支持
使用 mammoth.js：
```javascript
import mammoth from 'mammoth'

const arrayBuffer = await file.arrayBuffer()
const result = await mammoth.extractRawText({ arrayBuffer })
textContent = result.value
```

### 3. 代码高亮预览
在消息中显示代码时添加语法高亮：
```jsx
<SyntaxHighlighter language="javascript">
  {textContent}
</SyntaxHighlighter>
```

### 4. 文件内容搜索
在附件内容中搜索关键词：
```javascript
const searchInAttachments = (query) => {
  return attachments.filter(att => 
    att.textContent?.includes(query)
  )
}
```

## 测试建议

### 功能测试
1. ✅ 上传 .txt 文件
2. ✅ 上传 .json 文件
3. ✅ 上传 .js 代码文件
4. ✅ 上传 .py 代码文件
5. ✅ 上传 .md Markdown 文件
6. ✅ 混合上传图片 + 文本
7. ✅ GPT-4o 能正确理解内容

### 边界测试
1. 空文件
2. 超大文件（> 1MB）
3. 特殊字符文件名
4. 非 UTF-8 编码
5. 二进制文件误识别

## 总结

通过读取文本文件内容并嵌入到消息中，GPT-4o 可以：

- ✅ 分析代码
- ✅ 审查配置
- ✅ 处理数据
- ✅ 理解文档
- ✅ 回答问题

**核心优势**：
- 📄 直接读取文本文件
- 🔍 GPT-4o 可分析内容
- 💾 内容永久保存
- 🚀 实现简单高效

