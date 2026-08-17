import { apiClient } from "../api-client";

export interface Testimonial {
  id: string;
  authorName: string;
  authorRole: string | null;
  quote: string;
}

export function listTestimonials(take?: number): Promise<Testimonial[]> {
  return apiClient.get<Testimonial[]>(`/testimonials${take ? `?take=${take}` : ""}`);
}
