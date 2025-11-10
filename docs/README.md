# 项目文档

## 📚 功能文档 (Features)

- [模型对比说明](features/model-comparison.md) - 三个模型的特点和使用场景 ⭐ 推荐
- [文件上传功能](features/file-upload.md) - 图片、PDF、TXT 文件上传支持
- [模型切换功能](features/model-switch.md) - DeepSeek Chat/Reasoner、GPT-4o Mini 切换
- [图片灯箱功能](features/image-lightbox.md) - 图片点击放大预览
- [PDF 支持](features/pdf-support.md) - PDF 文本提取和处理
- [文本文件支持](features/text-file-support.md) - TXT、Markdown 等文本文件支持

## 🚀 开发文档 (Development)

- [部署指南](development/deployment.md) - Supabase 部署说明
- [常量使用指南](development/constants-usage.md) - 项目常量组织和使用方法
- [ChatStore 重构 v1](development/chatstore-refactoring.md) - 辅助函数提取
- [ChatStore 重构 v2](development/chatstore-refactoring-v2.md) - Actions 完全模块化 ⭐⭐
- [CSS 样式重构](development/css-refactoring.md) - CSS 模块化拆分 ⭐⭐
- [Bug 修复记录](development/bugfixes.md) - 问题排查和修复方案

## 📁 项目结构

```
Tot/
├─ docs/                    # 📚 项目文档
│  ├─ features/            # 功能说明
│  └─ development/         # 开发指南
│
├─ src/                    # 源代码
│  ├─ components/          # React 组件
│  ├─ constants/           # 常量和配置
│  ├─ services/            # API 服务
│  ├─ stores/              # Zustand 状态管理 ⭐
│  ├─ styles/              # CSS 样式 ⭐⭐
│  └─ utils/               # 工具函数
│
├─ supabase/               # Supabase 配置
│  ├─ functions/           # Edge Functions
│  └─ migrations/          # 数据库迁移
│
└─ README.md               # 项目主文档
```

## 🔗 快速链接

- [主 README](../README.md) - 项目概览和快速开始
- [Package.json](../package.json) - 项目依赖

## 💡 贡献指南

如果你发现文档有误或想要补充内容，请：
1. Fork 本项目
2. 创建新分支
3. 提交 Pull Request

---

最后更新：2025-01-10

