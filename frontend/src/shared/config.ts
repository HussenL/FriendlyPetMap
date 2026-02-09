// frontend/src/shared/config.ts

function normalizeUrl(v?: string, fallback = ""): string {
  if (!v) return fallback;
  return v.trim().replace(/\/+$/, "");
}

export const config = {
  // 后端 API
  apiBase: normalizeUrl(
    import.meta.env.VITE_API_BASE as string | undefined,
    "http://localhost:8000"
  ),

  // 抖音登录
  douyinClientKey: import.meta.env.VITE_DOUYIN_CLIENT_KEY as string,
  douyinRedirectUri: normalizeUrl(
    import.meta.env.VITE_DOUYIN_REDIRECT_URI as string | undefined
  ),

  // 地图 tiles
  tilesUrl: normalizeUrl(
    import.meta.env.VITE_TILES_URL as string | undefined
  ),
};
