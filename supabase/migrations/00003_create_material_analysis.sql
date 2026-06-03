-- Material Analysis: AI parse results for each material
CREATE TABLE material_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid REFERENCES materials(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  core_meaning text,
  useful_points jsonb DEFAULT '[]'::jsonb,
  redundant_points jsonb DEFAULT '[]'::jsonb,
  topics jsonb DEFAULT '[]'::jsonb,
  knowledge_type text CHECK (knowledge_type IN ('concept', 'method', 'experience', 'case', 'question', 'idea', 'quote', 'summary', 'task')),
  keywords jsonb DEFAULT '[]'::jsonb,
  related_hints jsonb DEFAULT '[]'::jsonb,
  ai_model text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE material_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analysis"
  ON material_analysis FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analysis"
  ON material_analysis FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own analysis"
  ON material_analysis FOR DELETE
  USING (auth.uid() = user_id);

-- One analysis per material (latest)
CREATE INDEX idx_material_analysis_material ON material_analysis (material_id);
CREATE INDEX idx_material_analysis_user ON material_analysis (user_id);
