/**
 * 会话管理辅助函数
 */

/**
 * 刷新会话和消息
 */
export async function refreshSessionAndMessages(
  completedSessionId,
  activeSessionId,
  refreshSessions,
  refreshMessages,
) {
  const targetSessionId = completedSessionId ?? activeSessionId
  await refreshSessions(false, false)
  if (targetSessionId) {
    await refreshMessages(targetSessionId)
  }
}

/**
 * 更新会话中的推理内容
 */
export function updateMessageReasoning(messages, messageId, reasoning) {
  return messages.map((message) =>
    message.id === messageId ? { ...message, reasoning } : message,
  )
}

/**
 * 过滤临时消息
 */
export function filterTempMessages(messages) {
  return messages.filter((message) => !message.temp)
}

