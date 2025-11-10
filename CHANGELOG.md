# 更新日志 (Changelog)

所有重要更改都会记录在这个文件中。

---

## [1.1.0] - 2025-01-10

### ✨ 新增功能

#### 模型切换：GPT-4o → GPT-4o Mini
- **原因**：GPT-4o 仅支持 OCR（文字识别），而 GPT-4o Mini 支持真正的图片内容识别
- **改进**：
  - ✅ 可以识别图片场景、对象、颜色
  - ✅ 可以理解图表数据
  - ✅ 可以分析代码截图
  - ✅ 成本更低，速度更快

#### 只发送图片功能
- 允许用户不输入文字，只上传图片进行提问
- 会话标题自动使用图片名称
- 修复了后端 400 错误

#### 常量管理系统
- 新增 `src/constants/` 目录
- 集中管理所有配置和消息文本
- 提取 50+ 个常量和 7 个工具函数
- 为国际化做好准备

### 🐛 Bug 修复

#### Bug #1: 只发送图片时返回 400 错误
- **问题**：后端拒绝空消息，即使有附件
- **修复**：允许消息为空，只要有附件即可
- **影响文件**：
  - `supabase/functions/chat/index.ts`
  - `src/stores/chatStore.js`

### 🔧 优化

#### 代码结构优化
1. **文档整理**
   - 移动 6 个功能文档到 `docs/features/`
   - 移动部署文档到 `docs/development/`
   - 删除 4 个临时文档
   - 创建文档索引

2. **删除未使用文件**
   - 删除 `attachmentApi.js` (49 行)
   - 删除 `deepseekFileApi.js` (37 行)

3. **创建常量文件**
   - `models.js` - 模型配置
   - `fileTypes.js` - 文件类型验证
   - `messages.js` - 界面消息
   - 重构 3 个核心文件使用新常量

#### 统计数据
- **删除代码**：86 行（冗余文件）
- **新增代码**：231 行（常量文件）
- **提取常量**：50+ 个
- **提取函数**：7 个
- **消除硬编码**：30+ 处

### 📚 文档更新

#### 新增文档
- `docs/features/model-comparison.md` - 模型对比说明 ⭐
- `docs/development/constants-usage.md` - 常量使用指南
- `docs/development/bugfixes.md` - Bug 修复记录
- `PROJECT_STRUCTURE.md` - 完整项目结构
- `CLEANUP_SUMMARY.md` - 代码优化总结
- `CHANGELOG.md` - 本文件

#### 更新文档
- `docs/README.md` - 更新文档索引
- 所有提及 "GPT-4o" 的地方改为 "GPT-4o Mini"

---

## [1.0.0] - 2025-01-09

### ✨ 初始版本

#### 核心功能
- ✅ 三个 AI 模型切换（DeepSeek Chat、DeepSeek Reasoner、GPT-4o）
- ✅ 实时流式响应（SSE）
- ✅ 会话管理（创建、删除、切换）
- ✅ 消息历史记录
- ✅ Markdown 渲染和代码高亮
- ✅ 图片上传和预览
- ✅ PDF 文本提取（客户端）
- ✅ 文本文件上传（TXT, MD, CSV, etc.）
- ✅ 图片灯箱（点击放大）
- ✅ 消息复制功能
- ✅ 停止生成按钮
- ✅ DeepThink 思维链显示

#### 技术栈
- **前端**：React.js + Zustand + Vite + Tailwind CSS
- **后端**：Supabase (PostgreSQL + Edge Functions)
- **AI**：DeepSeek API + OpenAI API
- **文件处理**：PDF.js (客户端提取)

#### 数据库设计
- `sessions` 表：会话信息
- `messages` 表：消息记录（支持附件）
- `attachments` 存储桶：图片文件

#### Edge Functions
- `chat` - 统一模型调用和流式传输
- `upload-file` - 文件上传到 Supabase Storage

---

## 版本说明

版本号格式：`[主版本].[次版本].[修订号]`

- **主版本**：重大功能更新或架构变更
- **次版本**：新增功能或较大改进
- **修订号**：Bug 修复和小优化

---

## 未来计划

### 🎯 近期计划（v1.2.0）
- [ ] CSS 模块化拆分
- [ ] 深色模式支持
- [ ] 消息编辑功能
- [ ] 导出对话为 Markdown
- [ ] 语音输入支持

### 🚀 长期计划（v2.0.0）
- [ ] 多用户系统
- [ ] 团队协作功能
- [ ] 插件系统
- [ ] 自定义模型接入
- [ ] 国际化（i18n）

---

**维护者**：项目团队  
**许可证**：MIT  
**仓库**：[待添加]

