import { config } from "../../shared/config";
import { getConsoleToken } from "./auth";

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const token = getConsoleToken();
  if (!token) throw new Error("Missing console token");

  const headers: Record<string, string> = {
    "content-type": "application/json",
    authorization: `Bearer ${token}`,
  };

  const url = `${config.apiBase}${path.startsWith("/") ? "" : "/"}${path}`;

  const res = await fetch(url, { ...init, headers });
  const ct = res.headers.get("content-type") || "";
  const text = await res.text().catch(() => "");

  if (!res.ok) {
    console.error("[console api] HTTP error", { url, status: res.status, ct, text: text.slice(0, 300) });
    throw new Error(text || `HTTP ${res.status}`);
  }

  if (!ct.includes("application/json")) {
    console.error("[console api] Non-JSON response", { url, status: res.status, ct, text: text.slice(0, 300) });
    throw new Error(`Non-JSON response from ${url} (${ct})`);
  }

  return JSON.parse(text) as T;
}

export const consoleApiGet = <T,>(path: string) => request<T>(path, { method: "GET" });
export const consoleApiPut = <T,>(path: string, body: any) =>
  request<T>(path, { method: "PUT", body: JSON.stringify(body) });
export const consoleApiDelete = <T,>(path: string) => request<T>(path, { method: "DELETE" });