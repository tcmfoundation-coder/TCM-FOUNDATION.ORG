"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FolderKanban,
  Newspaper,
  Users,
  Image as ImageIcon,
  ClipboardList,
  MessageSquare,
  Mail,
  FileText,
  History,
} from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import { ErrorState } from "../ui/error-state";
import { KpiCard } from "./kpi-card";
import { TrendChart } from "./charts/trend-chart";
import { ComparisonBar } from "./charts/comparison-bar";
import { getDashboardAnalytics, type DashboardAnalytics } from "@/lib/api/dashboard";
import { AUDIT_ACTION_LABELS } from "@/lib/api/audit";

// Single consolidated fetch replacing the previous up-to-9 sequential
// client-side requests (one per metric) plus a separate recent-activity
// fetch — see apps/api/src/modules/dashboard/dashboard.service.ts. Which
// sections render is driven entirely by which fields the response actually
// contains: the server already tailored that to the caller's active role,
// so there is no separate role check here to keep in sync with the backend.
export function DashboardAnalyticsSection() {
  const [data, setData] = useState<DashboardAnalytics | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadAnalytics() {
    setLoading(true);
    setError(false);
    try {
      setData(await getDashboardAnalytics());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Same fetch-on-mount shape used throughout apps/admin (see
    // programs-list.tsx's loadPrograms/useEffect pair) — one request when
    // the section mounts, with its own loading/error state, not a value
    // this effect is reacting to.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch-on-mount, not a reactive cascade
    loadAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 rounded-sm border border-stone-200 bg-white p-4">
              <Skeleton className="size-9 rounded-full" />
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-5 w-12" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return <ErrorState title="Couldn't load dashboard analytics" onRetry={loadAnalytics} />;
  }

  const { overview, trends, recentActivity } = data;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-medium uppercase tracking-wide text-stone-500">Overview</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Programs"
            value={overview.programs.total}
            detail={`${overview.programs.published} published`}
            icon={FolderKanban}
          />
          <KpiCard label="Published Content" value={overview.publishedContent} icon={Newspaper} />
          <KpiCard label="Team Members" value={overview.teamMembers} icon={Users} />
          <KpiCard label="Media Files" value={overview.mediaFiles} icon={ImageIcon} />
          <KpiCard label="Open Applications" value={overview.openApplications} icon={ClipboardList} />
          {overview.applicationSubmissions && (
            <KpiCard
              label="Applications Received"
              value={overview.applicationSubmissions.total}
              detail={`${overview.applicationSubmissions.new} awaiting review`}
              icon={FileText}
            />
          )}
          {overview.supportRequests && (
            <KpiCard
              label="Support Requests"
              value={overview.supportRequests.total}
              detail={`${overview.supportRequests.new} new`}
              icon={MessageSquare}
            />
          )}
          {overview.newsletterSubscribers && (
            <KpiCard
              label="Newsletter Subscribers"
              value={overview.newsletterSubscribers.total}
              detail={`${overview.newsletterSubscribers.subscribed} subscribed`}
              icon={Mail}
            />
          )}
          {overview.contactSubmissions && (
            <KpiCard label="Contact Submissions" value={overview.contactSubmissions.total} icon={Mail} />
          )}
          {overview.auditLogEntries !== undefined && (
            <KpiCard label="Audit Log Entries" value={overview.auditLogEntries} icon={History} />
          )}
        </div>
      </div>

      {overview.users && (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-medium uppercase tracking-wide text-stone-500">Users</h3>
          <div className="rounded-sm border border-stone-200 bg-white p-4">
            <p className="mb-3 font-display text-2xl font-medium text-stone-900">
              {overview.users.total.toLocaleString()}
              <span className="ml-2 text-sm font-normal text-stone-500">total accounts</span>
            </p>
            <ComparisonBar
              segments={[
                { label: "Active", value: overview.users.active, className: "bg-success" },
                { label: "Deactivated", value: overview.users.deactivated, className: "bg-stone-300" },
              ]}
            />
          </div>
        </div>
      )}

      {trends && (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-medium uppercase tracking-wide text-stone-500">Trends (Last 30 Days)</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <TrendChart label="User Growth" data={trends.userGrowth} />
            <TrendChart label="Applications Received" data={trends.applicationSubmissions} />
            <TrendChart label="Support Requests" data={trends.supportRequests} />
            <TrendChart label="Newsletter Growth" data={trends.newsletterGrowth} />
          </div>
        </div>
      )}

      {recentActivity && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium uppercase tracking-wide text-stone-500">Recent Activity</h3>
            <Link href="/admin/audit-log" className="text-xs font-medium text-brand-700 hover:text-brand-800">
              View all
            </Link>
          </div>
          <div className="rounded-sm border border-stone-200 bg-white">
            {recentActivity.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                <History className="size-6 text-stone-300" aria-hidden="true" />
                <p className="text-sm text-stone-500">No recent activity to show yet.</p>
              </div>
            ) : (
              <ul className="flex flex-col divide-y divide-stone-100">
                {recentActivity.map((log) => (
                  <li key={log.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="flex min-w-0 flex-col">
                      <span className="text-sm text-stone-800">
                        <span className="font-medium">{AUDIT_ACTION_LABELS[log.action] ?? log.action}</span>
                        {" · "}
                        <span className="text-stone-500">{log.entityType}</span>
                      </span>
                      <span className="truncate text-xs text-stone-500">{log.actor?.email ?? "System"}</span>
                    </div>
                    <time
                      dateTime={log.createdAt}
                      className="shrink-0 text-xs text-stone-400"
                      title={new Date(log.createdAt).toLocaleString()}
                    >
                      {relativeTime(log.createdAt)}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
