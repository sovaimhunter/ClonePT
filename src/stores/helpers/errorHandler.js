/**
 * 错误处理辅助函数
 */

/**
 * 统一的错误处理
 * @param {Error} error - 错误对象
 * @param {Function} set - Zustand set 函数
 * @param {string} defaultMessage - 默认错误消息
 */
export function handleError(error, set, defaultMessage) {
  console.error(error)
  set({ error: error.message || defaultMessage })
}

/**
 * 带清理状态的错误处理
 * @param {Error} error - 错误对象
 * @param {Function} set - Zustand set 函数
 * @param {string} defaultMessage - 默认错误消息
 * @param {Object} cleanupState - 需要清理的状态
 */
export function handleErrorWithCleanup(error, set, defaultMessage, cleanupState = {}) {
  console.error(error)
  set({
    error: error.message || defaultMessage,
    ...cleanupState,
  })
}

