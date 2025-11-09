const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const functionBaseUrl =
  import.meta.env.VITE_SUPABASE_FUNCTION_URL ??
  (supabaseUrl ? `${supabaseUrl.replace(/\/$/, '')}/functions/v1` : '')
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export async function readDeepseekFile(fileId, options = {}) {
  if (!functionBaseUrl) {
    throw new Error('未配置 Supabase Function 地址')
  }

  const response = await fetch(`${functionBaseUrl}/read-file`, {
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
    body: JSON.stringify({
      fileId,
      range: options.range,
    }),
  })

  if (!response.ok) {
    const detail = await response.json().catch(() => ({}))
    throw new Error(detail?.error ?? '读取文件失败')
  }

  return response.json()
}

