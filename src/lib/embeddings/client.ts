import OpenAI from "openai";

export function createEmbeddingClient(apiKeyOverride?: string) {
  const apiKey = apiKeyOverride || process.env.SILICONFLOW_API_KEY;

  if (!apiKey) {
    throw new Error("缺少 SiliconFlow API Key，无法生成素材向量");
  }

  return new OpenAI({
    baseURL: "https://api.siliconflow.cn/v1",
    apiKey,
  });
}

/**
 * 为素材分块生成向量。
 *
 * 当前数据库 migration 使用 vector(1024)，与 BAAI/bge-m3 的输出维度匹配。
 */
export async function generateEmbeddings(
  texts: string[],
  apiKeyOverride?: string
): Promise<number[][]> {
  const client = createEmbeddingClient(apiKeyOverride);

  const response = await client.embeddings.create({
    model: "BAAI/bge-m3",
    input: texts,
  });

  return response.data.map((item) => item.embedding);
}
