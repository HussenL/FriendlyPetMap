import { config } from "../../shared/config";
import { getAppToken } from "../auth";

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const token = getAppToken();

  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (token) headers.authorization = `Bearer ${token}`;

  const url = `${config.apiBase}${path.startsWith("/") ? "" : "/"}${path}`;

  const res = await fetch(url, { ...init, headers });
  const ct = res.headers.get("content-type") || "";

  // 先读文本：便于定位 HTML / 代理错误页
  const text = await res.text().catch(() => "");

  if (!res.ok) {
    console.error("[api] HTTP error", { url, status: res.status, ct, text: text.slice(0, 300) });
    throw new Error(text || `HTTP ${res.status}`);
  }

  // 关键：不是 JSON 就直接报错，并打印内容（你现在的问题一眼就能看出来）
  if (!ct.includes("application/json")) {
    console.error("[api] Non-JSON response", { url, status: res.status, ct, text: text.slice(0, 300) });
    throw new Error(`Non-JSON response from ${url} (${ct})`);
  }

  return JSON.parse(text) as T;
}

export const apiGet = <T,>(path: string) => request<T>(path, { method: "GET" });
export const apiPost = <T,>(path: string, body: any) =>
  request<T>(path, { method: "POST", body: JSON.stringify(body) });
