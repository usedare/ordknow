import OpenAI from "openai";

export function createEmbeddingClient() {
  return new OpenAI({
    baseURL: "https://api.siliconflow.cn/v1",
    apiKey: process.env.SILICONFLOW_API_KEY,
  });
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const client = createEmbeddingClient();

  const response = await client.embeddings.create({
    model: "BAAI/bge-m3",
    input: texts,
  });

  return response.data.map((item) => item.embedding);
}
