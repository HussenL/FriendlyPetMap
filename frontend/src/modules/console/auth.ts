const KEY = "console_token";

export function getConsoleToken(): string | null {
  return sessionStorage.getItem(KEY);
}

export function setConsoleToken(token: string) {
  sessionStorage.setItem(KEY, token);
}

export function clearConsoleToken() {
  sessionStorage.removeItem(KEY);
}