import { apiClient } from "../api-client";

export interface ImpactStat {
  id: string;
  label: string;
  value: number;
}

export function listImpactStats(): Promise<ImpactStat[]> {
  return apiClient.get<ImpactStat[]>("/impact-stats");
}
