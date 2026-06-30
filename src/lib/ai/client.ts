/**
 * AI 模型客户端
 *
 * 这个文件的作用：统一管理 AI 模型（目前是 DeepSeek）的调用方式。
 * 其他地方需要调用 AI 时，只需调用 getAIClient() 即可，不用关心底层细节。
 *
 * 用户可以在设置页选择不同模型（如 DeepSeek V3 或 R1），
 * 也可以填写自己的 API Key 来覆盖系统默认 Key。
 */

import OpenAI from "openai";

// 当前支持的 AI 服务商
export type AIProvider = "deepseek";

// 用户可以在请求中临时覆盖 API Key（用于"自带 Key"场景）
export interface AIKeyOverrides {
  deepseek?: string;
}

// 每个 AI 服务商的连接信息
interface ProviderConfig {
  baseURL: string;   // API 地址
  apiKey: string;    // 认证密钥
  defaultModel: string; // 默认使用的模型名
}

// 已注册的 AI 服务商配置表
const PROVIDERS: Record<AIProvider, ProviderConfig> = {
  deepseek: {
    baseURL: "https://api.deepseek.com",
    apiKey: process.env.DEEPSEEK_API_KEY || "",
    defaultModel: "deepseek-chat",
  },
};

// 模型描述（用于设置页的模型选择器）
export interface ModelOption {
  id: string;              // 模型唯一标识
  name: string;            // 显示名称
  provider: AIProvider;    // 所属服务商
  description: string;     // 功能描述
  supportsMultimodal: boolean; // 是否支持识别图片
}

// 可供用户选择的模型列表
export const AVAILABLE_MODELS: ModelOption[] = [
  {
    id: "deepseek-chat",
    name: "DeepSeek Chat (V3)",
    provider: "deepseek",
    description: "快速、性价比高",
    supportsMultimodal: false, // DeepSeek 不支持图片识别
  },
  {
    id: "deepseek-reasoner",
    name: "DeepSeek Reasoner (R1)",
    provider: "deepseek",
    description: "推理能力强，速度较慢",
    supportsMultimodal: false,
  },
];

/**
 * 获取 AI 客户端
 *
 * 这是整个项目中调用 AI 的统一入口。
 * 根据用户选择的模型，返回对应的客户端和模型名称。
 *
 * 使用方式：
 *   const { client, model } = getAIClient("deepseek-chat");
 *   const result = await client.chat.completions.create({ model, messages: [...] });
 */
export function getAIClient(
  modelId?: string,
  keyOverrides: AIKeyOverrides = {}
): { client: OpenAI; model: string } {
  // 确定要使用的模型（默认 deepseek-chat）
  const model = modelId || "deepseek-chat";
  const modelOption = AVAILABLE_MODELS.find((m) => m.id === model);
  const provider = modelOption?.provider || "deepseek";
  const config = PROVIDERS[provider];

  // 优先使用用户自带的 Key，其次使用环境变量中的系统 Key
  const apiKey = keyOverrides.deepseek || process.env.DEEPSEEK_API_KEY || config.apiKey;

  if (!apiKey) {
    throw new Error("缺少 DeepSeek API Key，请在设置页填写或配置环境变量");
  }

  // 创建 OpenAI 兼容的客户端（DeepSeek 的 API 和 OpenAI 格式兼容）
  const client = new OpenAI({
    baseURL: config.baseURL,
    apiKey,
  });

  return { client, model };
}
