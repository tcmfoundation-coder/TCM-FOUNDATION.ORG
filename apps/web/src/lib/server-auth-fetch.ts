import "server-only";
import { cookies } from "next/headers";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

/**
 * For Server Components on authenticated admin pages: unlike a browser
 * fetch (which automatically carries the browser's cookie jar via
 * `credentials: "include"`), a server-to-server fetch has no cookies of
 * its own — the incoming request's cookies must be forwarded explicitly.
 * Returns the raw Response so callers can branch on 401 (redirect to
 * login) vs other errors (real failure) themselves.
 */
export async function serverAuthFetch(path: string): Promise<Response> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  return fetch(`${API_BASE_URL}${path}`, {
    headers: { Cookie: cookieHeader },
    cache: "no-store",
  });
}
