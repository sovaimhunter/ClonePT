/**
 * Chat Store - 主状态管理
 * 
 * 使用 Zustand 管理全局聊天状态
 * 所有 actions 已模块化到 actions/ 目录
 */

import { create } from 'zustand'
import { DEFAULT_MODEL } from '../constants/index.js'
import { createActions } from './actions/index.js'

/**
 * 初始状态
 */
const initialState = {
  // 会话相关
  sessions: [],
  activeSessionId: null,
  loadingSessions: false,

  // 消息相关
  messages: [],
  loadingMessages: false,

  // 输入框相关
  composerValue: '',
  lastSubmittedInput: '',

  // 附件相关
  attachments: [],
  uploadingFiles: false,

  // 流式响应相关
  isStreaming: false,
  streamingMessageId: null,

  // 模型相关
  model: DEFAULT_MODEL,

  // 通用状态
  error: null,
  hasInitialized: false,
}

/**
 * 创建 Chat Store
 */
export const useChatStore = create((set, get) => ({
  // 初始状态
  ...initialState,

  // 所有 actions
  ...createActions(set, get),
}))
