import React, { useEffect, useState } from "react";
import { config } from "../../shared/config";
import { apiPost } from "../api/client";
import { setAppToken } from "./index";
import type { AppAuthResponse } from "../../shared/types";

export function CallbackPage() {
  const [msg, setMsg] = useState("登录处理中…");

  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const expected = sessionStorage.getItem("douyin_oauth_state");

    if (!code) return setMsg("缺少 code，登录失败");
    if (!state || !expected || state !== expected) return setMsg("state 校验失败");

    (async () => {
      try {
        const res = await apiPost<AppAuthResponse>("/auth/douyin/callback", {
          code,
          redirect_uri: config.douyinRedirectUri,
        });
        setAppToken(res.app_token);
        window.location.replace("/");
      } catch (e: any) {
        setMsg(e?.message ?? "登录失败");
      }
    })();
  }, []);

  return <div style={{ padding: 16 }}>{msg}</div>;
}
