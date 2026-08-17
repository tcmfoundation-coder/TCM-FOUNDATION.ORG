import { apiClient } from "../api-client";

export interface FaqEntry {
  id: string;
  question: string;
  answer: string;
  category: string | null;
}

export function listFaq(): Promise<FaqEntry[]> {
  return apiClient.get<FaqEntry[]>("/faq");
}
