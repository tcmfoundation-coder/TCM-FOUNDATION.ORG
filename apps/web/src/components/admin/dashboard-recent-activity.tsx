"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { History } from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import { listAuditLogs, AUDIT_ACTION_LABELS, type AuditLog } from "@/lib/api/audit";

// GET /audit-logs is SUPER_ADMINISTRATOR-only — this component is only
// rendered for that role (see DashboardContent). Failing closed (omitting
// the panel) rather than showing an error keeps a non-super-admin viewer's
// dashboard from ever surfacing a 403 for a section they were never meant
// to see.
export function DashboardRecentActivity() {
  const [logs, setLogs] = useState<AuditLog[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    listAuditLogs({ take: 5 })
      .then((response) => {
        if (!cancelled) setLogs(response.items);
      })
      .catch(() => {
        if (!cancelled) setLogs([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium uppercase tracking-wide text-stone-500">Recent Activity</h2>
        <Link href="/admin/audit-log" className="text-xs font-medium text-brand-700 hover:text-brand-800">
          View all
        </Link>
      </div>

      <div className="rounded-sm border border-stone-200 bg-white">
        {logs === null ? (
          <div className="flex flex-col divide-y divide-stone-100">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="size-4" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
            <History className="size-6 text-stone-300" aria-hidden="true" />
            <p className="text-sm text-stone-500">No recent activity to show yet.</p>
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-stone-100">
            {logs.map((log) => (
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
