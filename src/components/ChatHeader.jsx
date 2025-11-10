function ChatHeader({ session }) {
  if (!session) {
    return (
      <header className="chat-header">
        <div>
          <h1 className="chat-title">还没有开始对话</h1>
          <p className="chat-subtitle">选择左侧会话或新建一个</p>
        </div>
      </header>
    )
  }

  return (
    <header className="chat-header">
      <div>
        <h1 className="chat-title">{session.title || '未命名对话'}</h1>
        <p className="chat-subtitle">
          {session.model ?? 'DeepSeek · Chat'} · 最近更新{' '}
          {session.updatedLabel}
        </p>
      </div>
    </header>
  )
}

export default ChatHeader

