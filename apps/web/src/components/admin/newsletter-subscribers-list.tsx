"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Mail, MailX, Users } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { ErrorState } from "../ui/error-state";
import { DataTable, type Column } from "./data-table";
import {
  listNewsletterSubscribers,
  type NewsletterSubscriber,
} from "@/lib/api/newsletter";
import { ApiError } from "@/lib/api-client";

const TAKE = 25;

interface SubscribersPage {
  items: NewsletterSubscriber[];
  total: number;
  subscribedCount: number;
  skip: number;
}

const EMPTY_PAGE: SubscribersPage = {
  items: [],
  total: 0,
  subscribedCount: 0,
  skip: 0,
};

export function NewsletterSubscribersList() {
  const [page, setPage] = useState<SubscribersPage>(EMPTY_PAGE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadSubscribers(nextSkip: number) {
    try {
      setLoading(true);
      setError(null);
      const result = await listNewsletterSubscribers({ skip: nextSkip, take: TAKE });
      setPage({
        items: result.items,
        total: result.total,
        subscribedCount: result.subscribedCount,
        skip: result.skip,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load subscribers.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Also called by the pagination buttons and the retry action below; the
    // setState calls inside only run after an await, never synchronously
    // during this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSubscribers(0);
  }, []);

  const { items, total, subscribedCount, skip } = page;
  const unsubscribedCount = total - subscribedCount;
  const totalPages = Math.max(1, Math.ceil(total / TAKE));
  const currentPage = Math.floor(skip / TAKE) + 1;

  const columns: Column<NewsletterSubscriber>[] = [
    {
      key: "email",
      label: "Email",
      render: (_value, row) => (
        <p className="break-all font-medium text-stone-900">{row.email}</p>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (value) => (
        <Badge tone={value === "SUBSCRIBED" ? "brand" : "neutral"}>
          {value === "SUBSCRIBED" ? "Subscribed" : "Unsubscribed"}
        </Badge>
      ),
    },
    {
      key: "subscribedAt",
      label: "Subscribed",
      render: (value) => (
        <p className="text-sm text-stone-600">
          {new Date(String(value)).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </p>
      ),
    },
    {
      key: "unsubscribedAt",
      label: "Unsubscribed",
      render: (value) => (
        <p className="text-sm text-stone-600">
          {value
            ? new Date(String(value)).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })
            : "—"}
        </p>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-2xl text-sm text-stone-600">
        Everyone who has signed up for TCM Foundation updates through the website.
      </p>

      <div className="grid gap-px overflow-hidden rounded-sm border border-stone-200 bg-stone-200 sm:grid-cols-3">
        <StatTile
          icon={Mail}
          label="Currently subscribed"
          value={subscribedCount}
          hint="Reachable when you send an update"
          emphasis
        />
        <StatTile icon={MailX} label="Unsubscribed" value={unsubscribedCount} hint="Opted out — do not contact" />
        <StatTile icon={Users} label="Total records" value={total} hint="Subscribed and unsubscribed combined" />
      </div>

      {error ? (
        <ErrorState
          title="Couldn't load subscribers"
          description={error}
          onRetry={() => void loadSubscribers(skip)}
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={items}
            loading={loading}
            empty={!loading && items.length === 0}
            emptyTitle="No subscribers yet"
            emptyDescription="Sign-ups from the website's newsletter form will appear here."
          />

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage <= 1 || loading}
                onClick={() => void loadSubscribers(Math.max(0, skip - TAKE))}
              >
                <ChevronLeft aria-hidden="true" className="size-4" />
                Previous
              </Button>
              <p className="text-sm text-stone-600">
                Page {currentPage} of {totalPages}
              </p>
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage >= totalPages || loading}
                onClick={() => void loadSubscribers(skip + TAKE)}
              >
                Next
                <ChevronRight aria-hidden="true" className="size-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  emphasis = false,
}: {
  icon: typeof Mail;
  label: string;
  value: number;
  hint: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 bg-white p-4">
      <div className="flex items-center gap-2">
        <Icon aria-hidden="true" className={`size-4 ${emphasis ? "text-brand-700" : "text-stone-400"}`} />
        <span className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</span>
      </div>
      <p className={`font-display text-2xl font-medium ${emphasis ? "text-brand-700" : "text-stone-900"}`}>
        {value}
      </p>
      <p className="text-xs text-stone-500">{hint}</p>
    </div>
  );
}
