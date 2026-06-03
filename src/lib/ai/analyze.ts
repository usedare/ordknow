import { getAIClient } from "./client";
import { MATERIAL_ANALYSIS_SYSTEM_PROMPT, MATERIAL_ANALYSIS_USER_PROMPT } from "./prompts";
import { MaterialAnalysisResult } from "@/types";

export async function analyzeMaterial(rawContent: string, modelId?: string): Promise<MaterialAnalysisResult> {
  const { client, model } = getAIClient(modelId);

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: MATERIAL_ANALYSIS_SYSTEM_PROMPT },
      { role: "user", content: MATERIAL_ANALYSIS_USER_PROMPT(rawContent) },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from AI");
  }

  const result = JSON.parse(content) as MaterialAnalysisResult;

  // Validate required fields
  if (!result.core_meaning || !result.knowledge_type) {
    throw new Error("Invalid AI response: missing required fields");
  }

  return result;
}
