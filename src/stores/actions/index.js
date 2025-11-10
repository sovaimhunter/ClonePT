/**
 * Actions 统一导出
 * 
 * 将所有 action 模块整合到一起
 */

import { createComposerActions } from './composerActions.js'
import { createFileActions } from './fileActions.js'
import { createSessionActions } from './sessionActions.js'
import { createStreamActions } from './streamActions.js'

/**
 * 创建所有 actions
 * @param {Function} set - Zustand set 函数
 * @param {Function} get - Zustand get 函数
 * @returns {Object} 所有 actions 的集合
 */
export function createActions(set, get) {
  return {
    ...createComposerActions(set, get),
    ...createFileActions(set, get),
    ...createSessionActions(set, get),
    ...createStreamActions(set, get),
  }
}

