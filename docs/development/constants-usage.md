# 常量使用指南

本文档介绍项目中常量的组织方式和使用方法。

## 📁 常量文件结构

```
src/constants/
├─ models.js          # 模型相关配置
├─ fileTypes.js       # 文件类型和验证
├─ messages.js        # 用户界面消息
└─ index.js           # 统一导出入口
```

---

## 🎯 models.js - 模型配置

### 常量

#### `MODEL_OPTIONS`
模型下拉菜单选项数组
```javascript
[
  { value: 'deepseek-chat', label: 'DeepSeek Chat', icon: '💬' },
  { value: 'deepseek-reasoner', label: 'DeepSeek Reasoner', icon: '🧠' },
  { value: 'gpt-4o', label: 'ChatGPT 4o', icon: '🤖' },
]
```

#### `MODEL_SUPPORTS_FILES`
支持文件上传的模型列表
```javascript
['gpt-4o']
```

#### `DEFAULT_MODEL`
默认使用的模型
```javascript
'deepseek-chat'
```

### 工具函数

#### `supportsFileUpload(model)`
检查指定模型是否支持文件上传
```javascript
import { supportsFileUpload } from '../constants/models'

if (supportsFileUpload('gpt-4o')) {
  // 显示文件上传按钮
}
```

---

## 📄 fileTypes.js - 文件类型配置

### 常量

#### 文件类型
- `IMAGE_TYPES` - 支持的图片类型：`['image/*']`
- `DOCUMENT_TYPES` - 支持的文档类型（PDF, TXT, MD, 代码文件等）
- `ACCEPTED_FILE_TYPES` - 合并的所有文件类型（用于 `<input accept>`）

#### 限制配置
- `MAX_FILE_SIZE` - 最大文件大小：10MB
- `MAX_PDF_PAGES` - PDF 最大页数：100
- `MAX_PDF_CHARS` - PDF 最大字符数：100,000
- `MAX_TEXT_LENGTH` - 文本最大长度：100,000

### 工具函数

#### `isImageType(type)`
检查 MIME 类型是否为图片
```javascript
import { isImageType } from '../constants/fileTypes'

if (isImageType(file.type)) {
  // 处理图片
}
```

#### `isPDFType(file)`
检查文件是否为 PDF
```javascript
import { isPDFType } from '../constants/fileTypes'

if (isPDFType(file)) {
  // 提取 PDF 文本
}
```

#### `isTextFileType(file)`
检查文件是否为文本类型
```javascript
import { isTextFileType } from '../constants/fileTypes'

if (isTextFileType(file)) {
  // 读取文本内容
}
```

#### `validateFileSize(file)`
验证文件大小
```javascript
import { validateFileSize } from '../constants/fileTypes'

const result = validateFileSize(file)
if (!result.valid) {
  alert(result.error)
}
```

---

## 💬 messages.js - 界面消息

### 常量

#### `PLACEHOLDER_MESSAGES`
占位符消息
```javascript
{
  LOADING_SESSIONS: '正在加载会话…',
  LOADING_MESSAGES: '正在加载消息…',
  EMPTY_CHAT: '暂时没有消息，开始输入与 DeepSeek 对话吧。',
  NO_SESSION: '新建一个会话或选择已有会话开始聊天。',
  // ...
}
```

#### `ERROR_MESSAGES`
错误消息
```javascript
{
  FILE_TOO_LARGE: '文件过大，请选择小于 10MB 的文件',
  UNSUPPORTED_TYPE: '不支持的文件类型或模型（仅 GPT-4o 支持文档上传）',
  PDF_EMPTY: 'PDF 中没有可提取的文本（可能是扫描版）',
  // ...
}
```

#### `STATUS_MESSAGES`
状态提示
```javascript
{
  EXTRACTING_PDF: '正在提取 PDF 文本...',
  READING_FILE: '正在读取文件...',
  GENERATING: '生成中…',
  // ...
}
```

#### `CONFIRM_MESSAGES`
确认对话框
```javascript
{
  DELETE_SESSION: '确定要删除该对话吗？此操作不可撤销，将删除会话及其全部消息。',
  // ...
}
```

### 工具函数

#### `formatTokenInfo(tokens)`
格式化 Token 消耗信息
```javascript
import { formatTokenInfo } from '../constants/messages'

const info = formatTokenInfo(1500)
// 返回: "消耗 1500 tokens"
```

#### `formatFileSize(bytes)`
格式化文件大小
```javascript
import { formatFileSize } from '../constants/messages'

const size = formatFileSize(2048000)
// 返回: "1.95 MB"
```

---

## 📦 统一导出 - index.js

所有常量都可以从 `constants/index.js` 统一导入：

```javascript
import {
  // 模型相关
  MODEL_OPTIONS,
  DEFAULT_MODEL,
  supportsFileUpload,
  
  // 文件类型相关
  ACCEPTED_FILE_TYPES,
  isImageType,
  isPDFType,
  
  // 消息相关
  PLACEHOLDER_MESSAGES,
  ERROR_MESSAGES,
  formatTokenInfo,
} from '../constants/index.js'
```

---

## 🎨 使用示例

### 示例 1：文件上传验证

```javascript
import {
  supportsFileUpload,
  isPDFType,
  isImageType,
  validateFileSize,
  ERROR_MESSAGES,
  STATUS_MESSAGES,
} from '../constants/index.js'

async function handleFileUpload(file, model) {
  // 检查模型支持
  if (!supportsFileUpload(model)) {
    throw new Error(ERROR_MESSAGES.UNSUPPORTED_TYPE)
  }
  
  // 验证文件大小
  const sizeCheck = validateFileSize(file)
  if (!sizeCheck.valid) {
    throw new Error(sizeCheck.error)
  }
  
  // 根据类型处理
  if (isImageType(file.type)) {
    return await uploadImage(file)
  } else if (isPDFType(file)) {
    showStatus(STATUS_MESSAGES.EXTRACTING_PDF)
    return await extractPDFText(file)
  }
}
```

### 示例 2：显示占位符

```javascript
import { PLACEHOLDER_MESSAGES } from '../constants/index.js'

function MessageList({ loading, messages, hasSession }) {
  if (loading) {
    return <div>{PLACEHOLDER_MESSAGES.LOADING_MESSAGES}</div>
  }
  
  if (messages.length === 0) {
    return (
      <div>
        {hasSession 
          ? PLACEHOLDER_MESSAGES.EMPTY_CHAT 
          : PLACEHOLDER_MESSAGES.NO_SESSION}
      </div>
    )
  }
  
  return <div>{/* 渲染消息列表 */}</div>
}
```

### 示例 3：确认对话框

```javascript
import { CONFIRM_MESSAGES } from '../constants/index.js'

function deleteSession(sessionId) {
  if (window.confirm(CONFIRM_MESSAGES.DELETE_SESSION)) {
    // 执行删除
  }
}
```

---

## ✅ 最佳实践

1. **始终使用常量而不是硬编码字符串**
   ```javascript
   // ❌ 不好
   throw new Error('文件过大')
   
   // ✅ 好
   throw new Error(ERROR_MESSAGES.FILE_TOO_LARGE)
   ```

2. **使用工具函数进行验证**
   ```javascript
   // ❌ 不好
   if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
     // ...
   }
   
   // ✅ 好
   if (isPDFType(file)) {
     // ...
   }
   ```

3. **集中管理配置参数**
   ```javascript
   // ❌ 不好
   if (textContent.length > 100000) {
     textContent = textContent.slice(0, 100000)
   }
   
   // ✅ 好
   if (textContent.length > MAX_TEXT_LENGTH) {
     textContent = textContent.slice(0, MAX_TEXT_LENGTH)
   }
   ```

4. **为新功能添加对应常量**
   - 新增模型 → 更新 `models.js`
   - 新增文件类型 → 更新 `fileTypes.js`
   - 新增用户消息 → 更新 `messages.js`

---

## 🌍 国际化准备

所有用户可见的文本都集中在 `messages.js`，未来可轻松实现多语言：

```javascript
// 未来可改为：
import { PLACEHOLDER_MESSAGES } from '../i18n/zh-CN.js'
// 或
import { PLACEHOLDER_MESSAGES } from '../i18n/en-US.js'
```

---

**更新时间**：2025-01-10  
**维护者**：项目团队

