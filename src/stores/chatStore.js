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
  attachments: [],
  uploadingFiles: false,
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

  setModel(model) {
    set({ model })
  },

  addAttachment(attachment) {
    set((state) => ({
      attachments: [...state.attachments, attachment],
    }))
  },

  removeAttachment(index) {
    set((state) => ({
      attachments: state.attachments.filter((_, i) => i !== index),
    }))
  },

  clearAttachments() {
    set({ attachments: [] })
  },

  async uploadFiles(files) {
    const { activeSessionId } = get()
    set({ uploadingFiles: true, error: null })

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const functionBaseUrl =
        import.meta.env.VITE_SUPABASE_FUNCTION_URL ??
        (supabaseUrl ? `${supabaseUrl.replace(/\/$/, '')}/functions/v1` : '')
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

      if (!functionBaseUrl) {
        throw new Error('Supabase Function 地址未配置')
      }

      for (const file of files) {
        // 创建预览
        let preview = null
        if (file.type.startsWith('image/')) {
          preview = URL.createObjectURL(file)
        }

        // 上传文件
        const formData = new FormData()
        formData.append('file', file)
        formData.append('sessionId', activeSessionId || '')
        formData.append('type', 'vision')

        const response = await fetch(`${functionBaseUrl}/upload-file`, {
          method: 'POST',
          headers: {
            ...(supabaseAnonKey
              ? {
                  apikey: supabaseAnonKey,
                  Authorization: `Bearer ${supabaseAnonKey}`,
                }
              : {}),
          },
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || '文件上传失败')
        }

        const uploadedFile = await response.json()

        // 添加到附件列表
        get().addAttachment({
          name: file.name,
          type: file.type,
          size: file.size,
          preview,
          url: uploadedFile.url,
          storagePath: uploadedFile.storagePath,
        })
      }
    } catch (error) {
      console.error('文件上传失败', error)
      set({ error: error.message || '文件上传失败' })
    } finally {
      set({ uploadingFiles: false })
    }
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
    const {
      composerValue,
      activeSessionId,
      isStreaming,
      messages,
      model,
      attachments,
    } = get()
    const text = (composerValue ?? '').trim()

    if (!text && attachments.length === 0) return

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

    const useReasoning = model === 'deepseek-reasoner'

    // 构建用户消息内容（包含附件的 Markdown）
    let userMessageContent = text
    
    if (attachments.length > 0) {
      // 在消息前添加图片 Markdown
      const attachmentMarkdown = attachments
        .map((att) => {
          if (att.type?.startsWith('image/')) {
            return `![${att.name}](${att.url || att.preview})`
          }
          return `[📎 ${att.name}](${att.url || att.preview})`
        })
        .join('\n')
      
      userMessageContent = attachmentMarkdown + '\n\n' + text
    }

    // 构建用户消息
    const userMessage = {
      id: tempUserId,
      role: 'user',
      content: userMessageContent,
      created_at: now,
      temp: true,
      attachments: attachments.length > 0 ? attachments : undefined,
    }

    set({
      composerValue: '',
      lastSubmittedInput: text,
      error: null,
      messages: [
        ...messages,
        userMessage,
        {
          id: tempAssistantId,
          role: 'assistant',
          content: '',
          created_at: now,
          temp: true,
          ...(useReasoning ? { reasoning: '', model } : {}),
        },
      ],
      isStreaming: true,
      streamingMessageId: tempAssistantId,
    })

    // 清空附件
    get().clearAttachments()

    streamController = streamChat({
      sessionId: activeSessionId,
      message: text,
      model,
      attachments: attachments.length > 0 ? attachments : undefined,
      onSession: async ({ sessionId: newSessionId, session }) => {
        if (newSessionId && newSessionId !== get().activeSessionId) {
          set({ activeSessionId: newSessionId })
        }
        if (session) {
          set((state) => {
            const exists = state.sessions.some(
              (item) => item.id === session.id,
            )
            return exists
              ? {
                  sessions: state.sessions.map((item) =>
                    item.id === session.id ? { ...item, ...session } : item,
                  ),
                }
              : { sessions: [session, ...state.sessions] }
          })
        }
      },
      onDelta: ({ content, reasoning }) => {
        set((state) => ({
          messages: state.messages.map((message) => {
            if (message.id !== tempAssistantId) return message
            const updated = {
              ...message,
              content: content
                ? `${message.content || ''}${content}`
                : message.content,
            }
            if (model === 'deepseek-reasoner' && reasoning) {
              updated.reasoning = `${message.reasoning || ''}${reasoning}`
            }
            return updated
          }),
        }))
      },
      onComplete: async ({
        sessionId: completedSessionId,
        messageId: finalMessageId,
        reasoning,
      }) => {
        streamController = null
        set({
          isStreaming: false,
          streamingMessageId: null,
          lastSubmittedInput: '',
          messages:
            model === 'deepseek-reasoner' && reasoning
              ? get().messages.map((message) =>
                  message.id === tempAssistantId
                    ? { ...message, reasoning }
                    : message,
                )
              : get().messages,
        })
        const targetSessionId =
          completedSessionId ?? get().activeSessionId
        await get().refreshSessions(false, false)
        if (targetSessionId) {
          await get().refreshMessages(targetSessionId)
          if (model === 'deepseek-reasoner' && finalMessageId && reasoning) {
            set((state) => ({
              messages: state.messages.map((message) =>
                message.id === finalMessageId
                  ? { ...message, reasoning }
                  : message,
              ),
            }))
          }
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

