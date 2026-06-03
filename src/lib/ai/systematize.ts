import { getAIClient } from "./client";
import { SYSTEMATIZE_SYSTEM_PROMPT, SYSTEMATIZE_USER_PROMPT } from "./prompts";
import { SystematizeResult } from "@/types";

export async function systematizeMaterials(materialsData: string, modelId?: string): Promise<SystematizeResult> {
  const { client, model } = getAIClient(modelId);

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
