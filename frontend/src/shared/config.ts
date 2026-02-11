// // frontend/src/shared/config.ts
// console.log("VITE_API_BASE =", import.meta.env.VITE_API_BASE);

// function normalizeUrl(v?: string, fallback = ""): string {
//   if (!v) return fallback;
//   return v.trim().replace(/\/+$/, "");
// }

// export const config = {
//   // 后端 API
//   apiBase: normalizeUrl(
//     import.meta.env.VITE_API_BASE as string | undefined,
//     "http://localhost:8000"
//   ),

//   // 抖音登录
//   douyinClientKey: import.meta.env.VITE_DOUYIN_CLIENT_KEY as string,
//   douyinRedirectUri: normalizeUrl(
//     import.meta.env.VITE_DOUYIN_REDIRECT_URI as string | undefined
//   ),

//   // 地图 tiles
//   tilesUrl: normalizeUrl(
//     import.meta.env.VITE_TILES_URL as string | undefined
//   ),

//   // PMTiles URL
//   pmtilesUrl: import.meta.env.VITE_PMTILES_URL as string,

// };


function normalizeUrl(v?: string, fallback = ""): string {
  if (!v) return fallback;
  return v.trim().replace(/\/+$/, "");
}

function required(name: string, v?: string): string {
  const val = (v ?? "").trim();
  if (!val) {
    // 线上不要白屏：给出明确错误
    throw new Error(`[config] Missing env: ${name}`);
  }
  return val;
}

export const config = {
  // 后端 API
  apiBase: normalizeUrl(
    import.meta.env.VITE_API_BASE as string | undefined,
    "http://localhost:8000"
  ),

  // 抖音登录
  douyinClientKey: required(
    "VITE_DOUYIN_CLIENT_KEY",
    import.meta.env.VITE_DOUYIN_CLIENT_KEY as string | undefined
  ),

  // ⚠️ 这里要注意：你的前端部署在 /fpm 下，所以 redirect 必须是 https://metark.ai/fpm/auth/callback（线上）
  douyinRedirectUri: normalizeUrl(
    required(
      "VITE_DOUYIN_REDIRECT_URI",
      import.meta.env.VITE_DOUYIN_REDIRECT_URI as string | undefined
    )
  ),

  // raster tiles（你现在不用可以为空）
  tilesUrl: normalizeUrl(import.meta.env.VITE_TILES_URL as string | undefined, ""),

  // PMTiles：推荐走 CloudFront 的 /tiles 前缀（别直连 S3）
  pmtilesUrl: normalizeUrl(
    required(
      "VITE_PMTILES_URL",
      import.meta.env.VITE_PMTILES_URL as string | undefined
    )
  ),
};

// 只在开发打印，避免线上控制台污染
if (import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  console.log("[config]", config);
}
