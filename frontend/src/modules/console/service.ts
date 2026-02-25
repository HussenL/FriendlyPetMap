import type { Incident, Comment } from "../../shared/types";
import { consoleApiDelete, consoleApiGet, consoleApiPut } from "./apiClient";

export type Paged<T> = { items: T[]; total: number; page: number; page_size: number };

export type ConsoleCommentRow = Comment & {
  incident_lng: number;
  incident_lat: number;
  incident_title: string;
};

function qp(params: Record<string, any>) {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    u.set(k, String(v));
  }
  const s = u.toString();
  return s ? `?${s}` : "";
}

export function consoleListIncidents(input: {
  lat_min?: number;
  lat_max?: number;
  lng_min?: number;
  lng_max?: number;
  start?: string;
  end?: string;
  q?: string;
  page: number;
  page_size: number;
}) {
  return consoleApiGet<Paged<Incident>>(`/console/incidents${qp(input)}`);
}

export function consoleUpdateIncident(incident_id: string, body: { title: string }) {
  return consoleApiPut<{ ok: true; incident: Incident }>(`/console/incidents/${incident_id}`, body);
}

export function consoleDeleteIncident(incident_id: string) {
  return consoleApiDelete<{ ok: true }>(`/console/incidents/${incident_id}`);
}

export function consoleListComments(input: {
  lat_min?: number;
  lat_max?: number;
  lng_min?: number;
  lng_max?: number;
  start?: string;
  end?: string;
  q?: string;
  page: number;
  page_size: number;
}) {
  return consoleApiGet<Paged<ConsoleCommentRow>>(`/console/comments${qp(input)}`);
}

export function consoleUpdateComment(input: { incident_id: string; created_at: string; content: string }) {
  const { incident_id, created_at, content } = input;
  return consoleApiPut<{ ok: true }>(`/console/comments`, { incident_id, created_at, content });
}

export function consoleDeleteComment(input: { incident_id: string; created_at: string }) {
  const { incident_id, created_at } = input;
  return consoleApiDelete<{ ok: true }>(`/console/comments${qp({ incident_id, created_at })}`);
}