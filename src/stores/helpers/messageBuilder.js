/**
 * 消息构建辅助函数
 */

/**
 * 构建用户消息内容（包含图片和文档）
 */
export function buildUserMessageContent(text, attachments) {
  if (attachments.length === 0) {
    return text
  }

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

  if (contentParts.length === 0) {
    return text
  }

  // 如果有文本消息，附加在附件后面；否则只用附件内容
  return text ? contentParts.join('\n\n') + '\n\n' + text : contentParts.join('\n\n')
}

/**
 * 创建临时用户消息
 */
export function createTempUserMessage(text, attachments, now) {
  const userMessageContent = buildUserMessageContent(text, attachments)

  return {
    id: `temp-user-${now}`,
    role: 'user',
    content: userMessageContent,
    created_at: now,
    temp: true,
    attachments: attachments.length > 0 ? attachments : undefined,
  }
}

/**
 * 创建临时助手消息
 */
export function createTempAssistantMessage(model, now) {
  const useReasoning = model === 'deepseek-reasoner'

  return {
    id: `temp-assistant-${now}`,
    role: 'assistant',
    content: '',
    created_at: now,
    temp: true,
    ...(useReasoning ? { reasoning: '', model } : {}),
  }
}

/**
 * 记录附件调试信息
 */
export function logAttachmentDebugInfo(attachments) {
  if (!attachments || attachments.length === 0) return

  console.log(
    '前端发送附件:',
    attachments.map((att) => ({
      name: att.name,
      type: att.type,
      hasUrl: !!att.url,
      hasTextContent: !!att.textContent,
      textLength: att.textContent?.length || 0,
    })),
  )
}

