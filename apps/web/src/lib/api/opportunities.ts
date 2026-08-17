import { apiClient } from "../api-client";

export type OpportunityType = "CAREER" | "BUSINESS" | "EDUCATION";

export interface Opportunity {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: OpportunityType;
  deadline: string | null;
  externalApplyUrl: string;
}

export function listOpportunities(type?: OpportunityType): Promise<Opportunity[]> {
  return apiClient.get<Opportunity[]>(`/opportunities${type ? `?type=${type}` : ""}`);
}

export function getOpportunityBySlug(slug: string): Promise<Opportunity> {
  return apiClient.get<Opportunity>(`/opportunities/${slug}`);
}
