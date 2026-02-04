import { apiPost } from "../api/client";

export function postComment(input: { incident_id: string; content: string }) {
  return apiPost<{ ok: boolean; comment_id: string }>("/comments", input);
}
