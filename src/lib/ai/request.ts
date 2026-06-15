import { NextRequest } from "next/server";
import { AIKeyOverrides } from "./client";

/**
 * 从请求头中读取前端临时传入的 AI Key。
 *
 * 这里不信任客户端身份，只把 Key 当作“当前用户主动提供的模型凭证”。
 * 数据权限仍然由 Supabase 会话和 RLS 控制。
 */
export function getAIKeyOverrides(request: NextRequest): AIKeyOverrides {
  return {
    deepseek: request.headers.get("x-ordknow-deepseek-key") || undefined,
    mimo: request.headers.get("x-ordknow-mimo-key") || undefined,
  };
}

export function getEmbeddingKeyOverride(request: NextRequest): string | undefined {
  return request.headers.get("x-ordknow-siliconflow-key") || undefined;
}

