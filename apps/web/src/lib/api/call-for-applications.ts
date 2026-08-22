import { apiClient } from "../api-client";

export type ApplicationFieldType =
  | "SHORT_TEXT"
  | "LONG_TEXT"
  | "EMAIL"
  | "PHONE"
  | "SINGLE_SELECT"
  | "MULTI_SELECT";

// Shape of one question on a campaign's application form. `options` is only
// meaningful for SINGLE_SELECT/MULTI_SELECT — the backend stores it as a
// plain string[] of choices (see call-for-applications.service.ts).
export interface ApplicationField {
  id: string;
  label: string;
  fieldType: ApplicationFieldType;
  isRequired: boolean;
  options: string[] | null;
  order: number;
}

// Shape returned by the public GET /call-for-applications, GET
// /call-for-applications/slug/:slug endpoints. `fields` is nested directly
// on the campaign (not a separate admin-only endpoint) — that's the only
// way a public applicant can discover what to render.
export interface CallForApplication {
  id: string;
  slug: string;
  title: string;
  programType: string;
  description: string;
  status: "DRAFT" | "OPEN" | "CLOSED";
  openDate: string | null;
  closeDate: string | null;
  fields: ApplicationField[];
}

// GET /call-for-applications returns a plain array, not a {items,...} envelope.
//
// Deliberately uncached. The client's default 60s revalidate window is right
// for ordinary CMS content, but this response IS the open/closed signal: the
// homepage section renders only when it is non-empty, and the listing shows an
// empty state otherwise. A stale window meant a closed campaign kept being
// advertised with an "Apply Now" card that led somewhere no longer open —
// observed, not theorised. Both callers are already dynamically rendered, so
// this costs one API call per render and nothing else.
export function listOpenCallsForApplications(): Promise<CallForApplication[]> {
  return apiClient.get<CallForApplication[]>("/call-for-applications", { revalidateSeconds: 0 });
}

// GET /call-for-applications/slug/:slug — public, no auth. Used by the
// public application page to load the campaign and its fields together.
export function getCallForApplicationBySlug(slug: string): Promise<CallForApplication> {
  return apiClient.get<CallForApplication>(`/call-for-applications/slug/${slug}`);
}

// GET /call-for-applications/id/:id — CONTENT_EDITOR or higher. Used by the
// admin submissions page to show which campaign the submissions belong to.
export function getCallForApplicationById(id: string): Promise<CallForApplication> {
  return apiClient.get<CallForApplication>(`/call-for-applications/id/${id}`);
}

// --- Admin campaign management ---------------------------------------

export interface CallForApplicationAdmin extends CallForApplication {
  createdAt: string;
  updatedAt: string;
}

export interface CallForApplicationAdminListResponse {
  items: CallForApplicationAdmin[];
  total: number;
  skip: number;
  take: number;
}

// GET /call-for-applications/admin — CONTENT_EDITOR or higher.
export function listCallForApplicationsAdmin(params?: {
  skip?: number;
  take?: number;
  status?: CallForApplication["status"];
}): Promise<CallForApplicationAdminListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.skip) searchParams.append("skip", params.skip.toString());
  if (params?.take) searchParams.append("take", params.take.toString());
  if (params?.status) searchParams.append("status", params.status);
  const query = searchParams.toString();
  return apiClient.get<CallForApplicationAdminListResponse>(`/call-for-applications/admin${query ? `?${query}` : ""}`);
}

export interface CallForApplicationWriteInput {
  slug: string;
  title: string;
  programType?: string;
  description?: string;
  status?: CallForApplication["status"];
  openDate?: string;
  closeDate?: string;
}

// POST /call-for-applications — CONTENT_EDITOR or higher.
export function createCallForApplication(data: CallForApplicationWriteInput): Promise<CallForApplicationAdmin> {
  return apiClient.post<CallForApplicationAdmin>("/call-for-applications", data);
}

// PATCH /call-for-applications/:id — CONTENT_EDITOR or higher.
export function updateCallForApplication(
  id: string,
  data: Partial<CallForApplicationWriteInput>,
): Promise<CallForApplicationAdmin> {
  return apiClient.patch<CallForApplicationAdmin>(`/call-for-applications/${id}`, data);
}

// DELETE /call-for-applications/:id — ADMINISTRATOR or higher.
export function deleteCallForApplication(id: string): Promise<void> {
  return apiClient.delete<void>(`/call-for-applications/${id}`);
}

// --- Admin application field management -------------------------------

// GET /call-for-applications/:id/fields — CONTENT_EDITOR or higher.
export function listApplicationFields(callForApplicationId: string): Promise<ApplicationField[]> {
  return apiClient.get<ApplicationField[]>(`/call-for-applications/${callForApplicationId}/fields`);
}

export interface ApplicationFieldWriteInput {
  label: string;
  fieldType: ApplicationFieldType;
  isRequired?: boolean;
  // Only meaningful for SINGLE_SELECT/MULTI_SELECT; the backend stores this
  // as Json but its create/update DTOs require it pre-serialized as a JSON
  // string (@IsJSON()), so callers pass a plain string[] and this module
  // handles the JSON.stringify.
  options?: string[];
  order?: number;
}

// POST /call-for-applications/:id/fields — CONTENT_EDITOR or higher.
export function createApplicationField(
  callForApplicationId: string,
  data: ApplicationFieldWriteInput,
): Promise<ApplicationField> {
  return apiClient.post<ApplicationField>(`/call-for-applications/${callForApplicationId}/fields`, {
    ...data,
    options: data.options ? JSON.stringify(data.options) : undefined,
  });
}

// PATCH /call-for-applications/fields/:fieldId — CONTENT_EDITOR or higher.
export function updateApplicationField(
  fieldId: string,
  data: Partial<ApplicationFieldWriteInput>,
): Promise<ApplicationField> {
  return apiClient.patch<ApplicationField>(`/call-for-applications/fields/${fieldId}`, {
    ...data,
    options: data.options ? JSON.stringify(data.options) : undefined,
  });
}

// DELETE /call-for-applications/fields/:fieldId — ADMINISTRATOR or higher.
export function deleteApplicationField(fieldId: string): Promise<void> {
  return apiClient.delete<void>(`/call-for-applications/fields/${fieldId}`);
}

// --- Application submissions ---------------------------------------

export type ApplicationSubmissionReviewStatus = "NEW" | "IN_REVIEW" | "ACCEPTED" | "REJECTED";

export interface SubmitApplicationInput {
  applicantName: string;
  applicantEmail: string;
  // Keyed by ApplicationField.id; string for most field types, string[]
  // for MULTI_SELECT. Only fields that actually exist on the campaign are
  // accepted — the backend validates against the campaign's real fields.
  answers: Record<string, string | string[]>;
  // Omitted rather than sent as null when the challenge isn't configured —
  // the API skips verification in that case and rejects unknown fields.
  // Required, and the API rejects anything other than `true` (submit DTO uses
  // `@Equals(true)`). Typed as boolean rather than the literal `true` because
  // it carries whatever the applicant actually ticked - narrowing it here would
  // claim a guarantee this layer cannot make.
  consentedToContact: boolean;
  turnstileToken?: string;
}

export interface ApplicationSubmissionReceipt {
  id: string;
  submittedAt: string;
}

// POST /call-for-applications/slug/:slug/submissions — public, no auth.
export function submitApplication(slug: string, data: SubmitApplicationInput): Promise<ApplicationSubmissionReceipt> {
  return apiClient.post<ApplicationSubmissionReceipt>(`/call-for-applications/slug/${slug}/submissions`, data);
}

export interface ApplicationSubmissionSummary {
  id: string;
  callForApplicationId: string;
  applicantName: string;
  applicantEmail: string;
  reviewStatus: ApplicationSubmissionReviewStatus;
  reviewedById: string | null;
  reviewedBy: { id: string; email: string } | null;
  submittedAt: string;
}

export interface ApplicationSubmissionListResponse {
  items: ApplicationSubmissionSummary[];
  total: number;
  skip: number;
  take: number;
}

// GET /call-for-applications/:id/submissions — CONTENT_EDITOR or higher.
export function listApplicationSubmissions(
  callForApplicationId: string,
  params?: { skip?: number; take?: number; reviewStatus?: ApplicationSubmissionReviewStatus },
): Promise<ApplicationSubmissionListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.skip) searchParams.append("skip", params.skip.toString());
  if (params?.take) searchParams.append("take", params.take.toString());
  if (params?.reviewStatus) searchParams.append("reviewStatus", params.reviewStatus);
  const query = searchParams.toString();
  const url = query
    ? `/call-for-applications/${callForApplicationId}/submissions?${query}`
    : `/call-for-applications/${callForApplicationId}/submissions`;
  return apiClient.get<ApplicationSubmissionListResponse>(url);
}

export interface ApplicationSubmissionAnswer {
  fieldId: string;
  label: string;
  fieldType: ApplicationFieldType;
  value: string | string[] | null;
}

export interface ApplicationSubmissionDetail extends ApplicationSubmissionSummary {
  callForApplication: { id: string; slug: string; title: string };
  answers: ApplicationSubmissionAnswer[];
}

// GET /call-for-applications/submissions/:submissionId — CONTENT_EDITOR or higher.
export function getApplicationSubmission(submissionId: string): Promise<ApplicationSubmissionDetail> {
  return apiClient.get<ApplicationSubmissionDetail>(`/call-for-applications/submissions/${submissionId}`);
}

// PATCH /call-for-applications/submissions/:submissionId/status — CONTENT_EDITOR or higher.
export function updateApplicationSubmissionStatus(
  submissionId: string,
  reviewStatus: ApplicationSubmissionReviewStatus,
): Promise<ApplicationSubmissionSummary> {
  return apiClient.patch<ApplicationSubmissionSummary>(`/call-for-applications/submissions/${submissionId}/status`, { reviewStatus });
}
