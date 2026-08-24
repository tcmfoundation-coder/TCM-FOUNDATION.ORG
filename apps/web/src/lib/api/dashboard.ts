import { apiClient } from "../api-client";
import type { AuditAction } from "./audit";

export interface DailyCount {
  date: string;
  count: number;
}

// Every optional field mirrors a role-gated section of the API response —
// see apps/api/src/modules/dashboard/dashboard.service.ts. Absent (not just
// falsy) means the caller's active role doesn't include that data; the
// server never computed or sent it, so there's nothing to hide, only to omit.
export interface DashboardAnalytics {
  overview: {
    programs: { total: number; published: number };
    publishedContent: number;
    teamMembers: number;
    mediaFiles: number;
    openApplications: number;
    users?: { total: number; active: number; deactivated: number };
    supportRequests?: { total: number; new: number };
    newsletterSubscribers?: { total: number; subscribed: number };
    contactSubmissions?: { total: number };
    applicationSubmissions?: { total: number; new: number };
    auditLogEntries?: number;
  };
  trends?: {
    userGrowth: DailyCount[];
    applicationSubmissions: DailyCount[];
    supportRequests: DailyCount[];
    newsletterGrowth: DailyCount[];
  };
  recentActivity?: {
    id: string;
    action: AuditAction;
    entityType: string;
    entityId: string | null;
    createdAt: string;
    actor: { id: string; email: string } | null;
  }[];
  generatedAt: string;
}

// Endpoint: GET /dashboard/analytics
// Authentication: Required
// Required role: CONTENT_EDITOR or higher (server further tailors the
// response to the caller's actual active role — see DashboardService)
export function getDashboardAnalytics(): Promise<DashboardAnalytics> {
  return apiClient.get<DashboardAnalytics>("/dashboard/analytics");
}
