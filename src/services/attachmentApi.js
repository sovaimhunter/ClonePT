import { supabase } from './supabaseClient'

const defaultBucket = 'attachments'
const bucket =
  import.meta.env.VITE_SUPABASE_STORAGE_BUCKET?.trim() || defaultBucket

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export async function uploadAttachmentFile(file) {
  if (!file) {
    throw new Error('未选择文件')
  }

  const extension = file.name.split('.').pop()
  const fileName = `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}${extension ? `.${extension}` : ''}`

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadError) {
    throw uploadError
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(fileName)

  return {
    id: generateId(),
    path: fileName,
    url: publicUrl,
    name: file.name,
    size: file.size,
    type: file.type,
  }
}

