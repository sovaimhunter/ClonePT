-- 创建 attachments 存储桶
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', true)
ON CONFLICT (id) DO NOTHING;

-- 设置存储桶策略：允许所有人上传
CREATE POLICY "Allow public uploads"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'attachments');

-- 设置存储桶策略：允许所有人读取
CREATE POLICY "Allow public reads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'attachments');

-- 设置存储桶策略：允许所有人删除自己的文件
CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'attachments');

