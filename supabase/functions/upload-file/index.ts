import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

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

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const sessionId = formData.get('sessionId') as string
    const uploadType = formData.get('type') as string // 'vision' | 'openai-file'

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    // 1. 上传到 Supabase Storage
    const fileName = `${Date.now()}_${file.name}`
    const filePath = sessionId ? `${sessionId}/${fileName}` : fileName

    const { data: storageData, error: storageError } = await supabase.storage
      .from('attachments')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      })

    if (storageError) {
      throw storageError
    }

    // 2. 获取公开 URL
    const { data: urlData } = supabase.storage
      .from('attachments')
      .getPublicUrl(filePath)

    const publicUrl = urlData.publicUrl

    // 3. 如果是图片，直接返回 URL（用于 vision）
    if (uploadType === 'vision' || file.type.startsWith('image/')) {
      return new Response(
        JSON.stringify({
          type: 'vision',
          url: publicUrl,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          storagePath: filePath,
        }),
        {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        },
      )
    }

    // 4. 如果需要上传到 OpenAI Files API（用于 Assistants）
    if (uploadType === 'openai-file' && openaiApiKey) {
      const fileBuffer = await file.arrayBuffer()
      const fileBlob = new Blob([fileBuffer], { type: file.type })

      const openaiFormData = new FormData()
      openaiFormData.append('file', fileBlob, file.name)
      openaiFormData.append('purpose', 'assistants')

      const openaiResponse = await fetch(
        `${openaiBaseUrl.replace(/\/$/, '')}/files`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openaiApiKey}`,
          },
          body: openaiFormData,
        },
      )

      if (!openaiResponse.ok) {
        const errorText = await openaiResponse.text()
        throw new Error(`OpenAI file upload failed: ${errorText}`)
      }

      const openaiFileData = await openaiResponse.json()

      return new Response(
        JSON.stringify({
          type: 'openai-file',
          fileId: openaiFileData.id,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          url: publicUrl,
          storagePath: filePath,
          openaiData: openaiFileData,
        }),
        {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        },
      )
    }

    // 5. 默认只上传到 Supabase
    return new Response(
      JSON.stringify({
        type: 'attachment',
        url: publicUrl,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        storagePath: filePath,
      }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      },
    )
  } catch (error) {
    console.error('File upload error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'File upload failed' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      },
    )
  }
})

