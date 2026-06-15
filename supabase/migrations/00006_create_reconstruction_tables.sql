-- Reconstruction Jobs: 体系化任务记录
-- 用户点击“一键体系化”时创建 job，用来记录任务状态、输入素材和失败原因。
CREATE TABLE reconstruction_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  scope text DEFAULT 'full',
  input_material_ids jsonb DEFAULT '[]'::jsonb,
  started_at timestamptz,
  finished_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE reconstruction_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own jobs"
  ON reconstruction_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own jobs"
  ON reconstruction_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own jobs"
  ON reconstruction_jobs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX idx_jobs_user ON reconstruction_jobs (user_id, created_at DESC);

-- Knowledge Versions: 每次体系化的快照
-- snapshot 保存模型输出的完整 JSON，方便历史回看、差异比较和未来回滚。
CREATE TABLE knowledge_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  job_id uuid REFERENCES reconstruction_jobs(id) ON DELETE SET NULL,
  version_number integer NOT NULL,
  snapshot jsonb NOT NULL,
  summary text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE knowledge_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own versions"
  ON knowledge_versions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own versions"
  ON knowledge_versions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_versions_user ON knowledge_versions (user_id, version_number DESC);
