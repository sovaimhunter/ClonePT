const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const functionBaseUrl =
  import.meta.env.VITE_SUPABASE_FUNCTION_URL ??
  (supabaseUrl ? `${supabaseUrl.replace(/\/$/, '')}/functions/v1` : '')
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!functionBaseUrl) {
  console.warn('VITE_SUPABASE_FUNCTION_URL 或 VITE_SUPABASE_URL 未设置，流式调用将失败')
}

export function streamChat({
  sessionId,
  message,
  model = 'deepseek-chat',
  attachments,
  onSession,
  onDelta,
  onComplete,
  onError,
}) {
  if (!functionBaseUrl) {
    const error = new Error('Supabase Function 地址未配置')
    onError?.(error)
    return { abort() {} }
  }

  const controller = new AbortController()

  ;(async () => {
    try {
      const useReasoning = model === 'deepseek-reasoner'
      const requestBody = {
        sessionId,
        message,
        model,
      }

      if (attachments && attachments.length > 0) {
        requestBody.attachments = attachments
      }

      const response = await fetch(`${functionBaseUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(supabaseAnonKey
            ? {
                apikey: supabaseAnonKey,
                Authorization: `Bearer ${supabaseAnonKey}`,
              }
            : {}),
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      })

      if (!response.ok || !response.body) {
        const text = await response.text()
        throw new Error(text || '调用 Edge Function 失败')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let reasoningBuffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const events = buffer.split('\n\n')
        buffer = events.pop() ?? ''

        for (const rawEvent of events) {
          if (!rawEvent.trim()) continue

          const lines = rawEvent.split('\n')
          let eventName = 'message'
          const dataLines = []

          for (const line of lines) {
            if (line.startsWith('event:')) {
              eventName = line.replace('event:', '').trim()
            } else if (line.startsWith('data:')) {
              dataLines.push(line.replace('data:', '').trim())
            }
          }

          const dataStr = dataLines.join('\n')

          switch (eventName) {
            case 'session': {
              try {
                const payload = JSON.parse(dataStr)
                onSession?.(payload)
              } catch (error) {
                console.error('解析 session 事件失败', error)
              }
              break
            }
            case 'delta': {
              let payload
              try {
                payload = JSON.parse(dataStr)
              } catch (_parseErr) {
                if (!useReasoning && dataStr && dataStr !== '[DONE]') {
                  onDelta?.({ content: dataStr, reasoning: '' })
                }
                break
              }

              try {
                const delta = payload?.choices?.[0]?.delta ?? {}
                
                // 提取 content
                let textChunk = ''
                if (typeof delta?.content === 'string') {
                  textChunk = delta.content
                } else if (Array.isArray(delta?.content)) {
                  textChunk = delta.content
                    .map((item) => item?.text ?? '')
                    .join('')
                }
                
                // 提取 reasoning_content (仅 deepseek-reasoner)
                let reasoningChunk = ''
                if (useReasoning) {
                  if (typeof delta?.reasoning_content === 'string') {
                    reasoningChunk = delta.reasoning_content
                    reasoningBuffer += reasoningChunk
                  } else if (Array.isArray(delta?.reasoning_content)) {
                    reasoningChunk = delta.reasoning_content
                      .map((item) => item?.text ?? '')
                      .join('')
                    reasoningBuffer += reasoningChunk
                  }
                }
                
                // 只要有内容就推送
                if (textChunk || reasoningChunk) {
                  onDelta?.({
                    content: textChunk,
                    reasoning: reasoningChunk,
                  })
                }
              } catch (error) {
                console.error('解析 delta 事件失败', error)
              }
              break
            }
            case 'complete': {
              try {
                const payload = JSON.parse(dataStr)
                onComplete?.({
                  ...payload,
                  reasoning: useReasoning ? reasoningBuffer : '',
                })
              } catch (error) {
                console.error('解析 complete 事件失败', error)
                onComplete?.({
                  reasoning: useReasoning ? reasoningBuffer : '',
                })
              }
              break
            }
            case 'error': {
              try {
                const payload = JSON.parse(dataStr)
                const err = new Error(payload?.message ?? '服务端错误')
                onError?.(err)
              } catch (error) {
                onError?.(new Error(dataStr || '服务端错误'))
              }
              break
            }
            default:
              break
          }
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        onError?.(new Error('请求已取消'))
      } else {
        onError?.(error)
      }
    }
  })()

  return {
    abort() {
      controller.abort()
    },
  }
}

