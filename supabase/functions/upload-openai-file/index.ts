import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
const openaiBaseUrl = Deno.env.get('OPENAI_BASE_URL') ?? 'https://api.openai.com/v1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization,apikey,content-type,x-client-info',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Max-Age': '86400',
}

if (!openaiApiKey) {
  console.warn('Missing OPENAI_API_KEY environment variable')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders })
  }

  try {
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const purpose = formData.get('purpose') as string || 'assistants'

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file uploaded' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    console.log(`Uploading file to OpenAI: ${file.name}, size: ${file.size}, purpose: ${purpose}`)

    // 上传文件到 OpenAI Files API
    const uploadFormData = new FormData()
    uploadFormData.append('file', file)
    uploadFormData.append('purpose', purpose)

    const response = await fetch(`${openaiBaseUrl.replace(/\/$/, '')}/files`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: uploadFormData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('OpenAI Files API error:', errorText)
      throw new Error(`OpenAI Files API error: ${response.status} ${errorText}`)
    }

    const fileData = await response.json()
    
    console.log(`File uploaded successfully: ${fileData.id}`)

    return new Response(
      JSON.stringify({
        message: 'File uploaded to OpenAI successfully',
        fileId: fileData.id,
        filename: fileData.filename,
        bytes: fileData.bytes,
        purpose: fileData.purpose,
        createdAt: fileData.created_at,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      },
    )
  } catch (error) {
    console.error('Error uploading file to OpenAI:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to upload file to OpenAI' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      },
    )
  }
})

