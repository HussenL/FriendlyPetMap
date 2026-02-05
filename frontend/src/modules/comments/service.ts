import { apiGet, apiPost } from "../api/client";
import type { Comment } from "../../shared/types";

export function postComment(input: { incident_id: string; content: string }) {
  return apiPost<{ ok: boolean; comment: Comment }>("/comments", input);
}

export function listComments(incident_id: string) {
  return apiGet<{ incident_id: string; items: Comment[] }>(
    `/comments?incident_id=${encodeURIComponent(incident_id)}`
  );
}
