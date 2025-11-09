import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'

function Message({
  role = 'assistant',
  name,
  time,
  content,
  tokenInfo,
  isStreaming,
  onCopy,
  reasoning,
}) {
  const isUser = role === 'user'
  const safeContent = content ?? ''
  const canCopy = Boolean(safeContent) && !isStreaming
  const reasoningText = (reasoning ?? '').trim()

  const handleCopy = () => {
    if (!canCopy) return
    onCopy?.(safeContent)
  }

  return (
    <article
      className={`message ${isUser ? 'message-user' : 'message-assistant'}`}
      aria-live={isStreaming ? 'polite' : undefined}
    >
      <div className="message-avatar">{isUser ? '我' : 'AI'}</div>
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
              {safeContent}
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
    </article>
  )
}

export default Message

