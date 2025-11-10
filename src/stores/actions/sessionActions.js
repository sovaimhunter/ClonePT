/**
 * 会话管理相关的 actions
 */

import {
  listSessions,
  listMessages,
  createSession,
  deleteSession,
} from '../../services/chatApi.js'
import { ERROR_MESSAGES } from '../../constants/index.js'
import { handleError } from '../helpers/errorHandler.js'

export function createSessionActions(set, get) {
  return {
    /**
     * 初始化应用，加载会话列表
     */
    async initialize(force = false) {
      if (get().hasInitialized && !force) {
        return
      }
      set({ hasInitialized: true })
      await get().refreshSessions(true)
    },

    /**
     * 刷新会话列表
     * @param {boolean} selectFirst - 是否选择第一个会话
     * @param {boolean} refreshActiveMessages - 是否刷新当前会话的消息
     */
    async refreshSessions(selectFirst = false, refreshActiveMessages = true) {
      set({ loadingSessions: true, error: null })

      try {
        const sessions = await listSessions()
        set({ sessions })

        let targetSessionId = get().activeSessionId

        // 选择第一个会话
        if (selectFirst) {
          targetSessionId = sessions[0]?.id ?? null
          set({ activeSessionId: targetSessionId })
        }
        // 如果当前会话已被删除，选择第一个会话
        else if (
          targetSessionId &&
          !sessions.some((session) => session.id === targetSessionId)
        ) {
          targetSessionId = sessions[0]?.id ?? null
          set({ activeSessionId: targetSessionId })
        }

        // 加载会话消息
        if (targetSessionId) {
          if (selectFirst || refreshActiveMessages) {
            await get().refreshMessages(targetSessionId)
          }
        } else {
          set({ messages: [] })
        }
      } catch (error) {
        handleError(error, set, '加载会话失败')
      } finally {
        set({ loadingSessions: false })
      }
    },

    /**
     * 刷新指定会话的消息列表
     */
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
        handleError(error, set, '加载消息失败')
      } finally {
        set({ loadingMessages: false })
      }
    },

    /**
     * 选择一个会话
     */
    async selectSession(sessionId) {
      if (!sessionId || sessionId === get().activeSessionId) return
      set({ activeSessionId: sessionId, composerValue: '' })
      await get().refreshMessages(sessionId)
    },

    /**
     * 创建新会话
     */
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
        handleError(error, set, ERROR_MESSAGES.SESSION_CREATE_FAILED)
      }
    },

    /**
     * 删除会话
     */
    async removeSession(sessionId) {
      if (!sessionId) return

      const currentSessionId = get().activeSessionId

      try {
        await deleteSession(sessionId)

        // 从列表中移除会话
        set((state) => ({
          sessions: state.sessions.filter((session) => session.id !== sessionId),
        }))

        // 如果删除的是当前会话，切换到下一个会话
        if (sessionId === currentSessionId) {
          const { sessions } = get()
          const nextSessionId = sessions[0]?.id ?? null
          set({ activeSessionId: nextSessionId, messages: [], composerValue: '' })

          if (nextSessionId) {
            await get().refreshMessages(nextSessionId)
          }
        }
      } catch (error) {
        handleError(error, set, ERROR_MESSAGES.SESSION_DELETE_FAILED)
      }
    },
  }
}

