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
}) {
  const isUser = role === 'user'
  const safeContent = content ?? ''

  return (
    <article className={`message ${isUser ? 'message-user' : 'message-assistant'}`}>
      <div className="message-avatar">{isUser ? '我' : 'AI'}</div>
      <div className="message-content">
        <div className="message-meta">
          <span className="message-author">{name}</span>
          <span className="message-time">{time}</span>
        </div>
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
          {!isUser && <button className="ghost-btn">复制</button>}
          {tokenInfo && <span className="message-token">{tokenInfo}</span>}
          {isStreaming && <span className="message-token">生成中…</span>}
        </div>
      </div>
    </article>
  )
}

export default Message

