import { getAIClient } from "./client";
import { SYSTEMATIZE_SYSTEM_PROMPT, SYSTEMATIZE_USER_PROMPT } from "./prompts";
import { SystematizeResult } from "@/types";
import { AIKeyOverrides } from "./client";

/**
 * 全库体系化重构。
 *
 * 输入是“原始素材 + 单条解析结果”的文本包，输出是可落库的主题树 JSON。
 */
export async function systematizeMaterials(
  materialsData: string,
  modelId?: string,
  keyOverrides?: AIKeyOverrides
): Promise<SystematizeResult> {
  const { client, model } = getAIClient(modelId, keyOverrides);

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: SYSTEMATIZE_SYSTEM_PROMPT },
      { role: "user", content: SYSTEMATIZE_USER_PROMPT(materialsData) },
    ],
    response_format: { type: "json_object" },
    temperature: 0.5,
    max_tokens: 8000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from AI");
  }

  const result = JSON.parse(content) as SystematizeResult;

  // Validate required fields
  if (!result.system_title || !result.topics || !Array.isArray(result.topics)) {
    throw new Error("Invalid systematize response: missing required fields");
  }

  return result;
}
