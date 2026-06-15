"use client";

/**
 * 从浏览器本地配置中组装 AI 请求头。
 *
 * 说明：
 * - 用户在设置页填写的 Key 只保存在 localStorage。
 * - 发起 AI 请求时临时带到本项目后端，由后端转发给模型服务。
 * - 后端不会持久化这些 Key；生产环境必须通过 HTTPS 部署，避免请求头泄露。
 */
export function getAIRequestHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const deepseekKey = localStorage.getItem("ordknow_deepseek_key");
  const mimoKey = localStorage.getItem("ordknow_mimo_key");
  const siliconflowKey = localStorage.getItem("ordknow_siliconflow_key");

  if (deepseekKey) headers["x-ordknow-deepseek-key"] = deepseekKey;
  if (mimoKey) headers["x-ordknow-mimo-key"] = mimoKey;
  if (siliconflowKey) headers["x-ordknow-siliconflow-key"] = siliconflowKey;

  return headers;
}

