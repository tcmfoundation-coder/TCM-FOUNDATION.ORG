import { apiClient } from "../api-client";

export interface Partner {
  id: string;
  name: string;
  websiteUrl: string | null;
}

export function listPartners(): Promise<Partner[]> {
  return apiClient.get<Partner[]>("/partners");
}
