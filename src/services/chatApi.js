import { supabase } from './supabaseClient'

export async function listSessions() {
  const { data, error } = await supabase
    .from('sessions')
    .select('id, title, model, updated_at, created_at')
    .order('updated_at', { ascending: false })

  if (error) {
    throw error
  }

  return data ?? []
}

export async function listMessages(sessionId) {
  const { data, error } = await supabase
    .from('messages')
    .select('id, role, content, tokens, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (error) {
    throw error
  }

  return data ?? []
}

export async function createSession({ title, model } = {}) {
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      title: title ?? '新的对话',
      model: model ?? 'deepseek-chat',
    })
    .select('id, title, model, updated_at, created_at')
    .single()

  if (error) {
    throw error
  }

  return data
}

