import { config } from "../../shared/config";
import { getAppToken } from "../auth";

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const token = getAppToken();

  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (token) headers.authorization = `Bearer ${token}`;

  const res = await fetch(`${config.apiBase}${path}`, { ...init, headers });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }

  // FastAPI 默认返回 JSON
  return (await res.json()) as T;
}

export const apiGet = <T,>(path: string) => request<T>(path, { method: "GET" });
export const apiPost = <T,>(path: string, body: any) =>
  request<T>(path, { method: "POST", body: JSON.stringify(body) });
