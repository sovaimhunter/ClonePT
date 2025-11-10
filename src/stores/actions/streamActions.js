/**
 * 流式响应相关的 actions
 */

import { streamChat } from '../../services/chatStream.js'
import { ERROR_MESSAGES } from '../../constants/index.js'
import {
  createTempUserMessage,
  createTempAssistantMessage,
  logAttachmentDebugInfo,
} from '../helpers/messageBuilder.js'
import {
  refreshSessionAndMessages,
  updateMessageReasoning,
  filterTempMessages,
} from '../helpers/sessionManager.js'

// 流控制器（模块级变量）
let streamController = null

/**
 * 创建流式响应回调
 */
function createStreamCallbacks(tempAssistantId, model, get, set) {
  return {
    /**
     * 会话创建/更新回调
     */
    onSession: async ({ sessionId: newSessionId, session }) => {
      if (newSessionId && newSessionId !== get().activeSessionId) {
        set({ activeSessionId: newSessionId })
      }

      if (session) {
        set((state) => {
          const exists = state.sessions.some((item) => item.id === session.id)
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

    /**
     * 增量内容回调
     */
    onDelta: ({ content, reasoning }) => {
      set((state) => ({
        messages: state.messages.map((message) => {
          if (message.id !== tempAssistantId) return message

          const updated = {
            ...message,
            content: content ? `${message.content || ''}${content}` : message.content,
          }

          if (model === 'deepseek-reasoner' && reasoning) {
            updated.reasoning = `${message.reasoning || ''}${reasoning}`
          }

          return updated
        }),
      }))
    },

    /**
     * 完成回调
     */
    onComplete: async ({ sessionId: completedSessionId, messageId: finalMessageId, reasoning }) => {
      streamController = null

      set({
        isStreaming: false,
        streamingMessageId: null,
        lastSubmittedInput: '',
        messages:
          model === 'deepseek-reasoner' && reasoning
            ? updateMessageReasoning(get().messages, tempAssistantId, reasoning)
            : get().messages,
      })

      // 刷新会话和消息
      await refreshSessionAndMessages(
        completedSessionId,
        get().activeSessionId,
        () => get().refreshSessions(false, false),
        (sessionId) => get().refreshMessages(sessionId),
      )

      // 更新最终消息的推理内容
      if (model === 'deepseek-reasoner' && finalMessageId && reasoning) {
        set((state) => ({
          messages: updateMessageReasoning(state.messages, finalMessageId, reasoning),
        }))
      }
    },

    /**
     * 错误回调
     */
    onError: async (error) => {
      streamController = null

      // 处理非取消错误
      if (error.message !== '请求已取消') {
        const lastInput = get().lastSubmittedInput
        set({
          error: error.message || '生成失败',
          composerValue: lastInput || get().composerValue,
          lastSubmittedInput: '',
        })
      }

      set({ isStreaming: false, streamingMessageId: null })

      // 刷新会话
      await get().refreshSessions(false, false)

      // 刷新或清理消息
      const latestSessionId = get().activeSessionId
      if (latestSessionId) {
        await get().refreshMessages(latestSessionId)
      } else {
        set((state) => ({
          messages: filterTempMessages(state.messages),
        }))
      }
    },
  }
}

export function createStreamActions(set, get) {
  return {
    /**
     * 停止当前的生成
     */
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

    /**
     * 发送消息
     */
    async sendMessage() {
      const { composerValue, activeSessionId, isStreaming, messages, model, attachments } = get()
      const text = (composerValue ?? '').trim()

      // 验证输入
      if (!text && attachments.length === 0) return
      if (!activeSessionId) {
        set({ error: ERROR_MESSAGES.NO_SESSION_SELECTED })
        return
      }
      if (isStreaming) return

      // 创建临时消息
      const now = new Date().toISOString()
      const tempAssistantId = `temp-assistant-${now}`
      const userMessage = createTempUserMessage(text, attachments, now)
      const assistantMessage = createTempAssistantMessage(model, now)

      // 更新状态
      set({
        composerValue: '',
        lastSubmittedInput: text,
        error: null,
        messages: [...messages, userMessage, assistantMessage],
        isStreaming: true,
        streamingMessageId: tempAssistantId,
      })

      // 保存附件副本并清空
      const attachmentsCopy = attachments.length > 0 ? [...attachments] : undefined
      logAttachmentDebugInfo(attachmentsCopy)
      get().clearAttachments()

      // 创建流式请求
      const callbacks = createStreamCallbacks(tempAssistantId, model, get, set)
      streamController = streamChat({
        sessionId: activeSessionId,
        message: text,
        model,
        attachments: attachmentsCopy,
        ...callbacks,
      })
    },
  }
}

// 导出 streamController getter（用于测试）
export function getStreamController() {
  return streamController
}

