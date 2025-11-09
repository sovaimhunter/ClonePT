import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY')
const deepseekBaseUrl = Deno.env.get('DEEPSEEK_BASE_URL') ?? 'https://api.deepseek.com'
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

  let payload: { sessionId?: number; message?: string; model?: string } = {}

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

  const { sessionId, message, model = 'deepseek-chat' } = payload

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

        const { error: insertUserMessageError } = await supabase
          .from('messages')
          .insert({
            session_id: targetSessionId,
            role: 'user',
            content: message,
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

        const deepseekRequestBody = {
          model,
          stream: true,
          messages: historyMessages,
        }

        const response = await fetch(
          `${deepseekBaseUrl.replace(/\/$/, '')}/chat/completions`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${deepseekApiKey}`,
            },
            body: JSON.stringify(deepseekRequestBody),
          },
        )

        if (!response.ok || !response.body) {
          const errorText = await response.text()
          throw new Error(
            `DeepSeek API error: ${response.status} ${errorText}`,
          )
        }

        const reader = response.body.getReader()
        let assistantBuffer = ''
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
              const delta = data?.choices?.[0]?.delta?.content
              if (delta) {
                assistantBuffer += delta
                controller.enqueue(
                  encoder.encode(
                    `event: delta\ndata: ${JSON.stringify({
                      type: 'delta',
                      content: delta,
                    })}\n\n`,
                  ),
                )
              }
            } catch (_parseErr) {
              // 非 JSON，直接透传文本
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
          const { data: assistantMessage, error: assistantError } =
            await supabase
              .from('messages')
              .insert({
                session_id: targetSessionId,
                role: 'assistant',
                content: assistantBuffer,
              })
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

