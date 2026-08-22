"use client";

import { useEffect, useState } from "react";
import {
  FolderKanban,
  Newspaper,
  Users,
  Image as ImageIcon,
  ClipboardList,
  MessageSquare,
  UserCog,
  History,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import { listProgramsAdmin, listPrograms } from "@/lib/api/programs";
import { listBlogPosts } from "@/lib/api/blog";
import { listArticles } from "@/lib/api/articles";
import { listSpotlights } from "@/lib/api/spotlights";
import { listTeamAdmin } from "@/lib/api/team";
import { listMedia } from "@/lib/api/media";
import { listOpenCallsForApplications } from "@/lib/api/call-for-applications";
import { listSupportRequests } from "@/lib/api/support";
import { listStaff } from "@/lib/api/users";
import { listAuditLogs } from "@/lib/api/audit";

interface Metric {
  label: string;
  value: number;
  icon: LucideIcon;
}

// Every figure here comes from a real endpoint's `total` (or a real array
// length for public list-only routes) — nothing is estimated or invented.
// A metric that fails to load (endpoint missing, e.g. Support Lab) is
// simply omitted rather than shown as zero or a fake placeholder. There is
// no backend support at all for counting newsletter subscribers, so that
// metric — suggested as an example — is intentionally never shown.
export function DashboardMetrics({ roles }: { roles: string[] }) {
  const [metrics, setMetrics] = useState<Metric[] | null>(null);

  const canManage = roles.includes("ADMINISTRATOR") || roles.includes("SUPER_ADMINISTRATOR");
  const isSuperAdmin = roles.includes("SUPER_ADMINISTRATOR");

  useEffect(() => {
    let cancelled = false;

    async function loadMetrics() {
      const results: Metric[] = [];

      async function tryAdd(label: string, icon: LucideIcon, fetcher: () => Promise<number>) {
        try {
          const value = await fetcher();
          results.push({ label, value, icon });
        } catch {
          // Endpoint unavailable or unauthorized — omit, never fake.
        }
      }

      await tryAdd("Programs", FolderKanban, async () => (await listProgramsAdmin({ take: 1 })).total);

      await tryAdd("Published Content", Newspaper, async () => {
        const [programs, blog, articles, spotlights] = await Promise.all([
          listPrograms({ take: 1 }),
          listBlogPosts({ take: 1 }),
          listArticles({ take: 1 }),
          listSpotlights({ take: 1 }),
        ]);
        return programs.total + blog.total + articles.total + spotlights.total;
      });

      await tryAdd("Team Members", Users, async () => (await listTeamAdmin({ take: 1 })).total);

      await tryAdd("Media Files", ImageIcon, async () => (await listMedia({ take: 1 })).total);

      await tryAdd("Open Applications", ClipboardList, async () => (await listOpenCallsForApplications()).length);

      if (canManage) {
        await tryAdd(
          "Support Requests",
          MessageSquare,
          async () => (await listSupportRequests({ status: "NEW", take: 1 })).total,
        );
        await tryAdd("Staff Members", UserCog, async () => (await listStaff()).total);
      }

      if (isSuperAdmin) {
        await tryAdd("Audit Log Entries", History, async () => (await listAuditLogs({ take: 1 })).total);
      }

      if (!cancelled) setMetrics(results);
    }

    void loadMetrics();
    return () => {
      cancelled = true;
    };
  }, [canManage, isSuperAdmin]);

  if (metrics === null) {
    return (
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
    );
  }

  if (metrics.length === 0) {
    return (
      <div className="rounded-sm border border-stone-200 bg-stone-50 p-4">
        <p className="text-sm text-stone-600">Dashboard statistics will appear here once content is published.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <div
            key={metric.label}
            className="flex items-center gap-3 rounded-sm border border-stone-200 bg-white p-4"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
              <Icon className="size-4.5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-2xl font-semibold text-stone-900">{metric.value}</p>
              <p className="text-xs text-stone-500">{metric.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
