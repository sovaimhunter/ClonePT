import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY')
const deepseekBaseUrl = Deno.env.get('DEEPSEEK_BASE_URL') ?? 'https://api.deepseek.com'
const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
const openaiBaseUrl = Deno.env.get('OPENAI_BASE_URL') ?? 'https://api.openai.com/v1'
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
  Deno.env.get('SUPABASE_SERVICE_KEY') ??
  ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization,apikey,content-type,x-client-info',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Max-Age': '86400',
}

if (!deepseekApiKey) {
  console.warn('Missing DEEPSEEK_API_KEY environment variable')
}

if (!openaiApiKey) {
  console.warn('Missing OPENAI_API_KEY environment variable')
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('Missing Supabase service credentials')
}

const encoder = new TextEncoder()
const decoder = new TextDecoder()

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: corsHeaders,
    })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  let payload: {
    sessionId?: number
    message?: string
    model?: string
    attachments?: Array<{ url: string; type: string; name: string }>
  } = {}

  try {
    payload = await req.json()
  } catch (_error) {
    return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    })
  }

  const {
    sessionId,
    message,
    model = 'deepseek-chat',
    attachments = [],
  } = payload

  if (!message || typeof message !== 'string') {
    return new Response(JSON.stringify({ error: 'Missing message text' }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    })
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        let targetSessionId = sessionId

        if (!targetSessionId) {
          const { data: newSession, error: sessionError } = await supabase
            .from('sessions')
            .insert({
              title: message.slice(0, 32) || '新的对话',
              model,
            })
            .select('id')
            .single()

          if (sessionError || !newSession) {
            throw sessionError ??
              new Error('Failed to create new session record')
          }

          targetSessionId = newSession.id
        }

        // 构建用户消息内容（包含附件的 Markdown）
        let userMessageContent = message
        
        if (attachments.length > 0) {
          // 在消息前添加图片 Markdown
          const attachmentMarkdown = attachments
            .map((att) => {
              if (att.type.startsWith('image/')) {
                return `![${att.name}](${att.url})`
              }
              return `[📎 ${att.name}](${att.url})`
            })
            .join('\n')
          
          userMessageContent = attachmentMarkdown + '\n\n' + message
        }

        const { error: insertUserMessageError } = await supabase
          .from('messages')
          .insert({
            session_id: targetSessionId,
            role: 'user',
            content: userMessageContent,
            attachments: attachments.length > 0 ? attachments : null,
          })

        if (insertUserMessageError) {
          throw insertUserMessageError
        }

        // Load history for context
        const { data: historyRows, error: historyError } = await supabase
          .from('messages')
          .select('role, content')
          .eq('session_id', targetSessionId)
          .order('created_at', { ascending: true })

        if (historyError) {
          throw historyError
        }

        const historyMessages =
          historyRows?.map(({ role, content }) => ({ role, content })) ?? []

        // 根据模型选择 API
        const isOpenAI = model.startsWith('gpt-')
        const apiKey = isOpenAI ? openaiApiKey : deepseekApiKey
        const apiBaseUrl = isOpenAI ? openaiBaseUrl : deepseekBaseUrl
        const apiName = isOpenAI ? 'OpenAI' : 'DeepSeek'

        if (!apiKey) {
          throw new Error(`${apiName} API key not configured`)
        }

        // 构建最后一条消息（可能包含附件）
        const lastMessage = historyMessages[historyMessages.length - 1]
        
        // 如果有附件且是 OpenAI 模型，使用 vision 格式
        if (attachments.length > 0 && isOpenAI && lastMessage) {
          const contentParts: Array<
            { type: string; text?: string; image_url?: { url: string } }
          > = []

          // 添加文本内容
          if (lastMessage.content) {
            contentParts.push({ type: 'text', text: lastMessage.content })
          }

          // 添加图片
          for (const attachment of attachments) {
            if (attachment.type.startsWith('image/')) {
              contentParts.push({
                type: 'image_url',
                image_url: { url: attachment.url },
              })
            }
          }

          // 替换最后一条消息为多模态格式
          historyMessages[historyMessages.length - 1] = {
            role: lastMessage.role,
            content: contentParts,
          }
        }

        const requestBody = {
          model,
          stream: true,
          messages: historyMessages,
        }

        const response = await fetch(
          `${apiBaseUrl.replace(/\/$/, '')}/chat/completions`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify(requestBody),
          },
        )

        if (!response.ok || !response.body) {
          const errorText = await response.text()
          throw new Error(
            `${apiName} API error: ${response.status} ${errorText}`,
          )
        }

        const reader = response.body.getReader()
        let assistantBuffer = ''
        let reasoningBuffer = ''
        let sseBuffer = ''
        let assistantMessageId: number | null = null
        let streamFinished = false

        controller.enqueue(
          encoder.encode(
            `event: session\ndata: ${JSON.stringify({
              type: 'session',
              sessionId: targetSessionId,
            })}\n\n`,
          ),
        )

        while (true) {
          const { value, done } = await reader.read()
          if (done) break

          sseBuffer += decoder.decode(value, { stream: true })
          const events = sseBuffer.split('\n\n')
          sseBuffer = events.pop() ?? ''

          for (const evt of events) {
            if (!evt.trim()) continue
            const line = evt.trim()
            if (!line.startsWith('data:')) continue
            const payloadStr = line.replace(/^data:\s*/, '')

            if (payloadStr === '[DONE]') {
              controller.enqueue(
                encoder.encode('event: end\ndata: [DONE]\n\n'),
              )
              streamFinished = true
              break
            }

            try {
              const data = JSON.parse(payloadStr)
              const deltaObj = data?.choices?.[0]?.delta ?? {}
              
              // 提取 content 和 reasoning_content（仅 DeepSeek Reasoner 支持）
              const content = deltaObj.content
              const reasoning = model === 'deepseek-reasoner' ? deltaObj.reasoning_content : undefined
              
              if (content) {
                assistantBuffer += content
              }
              if (reasoning) {
                reasoningBuffer += reasoning
              }
              
              // 转发完整的 delta 给前端
              if (content || reasoning) {
                controller.enqueue(
                  encoder.encode(
                    `event: delta\ndata: ${JSON.stringify(data)}\n\n`,
                  ),
                )
              }
            } catch (_parseErr) {
              // 非 JSON，直接透传文本（仅普通模式）
              assistantBuffer += payloadStr
              controller.enqueue(
                encoder.encode(
                  `event: delta\ndata: ${JSON.stringify({
                    type: 'delta',
                    content: payloadStr,
                  })}\n\n`,
                ),
              )
            }
          }

          if (streamFinished) {
            break
          }
        }

        if (assistantBuffer.trim().length > 0) {
          const messageData: {
            session_id: number
            role: string
            content: string
            reasoning?: string
            model?: string
          } = {
            session_id: targetSessionId,
            role: 'assistant',
            content: assistantBuffer,
          }
          
          // 如果有推理内容，保存到数据库
          if (reasoningBuffer.trim().length > 0) {
            messageData.reasoning = reasoningBuffer
          }
          
          // 保存模型信息
          if (model) {
            messageData.model = model
          }

          const { data: assistantMessage, error: assistantError } =
            await supabase
              .from('messages')
              .insert(messageData)
              .select('id')
              .single()

          if (assistantError) {
            throw assistantError
          }

          assistantMessageId = assistantMessage?.id ?? null
        }

        await supabase
          .from('sessions')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', targetSessionId)

        controller.enqueue(
          encoder.encode(
            `event: complete\ndata: ${JSON.stringify({
              type: 'complete',
              sessionId: targetSessionId,
              messageId: assistantMessageId,
              reasoning: reasoningBuffer,
            })}\n\n`,
          ),
        )

        controller.close()
      } catch (error) {
        console.error('Edge Function error:', error)
        controller.enqueue(
          encoder.encode(
            `event: error\ndata: ${JSON.stringify({
              type: 'error',
              message: error?.message ?? 'Unknown error',
            })}\n\n`,
          ),
        )
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      ...corsHeaders,
    },
  })
})

