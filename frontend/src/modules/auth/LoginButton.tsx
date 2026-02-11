import { config } from "../../shared/config";

function genState() {
  const s = crypto.getRandomValues(new Uint32Array(4)).join("-");
  sessionStorage.setItem("douyin_oauth_state", s);
  return s;
}

export function LoginButton() {
  const onClick = () => {
    const u = new URL("https://open.douyin.com/platform/oauth/connect/");
    u.searchParams.set("client_key", config.douyinClientKey);
    u.searchParams.set("redirect_uri", config.douyinRedirectUri);
    u.searchParams.set("response_type", "code");
    u.searchParams.set("scope", "user_info");
    u.searchParams.set("state", genState());
    window.location.href = u.toString();
  };

  return <button onClick={onClick}>使用抖音登录</button>;
}
