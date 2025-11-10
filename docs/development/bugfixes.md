# Bug 修复记录

本文档记录项目中遇到的 Bug 及其修复方案。

---

## 🐛 Bug #1: 只发送图片时返回 400 错误

**发现时间**：2025-01-10

### 问题描述

当用户只上传图片而不输入任何文字时，点击发送按钮后：
- 前端显示：`Failed to load resource: the server responded with a status of 400`
- 后端返回：`Missing message text`
- 预期行为：应该允许只发送图片，模型可以识别图片内容

### 问题分析

#### 前端逻辑
```javascript
// src/stores/chatStore.js
const text = (composerValue ?? '').trim()

if (!text && attachments.length === 0) return  // ✅ 前端允许只发送附件

streamController = streamChat({
  sessionId: activeSessionId,
  message: text,  // 如果只有图片，text 为空字符串 ""
  model,
  attachments: attachmentsCopy,
  // ...
})
```

#### 后端逻辑（问题所在）
```typescript
// supabase/functions/chat/index.ts
if (!message || typeof message !== 'string') {  // ❌ 空字符串会被拒绝
  return new Response(JSON.stringify({ error: 'Missing message text' }), {
    status: 400,
  })
}
```

**问题根源**：
- 前端允许 `message` 为空字符串（只要有附件）
- 后端检查 `!message` 时，空字符串 `""` 会被判断为 `false`，导致返回 400 错误

### 修复方案

#### 1. 后端验证逻辑（supabase/functions/chat/index.ts）

**Before**:
```typescript
if (!message || typeof message !== 'string') {
  return new Response(JSON.stringify({ error: 'Missing message text' }), {
    status: 400,
  })
}
```

**After**:
```typescript
if (!message && attachments.length === 0) {
  return new Response(JSON.stringify({ error: 'Missing message text or attachments' }), {
    status: 400,
  })
}
```

**改进**：只有在既没有消息文本，又没有附件时，才返回 400 错误。

---

#### 2. 会话标题生成（supabase/functions/chat/index.ts）

**Before**:
```typescript
const { data: newSession, error: sessionError } = await supabase
  .from('sessions')
  .insert({
    title: message.slice(0, 32) || '新的对话',  // ❌ message 为空时会报错
    model,
  })
```

**After**:
```typescript
// 生成会话标题：优先使用消息文本，否则使用第一个附件名
let title = '新的对话'
if (message && message.trim()) {
  title = message.slice(0, 32)
} else if (attachments.length > 0) {
  title = `图片: ${attachments[0].name.slice(0, 24)}`
}

const { data: newSession, error: sessionError } = await supabase
  .from('sessions')
  .insert({
    title,
    model,
  })
```

**改进**：
- 安全地处理空消息
- 如果只有附件，使用附件名作为会话标题

---

#### 3. 用户消息内容构建（supabase/functions/chat/index.ts）

**Before**:
```typescript
let userMessageContent = message

if (attachments.length > 0) {
  const contentParts: string[] = []
  // ... 处理附件 ...
  
  if (contentParts.length > 0) {
    userMessageContent = contentParts.join('\n\n') + '\n\n' + message
    // ❌ 如果 message 为空，会多出 '\n\n'
  }
}
```

**After**:
```typescript
let userMessageContent = message || ''

if (attachments.length > 0) {
  const contentParts: string[] = []
  // ... 处理附件 ...
  
  if (contentParts.length > 0) {
    // 如果有文本消息，附加在附件后面；否则只用附件内容
    userMessageContent = message && message.trim()
      ? contentParts.join('\n\n') + '\n\n' + message
      : contentParts.join('\n\n')
  }
}
```

**改进**：
- 安全地初始化 `userMessageContent`
- 只在有实际文本消息时才附加 `\n\n`

---

#### 4. 前端消息内容构建（src/stores/chatStore.js）

同样的问题也存在于前端，做了相同的修复：

**Before**:
```javascript
if (contentParts.length > 0) {
  userMessageContent = contentParts.join('\n\n') + '\n\n' + text
}
```

**After**:
```javascript
if (contentParts.length > 0) {
  // 如果有文本消息，附加在附件后面；否则只用附件内容
  userMessageContent = text
    ? contentParts.join('\n\n') + '\n\n' + text
    : contentParts.join('\n\n')
}
```

---

### 修复文件

1. ✅ `supabase/functions/chat/index.ts`
   - 行 87-95：修复验证逻辑
   - 行 102-118：修复会话标题生成
   - 行 128-168：修复消息内容构建

2. ✅ `src/stores/chatStore.js`
   - 行 342-368：修复前端消息内容构建

### 部署状态

- ✅ 前端：自动生效（Vite 热更新）
- ✅ 后端：已重新部署 Edge Function
  ```bash
  npx supabase functions deploy chat --no-verify-jwt
  ```

### 测试场景

**场景 1：只发送图片（无文本）**
- ✅ 前端允许点击发送
- ✅ 后端接受请求
- ✅ 会话标题为："图片: filename.png"
- ✅ 消息内容为：`![filename.png](url)`
- ✅ 模型可以识别图片内容

**场景 2：图片 + 文本**
- ✅ 前端允许点击发送
- ✅ 后端接受请求
- ✅ 会话标题为：文本内容（前 32 字符）
- ✅ 消息内容为：`![filename.png](url)\n\n用户文本`
- ✅ 模型同时处理图片和文本

**场景 3：只发送文本（无附件）**
- ✅ 正常工作（原有功能）

**场景 4：既无文本也无附件**
- ✅ 前端阻止发送（composerValue 为空且 attachments 为空）
- ✅ 后端返回 400（如果绕过前端直接请求）

---

### 经验总结

1. **空字符串处理**
   - JavaScript 中 `""` 是 falsy 值，`!"" === true`
   - 需要明确区分 "没有值" 和 "空字符串"
   - 建议用 `!value && otherCondition` 而不是单独 `!value`

2. **前后端一致性**
   - 前端允许的操作，后端也应该支持
   - 验证逻辑应该在前后端保持一致

3. **用户体验**
   - 允许只发送图片是合理的需求（尤其是 GPT-4o 支持视觉）
   - 错误提示应该明确告诉用户缺少什么

4. **边界条件测试**
   - 测试所有输入组合：
     - 只有文本
     - 只有附件
     - 文本 + 附件
     - 既无文本也无附件

---

**修复时间**：2025-01-10  
**影响范围**：GPT-4o 图片上传功能  
**测试状态**：待用户验证

