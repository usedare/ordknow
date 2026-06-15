const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 50;

/**
 * 将长素材切成适合 embedding 的短文本块。
 *
 * 为什么要切块：
 * - 长文本直接生成一个向量会丢失局部语义。
 * - 后续语义搜索需要命中具体片段，而不是整篇素材。
 * - overlap 可以减少切分边界导致的上下文断裂。
 */
export function chunkText(text: string): string[] {
  if (!text || text.trim().length === 0) return [];

  // 短文本无需切块，直接作为一个 chunk。
  if (text.length <= CHUNK_SIZE) {
    return [text.trim()];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + CHUNK_SIZE;

    // 优先在段落边界切分，尽量保持每个 chunk 语义完整。
    if (end < text.length) {
      const lastNewline = text.lastIndexOf("\n", end);
      if (lastNewline > start + CHUNK_SIZE * 0.5) {
        end = lastNewline;
      }
    } else {
      end = text.length;
    }

    const chunk = text.slice(start, end).trim();
    if (chunk) {
      chunks.push(chunk);
    }

    // 带 overlap 前进，保证相邻 chunk 在边界处保留少量共同上下文。
    start = end - CHUNK_OVERLAP;
    if (start >= text.length) break;
  }

  return chunks;
}
