import { notFound } from "next/navigation";
import { ApiError } from "../api-client";

// Shared by every [slug] detail page: a real 404 from the API becomes a
// real Next.js not-found page, not a broken/blank render.
export async function fetchOrNotFound<T>(fetcher: () => Promise<T>): Promise<T> {
  try {
    return await fetcher();
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }
}
