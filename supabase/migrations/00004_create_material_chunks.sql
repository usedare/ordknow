-- Material Chunks: text chunks with embeddings for vector search
CREATE TABLE material_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid REFERENCES materials(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  chunk_index integer NOT NULL,
  content text NOT NULL,
  embedding vector(1024),
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE material_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chunks"
  ON material_chunks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chunks"
  ON material_chunks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own chunks"
  ON material_chunks FOR DELETE
  USING (auth.uid() = user_id);

-- Index for material lookup
CREATE INDEX idx_chunks_material ON material_chunks (material_id);

-- HNSW index for vector similarity search
CREATE INDEX idx_chunks_embedding ON material_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
