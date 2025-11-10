import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import ImageLightbox from './ImageLightbox.jsx'

function Message({
  role = 'assistant',
  name,
  time,
  content,
  tokenInfo,
  isStreaming,
  onCopy,
  reasoning,
  attachments = [],
}) {
  const isUser = role === 'user'
  const safeContent = content ?? ''
  const canCopy = Boolean(safeContent) && !isStreaming
  const reasoningText = (reasoning ?? '').trim()
  const [lightboxImage, setLightboxImage] = useState(null)

  const handleCopy = () => {
    if (!canCopy) return
    onCopy?.(safeContent)
  }

  const handleImageClick = (img) => {
    setLightboxImage(img)
  }

  const handleCloseLightbox = () => {
    setLightboxImage(null)
  }

  // 从 content 中提取图片 Markdown 和文本
  const extractImagesAndText = (markdown) => {
    if (!markdown) return { images: [], text: '' }
    
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g
    const images = []
    let match
    
    while ((match = imageRegex.exec(markdown)) !== null) {
      images.push({
        alt: match[1],
        url: match[2],
      })
    }
    
    // 移除图片 Markdown，保留文本
    const text = markdown.replace(/!\[([^\]]*)\]\(([^)]+)\)\n*/g, '').trim()
    
    return { images, text }
  }

  const { images, text } = isUser ? extractImagesAndText(safeContent) : { images: [], text: safeContent }

  return (
    <article
      className={`message ${isUser ? 'message-user' : 'message-assistant'}`}
      aria-live={isStreaming ? 'polite' : undefined}
    >
      <div className="message-avatar">{isUser ? '我' : 'AI'}</div>
      <div className="message-wrapper">
        {isUser && images.length > 0 && (
          <div className="message-images-above">
            {images.map((img, index) => (
              <img
                key={index}
                src={img.url}
                alt={img.alt}
                className="message-image-thumbnail"
                onClick={() => handleImageClick(img)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleImageClick(img)
                  }
                }}
              />
            ))}
          </div>
        )}
        <div className="message-content">
          <div className="message-meta">
            <span className="message-author">{name}</span>
            <span className="message-time">{time}</span>
          </div>
          {!isUser && reasoningText && (
            <div className="message-reasoning">
              <div className="reasoning-label">DeepThink</div>
              <div className="reasoning-body">
                {reasoningText.split(/\n+/).map((line, index) => (
                  <p key={index}>{line}</p>
                ))}
              </div>
            </div>
          )}
          <div className={`message-body ${isStreaming ? 'message-streaming' : ''}`}>
          <div className="markdown-body">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
            >
              {text}
            </ReactMarkdown>
          </div>
        </div>
        <div className="message-footer">
          {tokenInfo && <span className="message-token">{tokenInfo}</span>}
          {isStreaming && <span className="message-token">生成中…</span>}
        </div>
        </div>
        {canCopy && (
          <button
            type="button"
            className="message-copy-trigger"
            onClick={handleCopy}
            title="复制消息内容"
            data-align={isUser ? 'right' : 'left'}
          />
        )}
      </div>
      {lightboxImage && (
        <ImageLightbox
          src={lightboxImage.url}
          alt={lightboxImage.alt}
          onClose={handleCloseLightbox}
        />
      )}
    </article>
  )
}

export default Message

