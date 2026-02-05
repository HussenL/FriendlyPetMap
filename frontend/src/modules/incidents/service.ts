import { apiGet, apiPost } from "../api/client";
import type { Incident } from "../../shared/types";

export function listIncidents() {
  return apiGet<Incident[]>("/incidents");
}

export function createIncident(input: { lng: number; lat: number; title: string }) {
  return apiPost<{ incident: Incident }>("/incidents", input);
}
