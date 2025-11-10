# GPT-4o 文件上传功能说明

## 功能概述

为 GPT-4o 模型添加了完整的文件上传功能，支持图片、PDF、Word 等文件类型。

### 支持的文件类型
- **图片**: JPG, PNG, GIF, WebP（通过 Vision API）
- **文档**: PDF, DOC, DOCX, TXT（未来可扩展）

### 主要特性
1. ✅ 仅在 GPT-4o 模型下显示附件按钮
2. ✅ 多文件上传支持
3. ✅ 图片预览功能
4. ✅ 上传前可删除附件
5. ✅ 消息中显示附件
6. ✅ 文件存储在 Supabase Storage
7. ✅ GPT-4o Vision API 集成

## 架构设计

### 文件流程
```
用户选择文件
    ↓
上传到 Supabase Storage (upload-file Function)
    ↓
获取公开 URL
    ↓
添加到附件列表（前端状态）
    ↓
发送消息时传递附件 URL
    ↓
chat Function 构建 Vision 格式消息
    ↓
调用 OpenAI API
    ↓
流式返回结果
```

### 数据结构

**附件对象**:
```javascript
{
  name: "image.jpg",
  type: "image/jpeg",
  size: 123456,
  url: "https://xxx.supabase.co/storage/v1/object/public/attachments/xxx",
  preview: "blob:http://localhost:5173/xxx", // 本地预览
  storagePath: "sessionId/timestamp_filename"
}
```

**OpenAI Vision 消息格式**:
```javascript
{
  role: "user",
  content: [
    { type: "text", text: "这张图片里有什么？" },
    { type: "image_url", image_url: { url: "https://..." } }
  ]
}
```

## 文件修改清单

### 1. 新增 Edge Function
**`supabase/functions/upload-file/index.ts`**
- 处理文件上传到 Supabase Storage
- 返回公开 URL
- 支持 vision 和 openai-file 两种类型

### 2. 前端组件
**`src/components/Composer.jsx`**
- 添加文件选择按钮（仅 GPT-4o）
- 附件预览区域
- 删除附件功能

**`src/components/Message.jsx`**
- 显示消息中的附件
- 图片预览
- 文件图标显示

### 3. 状态管理
**`src/stores/chatStore.js`**
- `attachments`: 当前附件列表
- `uploadFiles()`: 上传文件
- `addAttachment()`: 添加附件
- `removeAttachment()`: 删除附件
- `clearAttachments()`: 清空附件（发送后）

### 4. 后端 Edge Function
**`supabase/functions/chat/index.ts`**
- 接收 `attachments` 参数
- 构建 OpenAI Vision 格式消息
- 仅对 OpenAI 模型应用 vision 格式

### 5. 样式
**`src/App.css`**
- `.attachments-preview`: 附件预览容器
- `.attachment-item`: 单个附件样式
- `.message-attachments`: 消息中的附件
- `.attach-btn`: 附件按钮

### 6. 数据库迁移
**`supabase/migrations/20250110_create_attachments_bucket.sql`**
- 创建 `attachments` Storage Bucket
- 设置公开读写策略

## 部署步骤

### 1. 创建 Storage Bucket

在 Supabase Dashboard 执行 SQL：

```sql
-- 方式1: Dashboard > SQL Editor
-- 执行 supabase/migrations/20250110_create_attachments_bucket.sql

-- 方式2: 或者手动创建
-- Dashboard > Storage > Create Bucket
-- Name: attachments
-- Public: Yes
```

### 2. 部署 Edge Functions

```bash
# 部署文件上传 function
supabase functions deploy upload-file

# 重新部署 chat function（已更新）
supabase functions deploy chat
```

### 3. 配置环境变量

确保已设置 OpenAI API Key：

```bash
supabase secrets set \
  OPENAI_API_KEY="sk-your-openai-key" \
  OPENAI_BASE_URL="https://api.openai.com/v1"
```

### 4. 部署前端

```bash
# 已构建完成
npm run build

# 部署 dist/ 到托管服务
```

## 使用说明

### 用户操作流程

1. **选择 GPT-4o 模型**
   - 在输入框下方的模型选择器中选择 "🤖 ChatGPT 4o"

2. **上传文件**
   - 点击 "📎 附件" 按钮
   - 选择一个或多个文件
   - 图片会显示预览，其他文件显示文件名

3. **删除附件**（可选）
   - 鼠标悬停在附件上
   - 点击右上角的 ✕ 按钮

4. **发送消息**
   - 输入问题（可选，仅图片也可发送）
   - 按 Enter 或点击"发送"按钮
   - 附件会随消息一起发送

5. **查看回复**
   - GPT-4o 会分析图片内容
   - 回复会实时流式显示

### 示例对话

**用户**: [上传一张猫的图片] "这是什么动物？"

**GPT-4o**: "这是一只猫。从图片中可以看到它有柔软的毛发，尖尖的耳朵..."

## 技术细节

### 文件上传流程

1. **前端选择文件**
   ```javascript
   const handleFileChange = (event) => {
     const files = Array.from(event.target.files || [])
     onFileSelect?.(files) // 调用 uploadFiles
   }
   ```

2. **上传到 Supabase**
   ```javascript
   const formData = new FormData()
   formData.append('file', file)
   formData.append('sessionId', activeSessionId)
   formData.append('type', 'vision')
   
   const response = await fetch(`${functionBaseUrl}/upload-file`, {
     method: 'POST',
     body: formData,
   })
   ```

3. **获取 URL 并添加到状态**
   ```javascript
   const uploadedFile = await response.json()
   addAttachment({
     name: file.name,
     type: file.type,
     url: uploadedFile.url,
     preview: URL.createObjectURL(file),
   })
   ```

### Vision API 调用

后端 Edge Function 会将附件转换为 OpenAI Vision 格式：

```typescript
const contentParts = []

// 添加文本
if (lastMessage.content) {
  contentParts.push({ type: 'text', text: lastMessage.content })
}

// 添加图片
for (const attachment of attachments) {
  if (attachment.type.startsWith('image/')) {
    contentParts.push({
      type: 'image_url',
      image_url: { url: attachment.url },
    })
  }
}

// 替换最后一条消息
historyMessages[historyMessages.length - 1] = {
  role: 'user',
  content: contentParts,
}
```

### 存储路径

文件存储在 Supabase Storage 的 `attachments` bucket：

```
attachments/
  ├── {sessionId}/
  │   ├── 1736500000000_image1.jpg
  │   ├── 1736500001000_document.pdf
  │   └── ...
  └── 1736500002000_image2.png  // 无 sessionId 时直接存根目录
```

## 限制与注意事项

### 当前限制
1. **仅 GPT-4o 支持**: DeepSeek 模型暂不支持文件上传
2. **图片优先**: 目前主要支持图片，PDF/Word 需要 Assistants API（未实现）
3. **文件大小**: 建议单个文件 < 20MB
4. **并发上传**: 按顺序上传，不支持并发

### 安全考虑
1. **公开存储**: 所有文件都是公开可访问的
2. **无认证**: 当前未实现用户认证，任何人都可上传
3. **无病毒扫描**: 未实现文件安全检查
4. **无配额限制**: 未限制单用户上传量

### 成本考虑
- **Supabase Storage**: 免费额度 1GB
- **OpenAI Vision**: 按图片大小计费
  - 低分辨率: $0.00255/张
  - 高分辨率: $0.00765/张

## 未来扩展

### 1. PDF/Word 支持
需要使用 OpenAI Assistants API：

```javascript
// 上传文件到 OpenAI
const file = await openai.files.create({
  file: fs.createReadStream('document.pdf'),
  purpose: 'assistants',
})

// 创建 Assistant
const assistant = await openai.beta.assistants.create({
  model: 'gpt-4o',
  tools: [{ type: 'file_search' }],
  tool_resources: {
    file_search: { file_ids: [file.id] },
  },
})
```

### 2. 图片编辑
- 裁剪、旋转
- 压缩优化
- 添加标注

### 3. 批量操作
- 批量上传
- 批量删除
- 打包下载

### 4. 高级功能
- 拖拽上传
- 粘贴上传
- 进度条显示
- 断点续传

## 常见问题

**Q: 为什么 DeepSeek 不能上传文件？**
A: DeepSeek API 目前不支持 Vision 或文件功能，仅 OpenAI GPT-4o 支持。

**Q: 上传的文件存在哪里？**
A: Supabase Storage 的 `attachments` bucket，公开可访问。

**Q: 文件会被删除吗？**
A: 目前不会自动删除，需要手动管理或设置生命周期策略。

**Q: 支持哪些图片格式？**
A: JPG, PNG, GIF, WebP 等常见格式，由浏览器和 OpenAI API 决定。

**Q: 可以上传视频吗？**
A: 目前不支持，OpenAI Vision API 仅支持静态图片。

**Q: 如何限制文件大小？**
A: 在前端添加验证：
```javascript
if (file.size > 20 * 1024 * 1024) {
  alert('文件大小不能超过 20MB')
  return
}
```

## 测试建议

### 功能测试
1. ✅ 上传单张图片
2. ✅ 上传多张图片
3. ✅ 删除附件
4. ✅ 仅图片无文本发送
5. ✅ 文本 + 图片发送
6. ✅ 切换模型后附件按钮隐藏
7. ✅ 消息中显示附件
8. ✅ 图片点击放大（可选）

### 边界测试
1. 大文件上传（> 20MB）
2. 特殊字符文件名
3. 网络中断时上传
4. 同时上传多个文件
5. 快速切换会话

### 性能测试
1. 10+ 张图片上传
2. 高分辨率图片（4K+）
3. 长时间会话中的附件加载

