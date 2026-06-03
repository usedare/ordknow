-- Knowledge Edges: relationships between knowledge nodes
CREATE TABLE knowledge_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  source_node_id uuid REFERENCES knowledge_nodes(id) ON DELETE CASCADE NOT NULL,
  target_node_id uuid REFERENCES knowledge_nodes(id) ON DELETE CASCADE NOT NULL,
  edge_type text NOT NULL CHECK (edge_type IN ('related', 'prerequisite', 'supports', 'contradicts', 'extends', 'example_of', 'part_of', 'duplicate')),
  description text,
  confidence numeric DEFAULT 1.0,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE knowledge_edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own edges"
  ON knowledge_edges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own edges"
  ON knowledge_edges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own edges"
  ON knowledge_edges FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own edges"
  ON knowledge_edges FOR DELETE
  USING (auth.uid() = user_id);

-- Prevent duplicate edges
CREATE UNIQUE INDEX idx_edges_unique ON knowledge_edges (source_node_id, target_node_id, edge_type);

-- Index for querying edges by node
CREATE INDEX idx_edges_source ON knowledge_edges (source_node_id);
CREATE INDEX idx_edges_target ON knowledge_edges (target_node_id);
CREATE INDEX idx_edges_user ON knowledge_edges (user_id);
