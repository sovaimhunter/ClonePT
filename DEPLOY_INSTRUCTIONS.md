# DeepThink 流式输出部署说明

## 修复内容

根据 DeepSeek Reasoner 官方文档，已完整实现流式输出和思维链展示功能。

### 前端修改
1. **chatStream.js**: 正确解析 `reasoning_content` 和 `content` 字段（支持字符串和数组格式）
2. **chatStore.js**: 移除了阻止流式更新的提前返回逻辑
3. **Message.jsx**: 在 Reasoner 模式下展示思维链卡片

### 后端修改
1. **chat/index.ts**: 
   - 提取并累积 `reasoning_content`
   - 转发完整的 DeepSeek API 响应给前端
   - 将 `reasoning` 和 `model` 保存到数据库

### 数据库迁移
需要执行 SQL 迁移添加新字段：
```sql
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS reasoning TEXT,
ADD COLUMN IF NOT EXISTS model TEXT;

ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS model TEXT DEFAULT 'deepseek-chat';
```

## 部署步骤

### 1. 数据库迁移
在 Supabase Dashboard 执行 SQL：
```bash
# 方式1: 在 Supabase Dashboard > SQL Editor 中执行
supabase/migrations/20250110_add_reasoning_model.sql

# 方式2: 使用 CLI（如果已配置）
supabase db push
```

### 2. 部署 Edge Function
```bash
# 部署 chat function
supabase functions deploy chat

# 或者如果使用 Supabase CLI
cd supabase/functions/chat
supabase functions deploy chat
```

### 3. 部署前端
```bash
# 已构建完成，部署 dist 目录到你的托管服务
npm run build
# 然后上传 dist/ 到 Vercel/Netlify/Cloudflare Pages 等
```

## 验证

部署后测试：

1. **普通模式** (`deepseek-chat`):
   - 关闭 DeepThink 开关
   - 发送消息
   - 应该看到逐字流式输出

2. **DeepThink 模式** (`deepseek-reasoner`):
   - 开启 DeepThink 开关
   - 发送消息
   - 应该看到：
     - 上方：思维链实时流式展示（灰色卡片）
     - 下方：最终回答实时流式展示

## 技术细节

### DeepSeek API 流式格式
```json
// 每个 delta 可能包含
{
  "choices": [{
    "delta": {
      "content": "文本片段",           // 最终回答
      "reasoning_content": "推理片段"  // 思维链（仅 reasoner）
    }
  }]
}
```

### 前端状态管理
- 临时消息在发送时创建，包含空的 `content` 和 `reasoning`
- `onDelta` 实时追加内容到临时消息
- `onComplete` 后从数据库重新加载，确保持久化

### 数据库字段
- `messages.reasoning`: 存储完整思维链（TEXT，可为空）
- `messages.model`: 记录使用的模型（TEXT，可为空）
- `sessions.model`: 会话默认模型（TEXT，默认 'deepseek-chat'）

## 常见问题

**Q: 仍然只显示"生成中..."？**
A: 检查浏览器控制台，确认：
1. Edge Function 已重新部署
2. 数据库字段已添加
3. 前端已刷新（Ctrl+Shift+R 强制刷新）

**Q: 思维链不显示？**
A: 确认：
1. 已开启 DeepThink 开关
2. Edge Function 正确转发 `reasoning_content`
3. 数据库 `messages` 表有 `reasoning` 字段

**Q: 流式中断？**
A: 检查：
1. DEEPSEEK_API_KEY 是否有效
2. 网络连接是否稳定
3. Edge Function 日志（Supabase Dashboard > Functions > Logs）

