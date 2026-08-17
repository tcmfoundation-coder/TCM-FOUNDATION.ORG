import { apiClient } from "../api-client";

export interface ContactSubmissionInput {
  name: string;
  email: string;
  phone?: string;
  organization?: string;
  subject: string;
  message: string;
}

export function submitContactForm(input: ContactSubmissionInput): Promise<{ success: true }> {
  return apiClient.post<{ success: true }>("/contact", input);
}
