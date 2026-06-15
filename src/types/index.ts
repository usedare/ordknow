// 素材层：保留用户原始输入和 AI 单条解析状态。
export type MaterialStatus = "pending" | "analyzing" | "analyzed" | "failed";
export type SourceType = "manual" | "paste" | "ocr" | "audio_transcript" | "imported_doc" | "qa";
export type KnowledgeType = "concept" | "method" | "experience" | "case" | "question" | "idea" | "quote" | "summary" | "task";
export type NodeType = "concept" | "method" | "experience" | "case" | "question" | "idea" | "summary";
export type JobStatus = "queued" | "running" | "completed" | "failed";

export interface Material {
  id: string;
  user_id: string;
  title: string | null;
  raw_content: string;
  source_type: SourceType;
  status: MaterialStatus;
  created_at: string;
  updated_at: string;
}

export interface MaterialAnalysis {
  id: string;
  material_id: string;
  user_id: string;
  core_meaning: string | null;
  useful_points: string[];
  redundant_points: string[];
  topics: string[];
  knowledge_type: KnowledgeType | null;
  keywords: string[];
  related_hints: string[];
  ai_model: string | null;
  created_at: string;
}

export interface MaterialChunk {
  id: string;
  material_id: string;
  user_id: string;
  chunk_index: number;
  content: string;
  embedding?: number[];
  created_at: string;
}

// 知识网络层：AI 把素材编译成主题、节点和节点关系。
export interface KnowledgeTopic {
  id: string;
  user_id: string;
  parent_id: string | null;
  title: string;
  description: string | null;
  level: 1 | 2;
  sort_order: number;
  version_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeNode {
  id: string;
  user_id: string;
  topic_id: string;
  title: string;
  content: string | null;
  summary: string | null;
  sort_order: number;
  node_type: NodeType | null;
  version_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface NodeMaterialLink {
  id: string;
  node_id: string;
  material_id: string;
  chunk_id: string | null;
  relevance_score: number;
  created_at: string;
}

export type EdgeType = "related" | "prerequisite" | "supports" | "contradicts" | "extends" | "example_of" | "part_of" | "duplicate";

export interface KnowledgeEdge {
  id: string;
  user_id: string;
  source_node_id: string;
  target_node_id: string;
  edge_type: EdgeType;
  description: string | null;
  confidence: number;
  created_at: string;
  updated_at: string;
}

// 重构任务和版本：每次“一键体系化”都生成一个可追溯版本。
export interface ReconstructionJob {
  id: string;
  user_id: string;
  status: JobStatus;
  scope: string;
  input_material_ids: string[];
  started_at: string | null;
  finished_at: string | null;
  error_message: string | null;
  created_at: string;
}

export interface KnowledgeVersion {
  id: string;
  user_id: string;
  job_id: string | null;
  version_number: number;
  snapshot: SystematizeResult;
  summary: string | null;
  created_at: string;
}

// AI 输出结构：和 prompt 约束保持一致，便于落库和前端展示。
export interface MaterialAnalysisResult {
  core_meaning: string;
  useful_points: string[];
  redundant_points: string[];
  topics: string[];
  knowledge_type: KnowledgeType;
  keywords: string[];
  related_hints: string[];
}

export interface SystematizeResult {
  system_title: string;
  summary: string;
  topics: Array<{
    title: string;
    description: string;
    children: Array<{
      title: string;
      description: string;
      nodes: Array<{
        title: string;
        content: string;
        source_material_ids: string[];
        node_type: string;
      }>;
    }>;
  }>;
}
