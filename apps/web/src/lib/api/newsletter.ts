import { apiClient } from "../api-client";

export function subscribeToNewsletter(
  email: string,
  turnstileToken?: string | null,
): Promise<{ alreadySubscribed: boolean }> {
  return apiClient.post<{ alreadySubscribed: boolean }>("/newsletter/subscribe", {
    email,
    // Omitted rather than sent as null when the challenge isn't configured —
    // the API skips verification in that case and rejects unknown fields.
    ...(turnstileToken ? { turnstileToken } : {}),
  });
}

// Endpoint: POST /newsletter/unsubscribe
// Authentication: None — the token from the emailed link is the credential.
// Errors: 400 (malformed token), 404 (unknown token)
export function unsubscribeFromNewsletter(token: string): Promise<{ email: string }> {
  return apiClient.post<{ email: string }>("/newsletter/unsubscribe", { token });
}

export type NewsletterSubscriberStatus = "SUBSCRIBED" | "UNSUBSCRIBED";

export interface NewsletterSubscriber {
  id: string;
  email: string;
  status: NewsletterSubscriberStatus;
  subscribedAt: string;
  unsubscribedAt: string | null;
}

export interface NewsletterSubscriberListResponse {
  items: NewsletterSubscriber[];
  /** Every row, including people who have unsubscribed. */
  total: number;
  /** Rows still SUBSCRIBED — the number actually reachable. */
  subscribedCount: number;
  skip: number;
  take: number;
}

// Endpoint: GET /newsletter/subscribers
// Authentication: Required
// Required role: ADMINISTRATOR or higher (subscriber addresses are personal data)
export function listNewsletterSubscribers(params?: {
  skip?: number;
  take?: number;
}): Promise<NewsletterSubscriberListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.skip) searchParams.append("skip", params.skip.toString());
  if (params?.take) searchParams.append("take", params.take.toString());
  const query = searchParams.toString();
  return apiClient.get<NewsletterSubscriberListResponse>(
    `/newsletter/subscribers${query ? `?${query}` : ""}`,
    { revalidateSeconds: 0 },
  );
}
