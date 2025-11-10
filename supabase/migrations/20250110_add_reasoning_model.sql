-- 为 messages 表添加 reasoning 和 model 字段
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS reasoning TEXT,
ADD COLUMN IF NOT EXISTS model TEXT,
ADD COLUMN IF NOT EXISTS attachments JSONB;

-- 为 sessions 表添加 model 字段（如果还没有）
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS model TEXT DEFAULT 'deepseek-chat';

-- 添加索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_messages_model ON messages(model);
CREATE INDEX IF NOT EXISTS idx_sessions_model ON sessions(model);
CREATE INDEX IF NOT EXISTS idx_messages_attachments ON messages USING GIN(attachments);

