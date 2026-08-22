"use client";

import { useState, useEffect, useRef } from "react";
import { DataTable, Column } from "./data-table";
import { SearchFilterBar } from "./search-filter-bar";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Modal } from "../ui/modal";
import { ErrorState } from "../ui/error-state";
import { AuditLogDetail } from "./audit-log-detail";
import {
  listAuditLogs,
  AUDIT_ACTION_LABELS,
  type AuditLog,
  type AuditAction,
} from "@/lib/api/audit";

// One page of the most recent matching entries. The API paginates; this view
// deliberately shows a single page rather than pretending to show everything.
const PAGE_SIZE = 100;

export function AuditLogList() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterEntityType, setFilterEntityType] = useState("");

  const [total, setTotal] = useState(0);
  // Bumped by "Try Again" to re-run the effect without duplicating the fetch.
  const [reloadKey, setReloadKey] = useState(0);
  // Guards against a slow earlier request resolving after a newer one and
  // overwriting it with stale rows - easy to hit by changing filters quickly.
  const requestRef = useRef(0);

  /**
   * Action and entity-type filtering happens on the SERVER. It previously ran
   * only client-side over whatever the first page happened to contain, which
   * meant filtering for an action older than the last PAGE_SIZE events showed
   * "No audit logs found" - indistinguishable from "it never happened". That is
   * the wrong failure mode for the tool used to investigate incidents.
   *
   * State is updated only inside the promise callbacks, never synchronously in
   * the effect body: that is the shape React's set-state-in-effect rule asks
   * for, and it avoids a cascading render on every filter change.
   */
  useEffect(() => {
    const requestId = ++requestRef.current;

    listAuditLogs({
      take: PAGE_SIZE,
      action: (filterAction as AuditAction) || undefined,
      entityType: filterEntityType || undefined,
    })
      .then((response) => {
        if (requestId !== requestRef.current) return;
        setLogs(response.items);
        setTotal(response.total);
        setError(null);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (requestId !== requestRef.current) return;
        setError("Failed to load audit logs");
        setLoading(false);
        console.error("Audit logs load error:", err);
      });
  }, [filterAction, filterEntityType, reloadKey]);

  // Filter changes and retries are event handlers, so showing the loading
  // state from here is both allowed and the honest moment to do it.
  function changeFilter(setter: (value: string) => void) {
    return (value: string) => {
      setLoading(true);
      setter(value);
    };
  }

  function retry() {
    setLoading(true);
    setReloadKey((key) => key + 1);
  }

  function handleView(log: AuditLog) {
    setSelectedLog(log);
    setDetailModalOpen(true);
  }

  // Only the free-text box filters client-side: the API has no search
  // parameter, so this necessarily searches the loaded page rather than the
  // whole log. `truncated` below tells the reader when that distinction bites.
  const query = searchQuery.trim().toLowerCase();
  const filteredLogs = query
    ? logs.filter(
        (log) =>
          log.action.toLowerCase().includes(query) ||
          log.entityType.toLowerCase().includes(query) ||
          Boolean(log.actor?.email?.toLowerCase().includes(query)),
      )
    : logs;

  const truncated = total > logs.length;

  const columns: Column<AuditLog>[] = [
    {
      key: "action",
      label: "Action",
      sortable: true,
      render: (value) => <Badge tone="brand">{AUDIT_ACTION_LABELS[value as AuditAction] || String(value)}</Badge>,
    },
    {
      key: "entityType",
      label: "Entity",
      render: (value, row) => (
        <div>
          <p className="text-sm text-stone-900">{row.entityType}</p>
          {row.entityId && <p className="text-xs text-stone-500">{row.entityId}</p>}
        </div>
      ),
    },
    {
      key: "actor",
      label: "Actor",
      render: (value, row) => (
        <p className="text-sm text-stone-600">{row.actor?.email || "System"}</p>
      ),
    },
    {
      key: "createdAt",
      label: "Timestamp",
      render: (value) => (
        <p className="text-sm text-stone-600">{new Date(String(value)).toLocaleString()}</p>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-2xl text-sm text-stone-600">Read-only record of privileged actions across the system.</p>

      <SearchFilterBar
        searchPlaceholder="Search by action, entity, or actor email..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        filters={[
          {
            key: "action",
            label: "Action",
            options: Object.entries(AUDIT_ACTION_LABELS).map(([value, label]) => ({ value, label })),
            value: filterAction,
            onChange: changeFilter(setFilterAction),
          },
          {
            key: "entityType",
            label: "Entity Type",
            options: [
              { value: "User", label: "User" },
              { value: "UserRole", label: "User Role" },
              { value: "Program", label: "Program" },
              { value: "TeamMember", label: "Team Member" },
              { value: "Partner", label: "Partner" },
              { value: "Testimonial", label: "Testimonial" },
              { value: "FAQ", label: "FAQ" },
              { value: "ImpactStat", label: "Impact Stat" },
              { value: "BlogPost", label: "Blog Post" },
              { value: "Article", label: "Article" },
              { value: "Spotlight", label: "Spotlight" },
              { value: "Media", label: "Media" },
              { value: "CallForApplication", label: "Call for Application" },
              { value: "ApplicationField", label: "Application Field" },
              { value: "Route", label: "Route (authorization denials)" },
            ],
            value: filterEntityType,
            onChange: changeFilter(setFilterEntityType),
          },
        ]}
        onClearFilters={() => {
          setSearchQuery("");
          setFilterAction("");
          setFilterEntityType("");
        }}
      />

      {/* A failed load previously fell through to the table's empty state,
          which read "No audit logs found" — reporting an outage as an absence
          of events. For an audit trail that is the most dangerous possible
          misreading, so the error is now explicit and retryable. */}
      {error ? (
        <ErrorState
          title="We couldn't load the audit log."
          description="These records exist on the server - this view failed to fetch them. Do not read this as an absence of activity."
          onRetry={retry}
        />
      ) : (
        <>
          {truncated && (
            <p className="text-sm text-stone-600">
              Showing the {logs.length} most recent of {total} matching entries. Narrow the Action or Entity Type
              filter to reach older records - the search box only searches the entries shown here.
            </p>
          )}
          <DataTable
            columns={columns}
            data={filteredLogs}
            loading={loading}
            empty={!loading && filteredLogs.length === 0}
            emptyTitle="No audit logs found"
            emptyDescription="Audit logs will appear here when privileged actions are performed."
            rowActions={(item) => (
              <Button variant="ghost" size="sm" title="View Details" onClick={() => handleView(item)}>
                View
              </Button>
            )}
          />
        </>
      )}

      <Modal open={detailModalOpen} onClose={() => setDetailModalOpen(false)} title="Audit Log Details">
        {selectedLog && (
          <AuditLogDetail
            log={selectedLog}
            onClose={() => setDetailModalOpen(false)}
          />
        )}
      </Modal>
    </div>
  );
}
