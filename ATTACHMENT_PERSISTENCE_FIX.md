# 附件持久化修复说明

## 问题描述

之前的实现中，附件在消息发送后会消失，因为：
1. `clearAttachments()` 清空了前端状态
2. 附件信息没有保存到数据库
3. 刷新页面后附件完全丢失

## 解决方案

使用 **Markdown 语法 + 数据库存储** 实现附件永久保留。

### 核心思路
1. 将附件转换为 Markdown 图片语法：`![filename](url)`
2. 保存到数据库的 `content` 字段
3. 同时保存原始附件信息到 `attachments` JSONB 字段
4. react-markdown 自动渲染图片
5. CSS 控制图片显示样式

## 技术实现

### 1. 数据库迁移

**添加 `attachments` JSONB 字段**：

```sql
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS attachments JSONB;

CREATE INDEX IF NOT EXISTS idx_messages_attachments 
ON messages USING GIN(attachments);
```

### 2. 后端 Edge Function

**构建包含 Markdown 的消息内容**：

```typescript
// 构建用户消息内容（包含附件的 Markdown）
let userMessageContent = message

if (attachments.length > 0) {
  // 在消息前添加图片 Markdown
  const attachmentMarkdown = attachments
    .map((att) => {
      if (att.type.startsWith('image/')) {
        return `![${att.name}](${att.url})`
      }
      return `[📎 ${att.name}](${att.url})`
    })
    .join('\n')
  
  userMessageContent = attachmentMarkdown + '\n\n' + message
}

// 保存到数据库
await supabase.from('messages').insert({
  session_id: targetSessionId,
  role: 'user',
  content: userMessageContent,  // 包含 Markdown
  attachments: attachments,      // 原始附件信息
})
```

### 3. 前端状态管理

**临时消息也包含 Markdown**：

```javascript
// 构建用户消息内容（包含附件的 Markdown）
let userMessageContent = text

if (attachments.length > 0) {
  const attachmentMarkdown = attachments
    .map((att) => {
      if (att.type?.startsWith('image/')) {
        return `![${att.name}](${att.url || att.preview})`
      }
      return `[📎 ${att.name}](${att.url || att.preview})`
    })
    .join('\n')
  
  userMessageContent = attachmentMarkdown + '\n\n' + text
}

// 临时消息
const userMessage = {
  id: tempUserId,
  role: 'user',
  content: userMessageContent,  // 已包含 Markdown
  created_at: now,
  temp: true,
}
```

### 4. CSS 样式优化

**用户消息中的图片缩小显示**：

```css
/* 用户消息中的图片 */
.message-user .markdown-body img {
  max-width: 200px;
  max-height: 200px;
  object-fit: contain;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.1);
  cursor: pointer;
  transition: all 0.2s ease;
}

.message-user .markdown-body img:hover {
  transform: scale(1.02);
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.15);
}

/* 多张图片横向排列 */
.message-user .markdown-body p:has(img) {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.message-user .markdown-body p:has(img) img {
  max-width: 150px;
  max-height: 150px;
}
```

## 数据流程

### 发送消息时

```
1. 用户选择图片
   ↓
2. 上传到 Supabase Storage
   ↓
3. 获取 URL，添加到 attachments 状态
   ↓
4. 用户点击发送
   ↓
5. 构建 Markdown: ![cat.jpg](https://...)
   ↓
6. 临时消息显示（包含 Markdown）
   ↓
7. 发送到后端
   ↓
8. 后端保存到数据库:
   - content: "![cat.jpg](url)\n\n这是什么？"
   - attachments: [{ name, type, url }]
   ↓
9. 刷新消息列表
   ↓
10. react-markdown 渲染图片
```

### 加载历史消息时

```
1. 从数据库读取 messages
   ↓
2. content 已包含 Markdown 图片语法
   ↓
3. react-markdown 自动渲染
   ↓
4. CSS 控制图片样式
   ↓
5. 图片永久显示
```

## 消息格式示例

### 数据库中的消息

```json
{
  "id": 123,
  "role": "user",
  "content": "![cat.jpg](https://xxx.supabase.co/storage/v1/object/public/attachments/xxx/cat.jpg)\n\n这是什么动物？",
  "attachments": [
    {
      "name": "cat.jpg",
      "type": "image/jpeg",
      "url": "https://xxx.supabase.co/storage/v1/object/public/attachments/xxx/cat.jpg",
      "size": 123456
    }
  ],
  "created_at": "2025-01-10T12:00:00Z"
}
```

### 渲染效果

```
┌────────────────────────┐
│ [图片: cat.jpg]        │ ← Markdown 渲染的图片
│                        │
│ 这是什么动物？         │ ← 用户文本
└────────────────────────┘
```

## 优势对比

| 方案 | 优势 | 劣势 |
|------|------|------|
| **之前：临时附件** | 实现简单 | ❌ 发送后消失<br>❌ 刷新丢失<br>❌ 无法回溯 |
| **现在：Markdown** | ✅ 永久保留<br>✅ 自动渲染<br>✅ 可回溯<br>✅ 支持导出 | 需要 Storage URL 永久有效 |

## 注意事项

### 1. Storage URL 有效性
- 确保 Supabase Storage 的 `attachments` bucket 是公开的
- URL 永久有效，不会过期

### 2. Markdown 兼容性
- 图片语法：`![alt](url)`
- 链接语法：`[text](url)`
- react-markdown 自动处理

### 3. 性能优化
- 图片使用 `object-fit: contain` 保持比例
- CSS `max-width` 限制尺寸
- 懒加载（可扩展）

### 4. 安全考虑
- 验证 URL 来源
- 防止 XSS 攻击（react-markdown 已处理）
- 文件大小限制

## 部署步骤

### 1. 执行数据库迁移

```bash
# 在 Supabase Dashboard > SQL Editor 执行
supabase/migrations/20250110_add_reasoning_model.sql
```

或手动执行：

```sql
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS attachments JSONB;

CREATE INDEX IF NOT EXISTS idx_messages_attachments 
ON messages USING GIN(attachments);
```

### 2. 重新部署 Edge Function

```bash
supabase functions deploy chat
```

### 3. 部署前端

```bash
npm run build
# 部署 dist/
```

## 测试验证

### 功能测试
1. ✅ 上传图片并发送
2. ✅ 消息中显示图片
3. ✅ 刷新页面，图片仍然显示
4. ✅ 多张图片横向排列
5. ✅ 图片悬停放大效果
6. ✅ 切换会话，图片正确显示

### 数据验证
```sql
-- 检查消息内容
SELECT id, role, substring(content, 1, 100), attachments 
FROM messages 
WHERE attachments IS NOT NULL 
ORDER BY created_at DESC 
LIMIT 5;
```

### 预期结果
```
id  | role | content                              | attachments
----|------|--------------------------------------|-------------
123 | user | ![cat.jpg](https://...)这是什么？    | [{"name":"cat.jpg",...}]
```

## 常见问题

**Q: 图片不显示？**
A: 检查：
1. Storage bucket 是否公开
2. URL 是否有效
3. 浏览器控制台是否有 CORS 错误

**Q: 图片太大？**
A: CSS 已限制：
- 用户消息：150-200px
- AI 消息：100% 宽度

**Q: 多张图片排列混乱？**
A: 检查 CSS：
```css
.message-user .markdown-body p:has(img) {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
```

**Q: 旧消息没有图片？**
A: 正常，因为旧消息没有 Markdown 格式。只有新发送的消息才会包含。

## 未来扩展

### 1. 图片点击放大
```jsx
<img 
  onClick={() => window.open(src, '_blank')}
  style={{ cursor: 'pointer' }}
/>
```

### 2. 图片懒加载
```jsx
<img loading="lazy" />
```

### 3. 图片压缩
- 上传时自动压缩
- 生成缩略图
- CDN 加速

### 4. 附件管理
- 批量删除
- 存储空间统计
- 过期清理

## 总结

通过 **Markdown + 数据库** 的方案，成功实现了附件的永久保留和自动渲染，解决了之前"发送后消失"的问题。

**核心优势**：
- 📦 数据持久化
- 🎨 自动渲染
- 🔄 可回溯
- 📱 响应式
- ⚡ 性能优化

