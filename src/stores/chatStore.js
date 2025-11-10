import { create } from 'zustand'
import {
  listSessions,
  listMessages,
  createSession,
  deleteSession,
} from '../services/chatApi.js'
import { streamChat } from '../services/chatStream.js'
import { extractTextFromPDF, isPDF } from '../utils/pdfExtractor.js'

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
    const { activeSessionId, model } = get()
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
        let preview = null
        let textContent = null
        let url = null

        // 判断文件类型
        const isImage = file.type.startsWith('image/')
        const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
        const isTextFile = file.type.startsWith('text/') || 
                          file.name.match(/\.(txt|md|csv|json|js|jsx|ts|tsx|html|css|py|java|cpp|c|h)$/i)

        if (isImage) {
          // 图片：上传到 Supabase Storage，使用 URL
          preview = URL.createObjectURL(file)

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
            throw new Error(errorData.error || '图片上传失败')
          }

          const uploadedFile = await response.json()
          url = uploadedFile.url
        } else if (isPDF && model === 'gpt-4o') {
          // PDF：在前端提取文本
          set({ error: `正在提取 ${file.name} 的文本...` })
          
          try {
            textContent = await extractTextFromPDF(file, {
              maxPages: 100,
              maxChars: 100000,
            })
            
            if (!textContent || textContent.trim().length === 0) {
              throw new Error('PDF 中没有可提取的文本（可能是扫描版）')
            }
            
            console.log(`PDF 文本提取成功: ${textContent.length} 字符`)
            set({ error: null })
          } catch (err) {
            console.error('PDF 提取失败', err)
            set({ error: null })
            throw new Error(`PDF 提取失败: ${err.message}`)
          }
        } else if (isTextFile && model === 'gpt-4o') {
          // TXT 等文本文件：直接读取内容
          set({ error: `正在读取 ${file.name}...` })
          
          try {
            textContent = await file.text()
            
            if (!textContent || textContent.trim().length === 0) {
              throw new Error('文件内容为空')
            }
            
            // 限制文本长度
            if (textContent.length > 100000) {
              textContent = textContent.slice(0, 100000) + '\n\n... (文件过长，已截断)'
            }
            
            console.log(`文本文件读取成功: ${textContent.length} 字符`)
            set({ error: null })
          } catch (err) {
            console.error('文本文件读取失败', err)
            set({ error: null })
            throw new Error(`文本文件读取失败: ${err.message}`)
          }
        } else {
          throw new Error('不支持的文件类型或模型（仅 GPT-4o 支持文档上传）')
        }

        // 添加到附件列表
        get().addAttachment({
          name: file.name,
          type: file.type,
          size: file.size,
          preview,
          url,
          textContent,
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

    // 构建用户消息内容（图片和文档）
    let userMessageContent = text
    
    if (attachments.length > 0) {
      const contentParts = []
      
      // 处理图片
      attachments
        .filter((att) => att.type?.startsWith('image/'))
        .forEach((att) => {
          contentParts.push(`![${att.name}](${att.url || att.preview})`)
        })
      
      // 处理文档（PDF 文本内容）
      attachments
        .filter((att) => att.textContent)
        .forEach((att) => {
          contentParts.push(`**文件: ${att.name}**\n\`\`\`\n${att.textContent}\n\`\`\``)
        })
      
      if (contentParts.length > 0) {
        userMessageContent = contentParts.join('\n\n') + '\n\n' + text
      }
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

    // 保存附件副本（清空前）
    const attachmentsCopy = attachments.length > 0 ? [...attachments] : undefined

    // 调试：检查附件内容
    if (attachmentsCopy) {
      console.log('前端发送附件:', attachmentsCopy.map(att => ({
        name: att.name,
        type: att.type,
        hasUrl: !!att.url,
        hasTextContent: !!att.textContent,
        textLength: att.textContent?.length || 0,
      })))
    }

    // 清空附件
    get().clearAttachments()

    streamController = streamChat({
      sessionId: activeSessionId,
      message: text,
      model,
      attachments: attachmentsCopy,
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

