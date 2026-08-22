const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type RequestOptions = Omit<RequestInit, "body"> & { body?: unknown; revalidateSeconds?: number };

// NestJS's default HttpException filter returns { statusCode, message, error },
// where `message` is a single string or (from ValidationPipe) an array of
// per-field validation messages. Surface that real message instead of a
// generic "failed with 400" so forms can show the actual problem.
async function extractErrorMessage(response: Response, path: string): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string | string[] };
    if (Array.isArray(body.message)) return body.message.join(" ");
    if (typeof body.message === "string") return body.message;
  } catch {
    // Response body wasn't JSON (or was empty) — fall through.
  }
  return `Request to ${path} failed with ${response.status}`;
}

// Thin fetch wrapper so every call goes through one place for the base URL,
// credentials, and error shape — real endpoints get added domain-by-domain
// as apps/api implements them (Phase 4).
//
// Without an explicit cache policy, Next.js treats a fetch reached during
// static rendering as `force-cache` — permanently cached at build time,
// which would (a) make `next build` fail if the API isn't reachable at
// build time and (b) mean CMS edits never show up without a full rebuild.
// GET requests default to a short revalidate window instead (time-based
// ISR); pass `revalidateSeconds` to override per call.
async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, revalidateSeconds, ...rest } = options;
  const method = (rest.method ?? "GET").toString().toUpperCase();

  // FormData (media upload) must be sent as-is so the browser can set its
  // own multipart boundary — JSON.stringify-ing a FormData instance silently
  // produces "{}" and a Content-Type: application/json header would make
  // the backend's multer interceptor never see the file or fields.
  const isFormData = body instanceof FormData;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...headers,
    },
    credentials: "include",
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
    ...(method === "GET" ? { next: { revalidate: revalidateSeconds ?? 60 } } : { cache: "no-store" }),
  });

  if (!response.ok) {
    throw new ApiError(await extractErrorMessage(response, path), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "POST", body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PATCH", body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "DELETE" }),
};
