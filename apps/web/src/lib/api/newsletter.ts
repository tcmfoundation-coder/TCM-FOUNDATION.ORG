import { apiClient } from "../api-client";

export function subscribeToNewsletter(email: string): Promise<{ alreadySubscribed: boolean }> {
  return apiClient.post<{ alreadySubscribed: boolean }>("/newsletter/subscribe", { email });
}
