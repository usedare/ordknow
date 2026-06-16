/**
 * 浏览器端 fetch 超时工具。
 *
 * 序知的部分页面会同时请求素材、知识节点和关系数据。
 * 如果其中一个请求长期没有返回，React 状态就会一直停在“加载中”。
 * 这里用 AbortController 给请求加上上限，让页面能进入空态或错误提示。
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 15000,
) {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}
