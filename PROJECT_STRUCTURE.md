# 项目结构说明

本文档描述项目的目录结构和文件组织方式。

## 📁 完整目录结构

```
Tot/
├─ 📚 docs/                          # 项目文档
│  ├─ features/                      # 功能文档
│  │  ├─ file-upload.md             # 文件上传功能
│  │  ├─ image-lightbox.md          # 图片灯箱功能
│  │  ├─ model-switch.md            # 模型切换功能
│  │  ├─ pdf-support.md             # PDF 支持
│  │  └─ text-file-support.md       # 文本文件支持
│  ├─ development/                   # 开发文档
│  │  ├─ deployment.md              # 部署指南
│  │  └─ constants-usage.md         # 常量使用指南
│  └─ README.md                      # 文档索引
│
├─ 🎨 src/                           # 源代码
│  ├─ components/                    # React 组件
│  │  ├─ ChatHeader.jsx             # 聊天头部（会话标题、模型信息）
│  │  ├─ Composer.jsx               # 输入框（文本输入、文件上传、模型选择）
│  │  ├─ ImageLightbox.jsx          # 图片灯箱（图片放大预览）
│  │  ├─ Message.jsx                # 消息组件（用户/AI 消息、Markdown 渲染）
│  │  └─ Sidebar.jsx                # 侧边栏（会话列表、用户信息）
│  │
│  ├─ constants/                     # 常量和配置 ✨ 新增
│  │  ├─ models.js                  # 模型配置（MODEL_OPTIONS, DEFAULT_MODEL）
│  │  ├─ fileTypes.js               # 文件类型（限制、验证函数）
│  │  ├─ messages.js                # 界面消息（错误、提示、占位符）
│  │  └─ index.js                   # 统一导出
│  │
│  ├─ services/                      # API 服务
│  │  ├─ chatApi.js                 # 会话和消息 CRUD
│  │  ├─ chatStream.js              # SSE 流式响应处理
│  │  └─ supabaseClient.js          # Supabase 客户端初始化
│  │
│  ├─ stores/                        # Zustand 状态管理
│  │  └─ chatStore.js               # 全局聊天状态（会话、消息、附件）
│  │
│  ├─ utils/                         # 工具函数
│  │  └─ pdfExtractor.js            # PDF 文本提取（使用 PDF.js）
│  │
│  ├─ assets/                        # 静态资源
│  │  └─ react.svg
│  │
│  ├─ App.jsx                        # 主应用组件
│  ├─ App.css                        # 全局样式
│  ├─ main.jsx                       # 应用入口
│  └─ index.css                      # 基础样式
│
├─ ⚙️ supabase/                      # Supabase 配置
│  ├─ functions/                     # Edge Functions
│  │  ├─ chat/                      # 聊天 API（统一模型调用、流式传输）
│  │  │  └─ index.ts
│  │  ├─ upload-file/               # 文件上传（Supabase Storage）
│  │  │  └─ index.ts
│  │  └─ upload-openai-file/        # OpenAI 文件上传（已废弃）
│  │     └─ index.ts
│  │
│  └─ migrations/                    # 数据库迁移
│     ├─ 20250110_add_reasoning_model.sql
│     └─ 20250110_create_attachments_bucket.sql
│
├─ 📄 配置文件
│  ├─ .env.local                     # 本地环境变量（Supabase、DeepSeek、OpenAI）
│  ├─ package.json                   # 项目依赖
│  ├─ vite.config.js                 # Vite 配置
│  ├─ eslint.config.js               # ESLint 配置
│  └─ .gitignore
│
└─ 📖 文档
   ├─ README.md                      # 项目主文档
   ├─ CLEANUP_SUMMARY.md             # 代码优化总结
   └─ PROJECT_STRUCTURE.md           # 本文件
```

---

## 📂 目录说明

### `docs/` - 项目文档

所有项目文档统一存放，分为两类：

- **`features/`** - 功能说明文档，介绍各个功能的实现细节
- **`development/`** - 开发文档，包括部署指南、常量使用等

### `src/components/` - React 组件

5 个核心 UI 组件：

| 组件 | 职责 | 主要功能 |
|------|------|----------|
| `Sidebar.jsx` | 侧边栏 | 会话列表、新建会话、删除会话 |
| `ChatHeader.jsx` | 顶部栏 | 显示会话标题、模型信息 |
| `Message.jsx` | 消息 | Markdown 渲染、代码高亮、图片/文件显示 |
| `Composer.jsx` | 输入区 | 文本输入、模型选择、文件上传 |
| `ImageLightbox.jsx` | 灯箱 | 图片放大预览 |

### `src/constants/` - 常量和配置 ✨

**新增的目录**，集中管理项目中所有的配置和常量：

| 文件 | 内容 | 行数 |
|------|------|------|
| `models.js` | 模型配置（3 个模型选项） | 28 |
| `fileTypes.js` | 文件类型、限制、验证函数 | 99 |
| `messages.js` | 50+ 条界面消息、格式化函数 | 97 |
| `index.js` | 统一导出 | 7 |

**优势**：
- ✅ 避免硬编码字符串和魔术数字
- ✅ 统一管理错误消息，易于维护
- ✅ 为国际化做好准备
- ✅ 可复用的验证和格式化函数

### `src/services/` - API 服务

3 个服务文件，与后端交互：

| 文件 | 职责 |
|------|------|
| `supabaseClient.js` | 初始化 Supabase 客户端 |
| `chatApi.js` | 会话和消息的 CRUD 操作 |
| `chatStream.js` | SSE 流式响应处理（实时接收 AI 回复） |

### `src/stores/` - 状态管理

使用 Zustand 管理全局状态：

- **`chatStore.js`** (502 行)
  - 会话列表、当前会话
  - 消息列表、流式消息
  - 附件管理（图片、PDF、TXT）
  - 模型切换
  - 所有业务逻辑

### `src/utils/` - 工具函数

- **`pdfExtractor.js`** - PDF 文本提取（使用 `pdfjs-dist`）

### `supabase/functions/` - Edge Functions

3 个无服务器函数：

| 函数 | 状态 | 职责 |
|------|------|------|
| `chat/` | ✅ 在用 | 统一处理 DeepSeek/OpenAI API 调用、SSE 流式传输 |
| `upload-file/` | ✅ 在用 | 上传图片到 Supabase Storage |
| `upload-openai-file/` | ⚠️ 已废弃 | 原本用于 OpenAI Files API（已改为前端提取） |

---

## 🔄 代码优化历程

### ✅ 已完成的优化

1. **第一步：文档清理**
   - 移动 6 个功能文档到 `docs/features/`
   - 移动 1 个部署文档到 `docs/development/`
   - 删除 4 个临时文档
   - 创建 `docs/README.md` 索引

2. **第二步：删除未使用文件**
   - 删除 `src/services/attachmentApi.js` (49 行)
   - 删除 `src/services/deepseekFileApi.js` (37 行)

3. **第三步：创建常量文件**
   - 新建 `src/constants/` 目录（4 个文件，231 行）
   - 重构 3 个文件使用新常量
   - 提取 50+ 个常量，7 个工具函数
   - 消除 30+ 处硬编码字符串

### 📝 建议的后续优化

4. **第四步：拆分 CSS**（可选）
   - 当前 `App.css` 有 1016 行
   - 可拆分为：`variables.css`, `sidebar.css`, `chat.css`, `message.css`

5. **第五步：添加类型检查**（可选）
   - 使用 JSDoc 注释添加类型提示
   - 或迁移到 TypeScript

---

## 📊 项目统计

| 指标 | 数值 |
|------|------|
| 总文件数 | 30+ |
| React 组件 | 5 个 |
| 常量文件 | 4 个 |
| API 服务 | 3 个 |
| Edge Functions | 3 个（1 个已废弃） |
| 总代码行数 | ~3000+ |
| 优化后减少 | 86 行（删除冗余文件） |
| 优化后增加 | 231 行（新增常量） |

---

## 🎯 核心设计原则

1. **关注点分离**
   - UI 组件专注渲染
   - 状态管理集中在 `chatStore`
   - API 调用封装在 `services`
   - 配置统一在 `constants`

2. **可维护性**
   - 常量集中管理
   - 文档完善
   - 代码结构清晰

3. **可扩展性**
   - 模型配置易于添加
   - 文件类型支持易于扩展
   - 消息文本为国际化做好准备

4. **性能优化**
   - 使用 `useMemo` 缓存计算结果
   - 使用 `useCallback` 缓存回调函数
   - SSE 流式传输实时显示

---

**最后更新**：2025-01-10  
**维护者**：项目团队  
**版本**：1.0

