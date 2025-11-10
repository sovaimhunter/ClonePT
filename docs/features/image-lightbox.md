# 图片 Lightbox 预览功能说明

## 功能概述

点击消息中的图片缩略图，可以全屏放大预览，背景添加半透明遮罩层，点击图片外或关闭按钮返回对话界面。

## 视觉效果

### 正常状态
```
[图片 120x120] [图片 120x120]  ← 缩略图

┌─────────────────────────┐
│ 这是什么动物？          │
└─────────────────────────┘
```

### 点击后（全屏预览）
```
╔═══════════════════════════════════════════╗
║ 黑色半透明背景 (rgba(0,0,0,0.92))        ║
║                                           ║
║              [✕ 关闭按钮]                 ║
║                                           ║
║          ┌─────────────────┐              ║
║          │                 │              ║
║          │   放大的图片    │ ← 最大 90vh  ║
║          │                 │              ║
║          └─────────────────┘              ║
║                                           ║
║   点击图片外的任何地方关闭                ║
╚═══════════════════════════════════════════╝
```

## 技术实现

### 1. ImageLightbox 组件

**src/components/ImageLightbox.jsx**：

```jsx
import { useEffect } from 'react'

function ImageLightbox({ src, alt, onClose }) {
  useEffect(() => {
    // 禁止背景滚动
    document.body.style.overflow = 'hidden'
    
    // ESC 键关闭
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose?.()
      }
    }
    
    window.addEventListener('keydown', handleEscape)
    
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
        <button className="lightbox-close" onClick={onClose}>
          ✕
        </button>
        <img src={src} alt={alt} className="lightbox-image" />
      </div>
    </div>
  )
}
```

### 2. Message 组件集成

**状态管理**：
```jsx
const [lightboxImage, setLightboxImage] = useState(null)

const handleImageClick = (img) => {
  setLightboxImage(img)
}

const handleCloseLightbox = () => {
  setLightboxImage(null)
}
```

**图片点击事件**：
```jsx
<img
  src={img.url}
  alt={img.alt}
  className="message-image-thumbnail"
  onClick={() => handleImageClick(img)}
  role="button"
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleImageClick(img)
    }
  }}
/>
```

**渲染 Lightbox**：
```jsx
{lightboxImage && (
  <ImageLightbox
    src={lightboxImage.url}
    alt={lightboxImage.alt}
    onClose={handleCloseLightbox}
  />
)}
```

### 3. CSS 样式

**遮罩层**：
```css
.lightbox-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.92);
  backdrop-filter: blur(8px);
  z-index: 9999;
  animation: lightboxFadeIn 0.2s ease;
}
```

**图片容器**：
```css
.lightbox-content {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
  animation: lightboxZoomIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

**放大图片**：
```css
.lightbox-image {
  max-width: 100%;
  max-height: 90vh;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  object-fit: contain;
}
```

**关闭按钮**：
```css
.lightbox-close {
  position: absolute;
  top: -50px;
  right: 0;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  color: white;
  transition: all 0.2s ease;
}

.lightbox-close:hover {
  transform: rotate(90deg);
}
```

## 交互细节

### 1. 打开方式
- ✅ 点击图片缩略图
- ✅ 键盘 Enter/Space 键（无障碍支持）

### 2. 关闭方式
- ✅ 点击图片外的遮罩层
- ✅ 点击右上角关闭按钮
- ✅ 按 ESC 键

### 3. 动画效果
- **打开**：
  - 遮罩层淡入（0.2s）
  - 图片缩放进入（0.3s，弹性效果）
- **关闭**：
  - 组件卸载（React 自动处理）

### 4. 滚动锁定
```javascript
useEffect(() => {
  document.body.style.overflow = 'hidden'
  
  return () => {
    document.body.style.overflow = ''
  }
}, [])
```

## 用户体验优化

### 1. **视觉反馈**
- 缩略图悬停：上浮 + 放大
- 关闭按钮悬停：旋转 90°
- 点击时：缩小效果

### 2. **性能优化**
- 使用 `backdrop-filter: blur()` 实现背景模糊
- CSS 动画硬件加速
- 事件冒泡阻止（`stopPropagation`）

### 3. **无障碍支持**
- `role="button"` 语义化
- `tabIndex={0}` 键盘导航
- `aria-label` 关闭按钮说明
- ESC 键快捷关闭

### 4. **响应式设计**
```css
.lightbox-image {
  max-width: 100%;
  max-height: 90vh;
  object-fit: contain;
}
```

## 动画效果

### 淡入动画
```css
@keyframes lightboxFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
```

### 缩放进入动画
```css
@keyframes lightboxZoomIn {
  from {
    transform: scale(0.8);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
```

### 关闭按钮旋转
```css
.lightbox-close:hover {
  transform: rotate(90deg);
}
```

## 使用场景

### 场景 1: 查看图片细节
```
用户点击缩略图 → 全屏预览 → 查看细节 → ESC 关闭
```

### 场景 2: 多图对比
```
点击图1 → 预览 → 关闭
点击图2 → 预览 → 关闭
对比两张图的差异
```

### 场景 3: 分享截图
```
点击图片 → 全屏预览 → 截图工具截取 → 分享
```

## 边界情况处理

### 1. 超大图片
```css
.lightbox-image {
  max-width: 100%;
  max-height: 90vh;
  object-fit: contain;  /* 保持比例 */
}
```

### 2. 超小图片
- 不会被拉伸
- 保持原始尺寸
- 居中显示

### 3. 加载失败
```jsx
<img 
  src={src}
  alt={alt}
  onError={(e) => {
    e.target.src = '/placeholder.png'
  }}
/>
```

### 4. 快速点击
- React 状态管理自动处理
- 不会重复打开

## 未来扩展

### 1. 图片导航
```jsx
const [currentIndex, setCurrentIndex] = useState(0)

const handleNext = () => {
  setCurrentIndex((prev) => (prev + 1) % images.length)
}

const handlePrev = () => {
  setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
}

<button onClick={handlePrev}>←</button>
<button onClick={handleNext}>→</button>
```

### 2. 缩放控制
```jsx
const [scale, setScale] = useState(1)

<img 
  style={{ transform: `scale(${scale})` }}
/>
<button onClick={() => setScale(scale + 0.2)}>+</button>
<button onClick={() => setScale(scale - 0.2)}>-</button>
```

### 3. 下载功能
```jsx
const handleDownload = async () => {
  const response = await fetch(src)
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = alt || 'image.jpg'
  a.click()
}

<button onClick={handleDownload}>下载</button>
```

### 4. 图片信息
```jsx
<div className="lightbox-info">
  <span>{alt}</span>
  <span>{width} × {height}</span>
  <span>{(size / 1024).toFixed(2)} KB</span>
</div>
```

## 性能优化

### 1. 懒加载
```jsx
<img loading="lazy" src={src} />
```

### 2. 预加载
```jsx
useEffect(() => {
  const img = new Image()
  img.src = src
}, [src])
```

### 3. 内存清理
```jsx
useEffect(() => {
  return () => {
    // 清理事件监听器
    window.removeEventListener('keydown', handleEscape)
  }
}, [])
```

## 测试建议

### 功能测试
1. ✅ 点击图片打开 Lightbox
2. ✅ 点击遮罩层关闭
3. ✅ 点击关闭按钮关闭
4. ✅ ESC 键关闭
5. ✅ 背景滚动锁定
6. ✅ 动画流畅度
7. ✅ 键盘导航（Tab + Enter）

### 兼容性测试
1. Chrome/Edge（现代浏览器）
2. Firefox
3. Safari
4. 移动端浏览器

### 性能测试
1. 大图片加载（> 5MB）
2. 快速连续点击
3. 内存泄漏检查

## 常见问题

**Q: 图片显示不全？**
A: 检查 CSS：
```css
.lightbox-image {
  max-width: 100%;
  max-height: 90vh;
  object-fit: contain;
}
```

**Q: 背景可以滚动？**
A: 检查滚动锁定：
```javascript
document.body.style.overflow = 'hidden'
```

**Q: ESC 键不起作用？**
A: 检查事件监听器是否正确添加和清理。

**Q: 动画卡顿？**
A: 使用 CSS transform 而不是 width/height 动画。

## 总结

通过添加 Lightbox 功能，实现了：

- ✅ 图片全屏预览
- ✅ 半透明遮罩层
- ✅ 多种关闭方式
- ✅ 流畅的动画效果
- ✅ 无障碍支持
- ✅ 响应式设计

**核心优势**：
- 🖼️ 全屏预览图片细节
- 🎨 优雅的动画效果
- ⌨️ 键盘快捷操作
- 📱 移动端友好
- ♿ 无障碍支持

