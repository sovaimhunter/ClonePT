function formatUpdatedAt(value) {
  if (!value) return '刚刚'
  try {
    const date = new Date(value)
    const now = Date.now()
    const diff = now - date.getTime()

    const minute = 60 * 1000
    const hour = 60 * minute
    const day = 24 * hour

    if (diff < minute) return '刚刚'
    if (diff < hour) return `${Math.floor(diff / minute)} 分钟前`
    if (diff < day) return `${Math.floor(diff / hour)} 小时前`
    return new Intl.DateTimeFormat('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  } catch (_error) {
    return value
  }
}

function Sidebar({
  sessions = [],
  activeSessionId,
  onSelectSession,
  onCreateSession,
}) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="brand-mark">🤖</span>
        <div>
          <div className="brand-title">DeepChat 控制台</div>
          <div className="brand-subtitle">连接 DeepSeek，更快更稳</div>
        </div>
      </div>

      <button
        className="new-chat-btn"
        type="button"
        onClick={() => onCreateSession?.()}
      >
        + 新建对话
      </button>

      <div className="session-list">
        {sessions.length === 0 ? (
          <div className="session-empty">暂无对话，点击上方按钮开始一次新会话。</div>
        ) : (
          sessions.map((session) => (
            <button
              key={session.id}
              type="button"
              className={`session-item ${
                session.id === activeSessionId ? 'active' : ''
              }`}
              onClick={() => onSelectSession?.(session.id)}
            >
              <div className="session-title">
                {session.title || '未命名对话'}
              </div>
              <div className="session-meta">
                <span>{session.model ?? 'DeepSeek · Chat'}</span>
                <span>·</span>
                <span>更新于 {formatUpdatedAt(session.updated_at)}</span>
              </div>
            </button>
          ))
        )}
      </div>

      <div className="sidebar-footer">
        <button className="feedback-btn">反馈问题</button>
        <div className="profile">
          <div className="profile-avatar">JL</div>
          <div>
            <div className="profile-name">Jessie Lee</div>
            <div className="profile-email">jessie@example.com</div>
          </div>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar

