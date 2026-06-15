import OpenAI from "openai";

export type AIProvider = "deepseek" | "mimo";

export interface AIKeyOverrides {
  deepseek?: string;
  mimo?: string;
}

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

/**
 * 创建兼容 OpenAI SDK 的模型客户端。
 *
 * 模型供应商由 modelId 决定：
 * - DeepSeek 使用 DEEPSEEK_API_KEY 或请求头里的用户 Key。
 * - MiMo 使用 MIMO_API_KEY 或请求头里的用户 Key。
 *
 * 注意：用户 Key 只用于当前服务端请求，不写入数据库。
 */
export function getAIClient(
  modelId?: string,
  keyOverrides: AIKeyOverrides = {}
): { client: OpenAI; model: string } {
  const model = modelId || "deepseek-chat";
  const modelOption = AVAILABLE_MODELS.find((m) => m.id === model);
  const provider = modelOption?.provider || "deepseek";
  const config = PROVIDERS[provider];

  // 环境变量是默认系统 Key；请求头覆盖值用于“用户自带 Key”的单次调用。
  const apiKey =
    provider === "mimo"
      ? keyOverrides.mimo || process.env.MIMO_API_KEY || config.apiKey
      : keyOverrides.deepseek || process.env.DEEPSEEK_API_KEY || config.apiKey;

  if (!apiKey) {
    throw new Error(`缺少 ${provider === "mimo" ? "MiMo" : "DeepSeek"} API Key，请在设置页填写或配置环境变量`);
  }

  const client = new OpenAI({
    baseURL: config.baseURL,
    apiKey,
  });

  return { client, model };
}
