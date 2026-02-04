const KEY = "app_token";

export function getAppToken(): string | null {
  return localStorage.getItem(KEY);
}
export function setAppToken(token: string) {
  localStorage.setItem(KEY, token);
}
export function clearAppToken() {
  localStorage.removeItem(KEY);
}
