-- Knowledge Topics: hierarchical topic structure (level 1 = topic, level 2 = branch)
CREATE TABLE knowledge_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  parent_id uuid REFERENCES knowledge_topics(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  level integer NOT NULL CHECK (level IN (1, 2)),
  sort_order integer DEFAULT 0,
  version_id uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE knowledge_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own topics"
  ON knowledge_topics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own topics"
  ON knowledge_topics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own topics"
  ON knowledge_topics FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own topics"
  ON knowledge_topics FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_topics_user ON knowledge_topics (user_id);
CREATE INDEX idx_topics_parent ON knowledge_topics (parent_id);

-- Knowledge Nodes: individual knowledge entries
CREATE TABLE knowledge_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  topic_id uuid REFERENCES knowledge_topics(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  content text,
  summary text,
  sort_order integer DEFAULT 0,
  node_type text CHECK (node_type IN ('concept', 'method', 'experience', 'case', 'question', 'idea', 'summary')),
  version_id uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE knowledge_nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own nodes"
  ON knowledge_nodes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own nodes"
  ON knowledge_nodes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own nodes"
  ON knowledge_nodes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own nodes"
  ON knowledge_nodes FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_nodes_user ON knowledge_nodes (user_id);
CREATE INDEX idx_nodes_topic ON knowledge_nodes (topic_id);

-- Node Material Links: knowledge node ↔ source material references
CREATE TABLE node_material_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id uuid REFERENCES knowledge_nodes(id) ON DELETE CASCADE NOT NULL,
  material_id uuid REFERENCES materials(id) ON DELETE CASCADE NOT NULL,
  chunk_id uuid REFERENCES material_chunks(id) ON DELETE SET NULL,
  relevance_score numeric DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE node_material_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own links"
  ON node_material_links FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM knowledge_nodes
      WHERE knowledge_nodes.id = node_material_links.node_id
      AND knowledge_nodes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own links"
  ON node_material_links FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM knowledge_nodes
      WHERE knowledge_nodes.id = node_material_links.node_id
      AND knowledge_nodes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own links"
  ON node_material_links FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM knowledge_nodes
      WHERE knowledge_nodes.id = node_material_links.node_id
      AND knowledge_nodes.user_id = auth.uid()
    )
  );

CREATE INDEX idx_links_node ON node_material_links (node_id);
CREATE INDEX idx_links_material ON node_material_links (material_id);
