import { apiGet } from "../api/client";
import type { Incident } from "../../shared/types";

export function listIncidents() {
  return apiGet<Incident[]>("/incidents");
}
