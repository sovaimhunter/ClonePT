import { useState, memo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import ImageLightbox from './ImageLightbox.jsx'

const Message = memo(function Message({
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

  // 从 content 中提取图片、文件和文本
  const extractAttachmentsAndText = (markdown) => {
    if (!markdown) return { images: [], files: [], text: '' }
    
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g
    const fileRegex = /\*\*文件: ([^\*]+)\*\*\n```\n([\s\S]*?)\n```/g
    const images = []
    const files = []
    let match
    
    // 提取图片
    while ((match = imageRegex.exec(markdown)) !== null) {
      images.push({
        alt: match[1],
        url: match[2],
      })
    }
    
    // 提取文件（PDF、TXT 等）
    while ((match = fileRegex.exec(markdown)) !== null) {
      files.push({
        name: match[1],
        content: match[2],
      })
    }
    
    // 移除图片和文件 Markdown，保留用户输入的文本
    let text = markdown
      .replace(/!\[([^\]]*)\]\(([^)]+)\)\n*/g, '')
      .replace(/\*\*文件: ([^\*]+)\*\*\n```\n[\s\S]*?\n```\n*/g, '')
      .trim()
    
    return { images, files, text }
  }

  const { images, files, text } = isUser ? extractAttachmentsAndText(safeContent) : { images: [], files: [], text: safeContent }

  return (
    <article
      className={`message ${isUser ? 'message-user' : 'message-assistant'}`}
      aria-live={isStreaming ? 'polite' : undefined}
    >
      <div className="message-avatar">{isUser ? '我' : 'AI'}</div>
      <div className="message-wrapper">
        {isUser && (images.length > 0 || files.length > 0) && (
          <div className="message-attachments-above">
            {images.map((img, index) => (
              <img
                key={`img-${index}`}
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
            {files.map((file, index) => (
              <div key={`file-${index}`} className="message-file-thumbnail" title={file.name}>
                <div className="file-icon">
                  {file.name.toLowerCase().endsWith('.pdf') ? '📄' : '📝'}
                </div>
                <div className="file-name">{file.name}</div>
              </div>
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
})

export default Message

