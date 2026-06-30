/**
 * 单条素材解析
 *
 * 这个文件的作用：把用户输入的原始文本发送给 AI，让 AI"读懂"这段内容，
 * 提取出核心含义、主题、关键词等信息，返回一个结构化的结果。
 *
 * 解析结果会存入 material_analysis 表，作为后续"一键体系化"的输入。
 *
 * 流程：
 *   原始文本 → AI 分析 → 结构化 JSON（核心含义/主题/关键词等）
 */

import { getAIClient } from "./client";
import { MATERIAL_ANALYSIS_SYSTEM_PROMPT, MATERIAL_ANALYSIS_USER_PROMPT } from "./prompts";
import { MaterialAnalysisResult } from "@/types";
import { AIKeyOverrides } from "./client";

/**
 * 分析一条原始素材
 *
 * @param rawContent - 用户输入的原始文本
 * @param modelId     - 使用的 AI 模型（如 "deepseek-chat"）
 * @param keyOverrides - 用户自带的 API Key（可选）
 * @returns AI 解析结果，包含核心含义、主题、关键词等
 *
 * 使用方式：
 *   const result = await analyzeMaterial("人工智能是...");
 *   console.log(result.core_meaning);  // "人工智能是计算机科学分支..."
 */
export async function analyzeMaterial(
  rawContent: string,
  modelId?: string,
  keyOverrides?: AIKeyOverrides
): Promise<MaterialAnalysisResult> {
  // 获取 AI 客户端
  const { client, model } = getAIClient(modelId, keyOverrides);

  // 调用 AI，让 AI"读懂"这段文本
  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: MATERIAL_ANALYSIS_SYSTEM_PROMPT },
      { role: "user", content: MATERIAL_ANALYSIS_USER_PROMPT(rawContent) },
    ],
    // 要求 AI 返回 JSON 格式，方便程序解析
    response_format: { type: "json_object" },
    // temperature 控制"创造力"：越低越稳定，越高越随机
    temperature: 0.3,
  });

  // 提取 AI 的回复内容
  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("AI 没有返回内容");
  }

  // 把 AI 返回的 JSON 字符串解析为程序可读的对象
  const result = JSON.parse(content) as MaterialAnalysisResult;

  // 检查必要字段是否存在
  if (!result.core_meaning || !result.knowledge_type) {
    throw new Error("AI 返回的结果缺少必要字段");
  }

  return result;
}
