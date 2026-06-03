import OpenAI from "openai";

export type AIProvider = "deepseek" | "mimo";

interface ProviderConfig {
  baseURL: string;
  apiKey: string;
  defaultModel: string;
}

const PROVIDERS: Record<AIProvider, ProviderConfig> = {
  deepseek: {
    baseURL: "https://api.deepseek.com",
    apiKey: process.env.DEEPSEEK_API_KEY || "",
    defaultModel: "deepseek-chat",
  },
  mimo: {
    baseURL: process.env.MIMO_BASE_URL || "https://token-plan-cn.xiaomimimo.com/v1",
    apiKey: process.env.MIMO_API_KEY || "",
    defaultModel: "mimo-v2.5",
  },
};

export interface ModelOption {
  id: string;
  name: string;
  provider: AIProvider;
  description: string;
  supportsMultimodal: boolean;
}

export const AVAILABLE_MODELS: ModelOption[] = [
  {
    id: "deepseek-chat",
    name: "DeepSeek Chat (V3)",
    provider: "deepseek",
    description: "快速、性价比高",
    supportsMultimodal: false,
  },
  {
    id: "deepseek-reasoner",
    name: "DeepSeek Reasoner (R1)",
    provider: "deepseek",
    description: "推理能力强，速度较慢",
    supportsMultimodal: false,
  },
  {
    id: "mimo-v2.5",
    name: "MiMo V2.5",
    provider: "mimo",
    description: "通用场景，支持多模态",
    supportsMultimodal: true,
  },
  {
    id: "mimo-v2.5-pro",
    name: "MiMo V2.5 Pro",
    provider: "mimo",
    description: "旗舰模型，多模态，推理能力强",
    supportsMultimodal: true,
  },
];

export function getAIClient(modelId?: string): { client: OpenAI; model: string } {
  const model = modelId || "deepseek-chat";
  const modelOption = AVAILABLE_MODELS.find((m) => m.id === model);
  const provider = modelOption?.provider || "deepseek";
  const config = PROVIDERS[provider];

  // Allow override via env vars (for user-provided keys)
  const apiKey =
    provider === "mimo"
      ? process.env.MIMO_API_KEY || config.apiKey
      : process.env.DEEPSEEK_API_KEY || config.apiKey;

  const client = new OpenAI({
    baseURL: config.baseURL,
    apiKey,
  });

  return { client, model };
}
