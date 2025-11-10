# 多模型切换功能说明

## 功能概述

已将 DeepThink 按钮升级为模型选择下拉菜单，支持三种 AI 模型：

1. **💬 DeepSeek Chat** (`deepseek-chat`) - 标准对话模型
2. **🧠 DeepSeek Reasoner** (`deepseek-reasoner`) - 带思维链的推理模型
3. **🤖 ChatGPT 4o** (`gpt-4o`) - OpenAI 的 GPT-4o 模型

## 前端修改

### 1. Composer 组件
- 将按钮改为 `<select>` 下拉菜单
- 支持动态切换模型
- 带图标的选项显示

```javascript
const MODEL_OPTIONS = [
  { value: 'deepseek-chat', label: 'DeepSeek Chat', icon: '💬' },
  { value: 'deepseek-reasoner', label: 'DeepSeek Reasoner', icon: '🧠' },
  { value: 'gpt-4o', label: 'ChatGPT 4o', icon: '🤖' },
]
```

### 2. Zustand Store
- `toggleModel()` 改为 `setModel(model)`
- 支持任意模型切换

### 3. CSS 样式
- 新增 `.model-select` 样式
- 自定义下拉箭头
- 悬停和聚焦效果

## 后端修改

### Edge Function 增强

**支持多 API 路由**：
```typescript
// 根据模型前缀自动选择 API
const isOpenAI = model.startsWith('gpt-')
const apiKey = isOpenAI ? openaiApiKey : deepseekApiKey
const apiBaseUrl = isOpenAI ? openaiBaseUrl : deepseekBaseUrl
```

**环境变量**：
```bash
# DeepSeek API
DEEPSEEK_API_KEY=sk-xxx
DEEPSEEK_BASE_URL=https://api.deepseek.com

# OpenAI API
OPENAI_API_KEY=sk-xxx
OPENAI_BASE_URL=https://api.openai.com/v1

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
```

## 部署步骤

### 1. 配置环境变量

在 Supabase Dashboard > Project Settings > Edge Functions > Secrets 添加：

```bash
supabase secrets set \
  DEEPSEEK_API_KEY="sk-your-deepseek-key" \
  OPENAI_API_KEY="sk-your-openai-key" \
  OPENAI_BASE_URL="https://api.openai.com/v1"
```

或者在本地 `.env.local` 添加（前端不需要，仅供参考）：
```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
VITE_SUPABASE_FUNCTION_URL=https://xxx.supabase.co/functions/v1
```

### 2. 部署 Edge Function

```bash
# 部署更新后的 chat function
supabase functions deploy chat
```

### 3. 部署前端

```bash
# 已构建完成
npm run build

# 部署 dist/ 到你的托管服务
# Vercel: vercel --prod
# Netlify: netlify deploy --prod
# Cloudflare Pages: wrangler pages deploy dist
```

## 使用说明

### 用户操作
1. 在输入框左下角找到模型选择器
2. 点击下拉菜单选择模型
3. 发送消息时会使用当前选择的模型

### 模型特性

| 模型 | 提供商 | 思维链 | 速度 | 成本 |
|------|--------|--------|------|------|
| DeepSeek Chat | DeepSeek | ❌ | 快 | 低 |
| DeepSeek Reasoner | DeepSeek | ✅ | 中 | 中 |
| ChatGPT 4o | OpenAI | ❌ | 快 | 高 |

### 思维链显示
- **DeepSeek Reasoner**：会在回答上方显示灰色的推理过程卡片
- **其他模型**：直接显示最终回答

## OpenAI 文件上传支持

OpenAI 支持文件上传功能，可以通过以下 API：

### 文件上传 API
```javascript
// 上传文件
POST https://api.openai.com/v1/files
Headers: Authorization: Bearer $OPENAI_API_KEY
Body: multipart/form-data
  - file: <binary>
  - purpose: "assistants" | "vision" | "batch" | "fine-tune"

// 列出文件
GET https://api.openai.com/v1/files

// 获取文件信息
GET https://api.openai.com/v1/files/{file_id}

// 删除文件
DELETE https://api.openai.com/v1/files/{file_id}

// 下载文件内容
GET https://api.openai.com/v1/files/{file_id}/content
```

### 在对话中使用文件

**Vision (图片)**：
```javascript
{
  "model": "gpt-4o",
  "messages": [
    {
      "role": "user",
      "content": [
        { "type": "text", "text": "这张图片里有什么？" },
        {
          "type": "image_url",
          "image_url": {
            "url": "https://example.com/image.jpg"
            // 或使用 base64: "data:image/jpeg;base64,..."
          }
        }
      ]
    }
  ]
}
```

**Assistants (文档)**：
需要使用 Assistants API，支持 PDF、Word、代码文件等。

### 实现文件上传的后续步骤

1. **创建文件上传 Edge Function**
   - `supabase/functions/upload-file/index.ts`
   - 转发到 OpenAI Files API
   - 保存文件元数据到 Supabase Storage

2. **前端文件选择器**
   - 在 Composer 添加文件上传按钮
   - 支持图片预览
   - 显示上传进度

3. **消息格式扩展**
   - 支持 `content` 为数组格式
   - 包含 `text` 和 `image_url` 类型

## 常见问题

**Q: OpenAI API Key 从哪里获取？**
A: 访问 https://platform.openai.com/api-keys 创建

**Q: 如何只使用 DeepSeek 不用 OpenAI？**
A: 不配置 `OPENAI_API_KEY`，前端仍可选择但会报错提示未配置

**Q: 可以添加更多模型吗？**
A: 可以！在 `Composer.jsx` 的 `MODEL_OPTIONS` 添加，后端会根据前缀自动路由

**Q: 切换模型会影响历史对话吗？**
A: 不会，每条消息独立保存使用的模型信息

## 技术细节

### 模型识别逻辑
```typescript
// 后端自动识别
const isOpenAI = model.startsWith('gpt-')
const isDeepSeekReasoner = model === 'deepseek-reasoner'
```

### 流式响应兼容性
- **OpenAI**: 标准 SSE 格式，`delta.content`
- **DeepSeek Chat**: 标准 SSE 格式，`delta.content`
- **DeepSeek Reasoner**: 扩展格式，`delta.content` + `delta.reasoning_content`

### 数据库字段
- `messages.model`: 记录使用的模型
- `messages.reasoning`: 仅 Reasoner 模型有值
- `sessions.model`: 会话默认模型（可选）

