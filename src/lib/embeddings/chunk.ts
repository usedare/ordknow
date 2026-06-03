const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 50;

export function chunkText(text: string): string[] {
  if (!text || text.trim().length === 0) return [];

  // If short enough, return as single chunk
  if (text.length <= CHUNK_SIZE) {
    return [text.trim()];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + CHUNK_SIZE;

    // Try to break at paragraph boundary
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

    // Move start forward with overlap
    start = end - CHUNK_OVERLAP;
    if (start >= text.length) break;
  }

  return chunks;
}
