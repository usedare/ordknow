-- Materials: 原始素材表
-- 这是序知的“事实源”。用户输入的内容以 raw_content 原样保存，AI 解析和体系化都不能覆盖它。
CREATE TABLE materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text,
  raw_content text NOT NULL,
  source_type text DEFAULT 'manual',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'analyzing', 'analyzed', 'failed')),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- RLS: 用户只能访问自己的素材。服务端查询也会显式加 user_id 双重保护。
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own materials"
  ON materials FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own materials"
  ON materials FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own materials"
  ON materials FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own materials"
  ON materials FOR DELETE
  USING (auth.uid() = user_id);

-- Index for listing user materials by creation time
CREATE INDEX idx_materials_user_created ON materials (user_id, created_at DESC);

-- Auto-update updated_at on row modification
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_materials_updated_at
  BEFORE UPDATE ON materials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
