import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY')
const deepseekBaseUrl = Deno.env.get('DEEPSEEK_BASE_URL') ?? 'https://api.deepseek.com'

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

  if (!deepseekApiKey) {
    return new Response(
      JSON.stringify({ error: 'DEEPSEEK_API_KEY 未配置' }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    )
  }

  let payload: { fileId?: string; range?: string } = {}

  try {
    payload = await req.json()
  } catch (_error) {
    return new Response(
      JSON.stringify({ error: '请求体必须为 JSON' }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    )
  }

  const { fileId, range } = payload

  if (!fileId || typeof fileId !== 'string') {
    return new Response(
      JSON.stringify({ error: '缺少 fileId 参数' }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    )
  }

  try {
    const url = `${deepseekBaseUrl.replace(/\/$/, '')}/v1/files/read/${fileId}`
    const headers: Record<string, string> = {
      Authorization: `Bearer ${deepseekApiKey}`,
      Accept: 'application/octet-stream',
    }

    if (range) {
      headers.Range = range
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
    })

    if (!response.ok) {
      const errorText = await response.text()
      return new Response(
        JSON.stringify({
          error: '读取文件失败',
          status: response.status,
          detail: errorText,
        }),
        {
          status: response.status,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      )
    }

    const arrayBuffer = await response.arrayBuffer()

    const contentType =
      response.headers.get('Content-Type') ?? 'application/octet-stream'
    const contentLength = response.headers.get('Content-Length') ?? null

    let text: string | null = null
    try {
      text = new TextDecoder('utf-8', { fatal: false }).decode(
        new Uint8Array(arrayBuffer),
      )
    } catch (_decodeError) {
      text = null
    }

    const base64 = btoa(
      Array.from(new Uint8Array(arrayBuffer))
        .map((byte) => String.fromCharCode(byte))
        .join(''),
    )

    return new Response(
      JSON.stringify({
        fileId,
        contentType,
        contentLength,
        base64,
        text,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    )
  } catch (error) {
    console.error('读取 DeepSeek 文件失败:', error)
    return new Response(
      JSON.stringify({
        error: '读取 DeepSeek 文件失败',
        detail: error?.message ?? 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    )
  }
})

