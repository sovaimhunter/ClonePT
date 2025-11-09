import { create } from 'zustand'
import {
  listSessions,
  listMessages,
  createSession,
  deleteSession,
} from '../services/chatApi.js'
import { streamChat } from '../services/chatStream.js'

let streamController = null

export const useChatStore = create((set, get) => ({
  sessions: [],
  activeSessionId: null,
  messages: [],
  loadingSessions: false,
  loadingMessages: false,
  error: null,
  composerValue: '',
  lastSubmittedInput: '',
  model: 'deepseek-chat',
  isStreaming: false,
  streamingMessageId: null,
  hasInitialized: false,

  setComposerValue(value) {
    set({ composerValue: value })
  },

  clearError() {
    set({ error: null })
  },

  toggleModel() {
    const current = get().model
    set({
      model: current === 'deepseek-chat' ? 'deepseek-reasoner' : 'deepseek-chat',
    })
  },

  async initialize(force = false) {
    if (get().hasInitialized && !force) {
      return
    }
    set({ hasInitialized: true })
    await get().refreshSessions(true)
  },

  async refreshSessions(selectFirst = false, refreshActiveMessages = true) {
    set({ loadingSessions: true, error: null })

    try {
      const sessions = await listSessions()
      set({ sessions })

      let targetSessionId = get().activeSessionId

      if (selectFirst) {
        targetSessionId = sessions[0]?.id ?? null
        set({ activeSessionId: targetSessionId })
      } else if (
        targetSessionId &&
        !sessions.some((session) => session.id === targetSessionId)
      ) {
        targetSessionId = sessions[0]?.id ?? null
        set({ activeSessionId: targetSessionId })
      }

      if (targetSessionId) {
        if (selectFirst || refreshActiveMessages) {
          await get().refreshMessages(targetSessionId)
        }
      } else {
        set({ messages: [] })
      }
    } catch (error) {
      console.error(error)
      set({ error: error.message || '加载会话失败' })
    } finally {
      set({ loadingSessions: false })
    }
  },

  async refreshMessages(sessionId) {
    if (!sessionId) {
      set({ messages: [] })
      return
    }

    set({ loadingMessages: true, error: null })

    try {
      const messages = await listMessages(sessionId)
      set({ messages })
    } catch (error) {
      console.error(error)
      set({ error: error.message || '加载消息失败' })
    } finally {
      set({ loadingMessages: false })
    }
  },

  async selectSession(sessionId) {
    if (!sessionId || sessionId === get().activeSessionId) return
    set({ activeSessionId: sessionId, composerValue: '' })
    await get().refreshMessages(sessionId)
  },

  async createNewSession() {
    try {
      const newSession = await createSession()
      set((state) => ({
        sessions: [newSession, ...state.sessions],
        activeSessionId: newSession.id,
        messages: [],
        composerValue: '',
      }))
    } catch (error) {
      console.error(error)
      set({ error: error.message || '创建会话失败' })
    }
  },

  async removeSession(sessionId) {
    if (!sessionId) return
    const currentSessionId = get().activeSessionId
    try {
      await deleteSession(sessionId)
      set((state) => ({
        sessions: state.sessions.filter((session) => session.id !== sessionId),
      }))

      if (sessionId === currentSessionId) {
        const { sessions } = get()
        const nextSessionId = sessions[0]?.id ?? null
        set({ activeSessionId: nextSessionId, messages: [], composerValue: '' })
        if (nextSessionId) {
          await get().refreshMessages(nextSessionId)
        }
      }
    } catch (error) {
      console.error(error)
      set({ error: error.message || '删除会话失败' })
    }
  },

  stopGeneration() {
    if (streamController) {
      streamController.abort()
      streamController = null
    }
    const updates = {
      isStreaming: false,
      streamingMessageId: null,
    }
    const { lastSubmittedInput } = get()
    if (lastSubmittedInput) {
      updates.composerValue = lastSubmittedInput
      updates.lastSubmittedInput = ''
    }
    set(updates)
  },

  async sendMessage() {
    const { composerValue, activeSessionId, isStreaming, messages, model } =
      get()
    const text = (composerValue ?? '').trim()

    if (!text) return

    if (!activeSessionId) {
      set({ error: '请先选择或新建一个会话' })
      return
    }

    if (isStreaming) {
      return
    }

    const now = new Date().toISOString()
    const tempUserId = `temp-user-${now}`
    const tempAssistantId = `temp-assistant-${now}`

    set({
      composerValue: '',
      lastSubmittedInput: text,
      error: null,
      messages: [
        ...messages,
        {
          id: tempUserId,
          role: 'user',
          content: text,
          created_at: now,
          temp: true,
        },
        {
          id: tempAssistantId,
          role: 'assistant',
          content: '',
          created_at: now,
          temp: true,
        },
      ],
      isStreaming: true,
      streamingMessageId: tempAssistantId,
    })

    streamController = streamChat({
      sessionId: activeSessionId,
      message: text,
      model,
      onSession: async ({ sessionId: newSessionId }) => {
        if (newSessionId && newSessionId !== get().activeSessionId) {
          set({ activeSessionId: newSessionId })
        }
        await get().refreshSessions(false, false)
      },
      onDelta: ({ content }) => {
        if (!content) return
        set((state) => ({
          messages: state.messages.map((message) =>
            message.id === tempAssistantId
              ? {
                  ...message,
                  content: `${message.content || ''}${content}`,
                }
              : message,
          ),
        }))
      },
      onComplete: async ({ sessionId: completedSessionId }) => {
        streamController = null
        set({
          isStreaming: false,
          streamingMessageId: null,
          lastSubmittedInput: '',
        })
        const targetSessionId =
          completedSessionId ?? get().activeSessionId
        await get().refreshSessions(false, false)
        if (targetSessionId) {
          await get().refreshMessages(targetSessionId)
        }
      },
      onError: async (error) => {
        streamController = null
        if (error.message !== '请求已取消') {
          const lastInput = get().lastSubmittedInput
          set({
            error: error.message || '生成失败',
            composerValue: lastInput || get().composerValue,
            lastSubmittedInput: '',
          })
        }
        set({ isStreaming: false, streamingMessageId: null })
        await get().refreshSessions(false, false)
        const latestSessionId = get().activeSessionId
        if (latestSessionId) {
          await get().refreshMessages(latestSessionId)
        } else {
          set((state) => ({
            messages: state.messages.filter((message) => !message.temp),
          }))
        }
      },
    })
  },
}))

