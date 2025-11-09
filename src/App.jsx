import { useEffect, useMemo, useRef } from 'react'
import './App.css'
import 'highlight.js/styles/atom-one-dark.css'
import Sidebar from './components/Sidebar.jsx'
import ChatHeader from './components/ChatHeader.jsx'
import Message from './components/Message.jsx'
import Composer from './components/Composer.jsx'
import { useChatStore } from './stores/chatStore.js'

function formatRelativeTime(value) {
  if (!value) return '刚刚'
  try {
    const date = new Date(value)
    const diff = Date.now() - date.getTime()
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

function formatMessageTime(value) {
  if (!value) return ''
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value))
  } catch (_error) {
    return value
  }
}

function App() {
  const sessions = useChatStore((state) => state.sessions)
  const activeSessionId = useChatStore((state) => state.activeSessionId)
  const messages = useChatStore((state) => state.messages)
  const loadingSessions = useChatStore((state) => state.loadingSessions)
  const loadingMessages = useChatStore((state) => state.loadingMessages)
  const error = useChatStore((state) => state.error)
  const composerValue = useChatStore((state) => state.composerValue)
  const isStreaming = useChatStore((state) => state.isStreaming)
  const streamingMessageId = useChatStore((state) => state.streamingMessageId)
  const selectSession = useChatStore((state) => state.selectSession)
  const createNewSession = useChatStore((state) => state.createNewSession)
  const removeSession = useChatStore((state) => state.removeSession)
  const setComposerValue = useChatStore((state) => state.setComposerValue)
  const sendMessage = useChatStore((state) => state.sendMessage)
  const stopGeneration = useChatStore((state) => state.stopGeneration)
  const messageListRef = useRef(null)

  useEffect(() => {
    useChatStore.getState().initialize().catch((error) => {
      console.error('初始化会话失败', error)
    })
  }, [])

  useEffect(() => {
    const container = messageListRef.current
    if (!container) return

    const scrollToBottom = () => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: isStreaming ? 'smooth' : 'auto',
      })
    }

    requestAnimationFrame(scrollToBottom)
  }, [messages, isStreaming])

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) ?? null,
    [sessions, activeSessionId],
  )

  const headerSession = activeSession
    ? {
        ...activeSession,
        updatedLabel: formatRelativeTime(
          activeSession.updated_at ?? activeSession.created_at,
        ),
      }
    : null

  const displayMessages = messages.map((message) => ({
    ...message,
    name: message.role === 'user' ? '我' : 'DeepSeek 助手',
    time: formatMessageTime(message.created_at),
    tokenInfo: message.tokens ? `消耗 ${message.tokens} tokens` : null,
  }))

  const handleCopyMessage = (text) => {
    if (!text) return
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {
        window.prompt('复制失败，请手动复制以下内容：', text)
      })
    } else {
      window.prompt('复制内容：', text)
    }
  }

  return (
    <div className="app-shell">
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={selectSession}
        onCreateSession={createNewSession}
        onDeleteSession={(sessionId) => {
          if (!sessionId) return
          if (
            window.confirm(
              '确定要删除该对话吗？此操作不可撤销，将删除会话及其全部消息。',
            )
          ) {
            removeSession(sessionId)
          }
        }}
      />
      <main className="chat-panel">
        <ChatHeader
          session={headerSession}
          onCopyConversation={() => {
            // TODO: 实现复制功能
          }}
        />
        <section className="message-list" ref={messageListRef}>
          {loadingSessions && sessions.length === 0 ? (
            <div className="message-placeholder">正在加载会话…</div>
          ) : loadingMessages && messages.length === 0 ? (
            <div className="message-placeholder">正在加载消息…</div>
          ) : displayMessages.length === 0 ? (
            <div className="message-placeholder">
              {activeSession
                ? '暂时没有消息，开始输入与 DeepSeek 对话吧。'
                : '新建一个会话或选择已有会话开始聊天。'}
            </div>
          ) : (
            displayMessages.map((message) => (
              <Message
                key={message.id}
                role={message.role}
                name={message.name}
                time={message.time}
                content={message.content}
                tokenInfo={message.tokenInfo}
                isStreaming={isStreaming && message.id === streamingMessageId}
                onCopy={handleCopyMessage}
              />
            ))
          )}
          {error && <div className="message-error">⚠️ {error}</div>}
        </section>
        <Composer
          value={composerValue}
          onChange={setComposerValue}
          onSubmit={sendMessage}
          onStopGeneration={stopGeneration}
          disabled={!activeSession}
          isStreaming={isStreaming}
          draftHint={
            activeSession ? '输入内容后按 Enter 发送' : '新建会话后可开始输入'
          }
        />
      </main>
    </div>
  )
}

export default App
