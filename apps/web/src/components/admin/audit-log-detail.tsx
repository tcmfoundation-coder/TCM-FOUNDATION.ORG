"use client";

import { AUDIT_ACTION_LABELS, type AuditLog } from "@/lib/api/audit";
import { Badge } from "../ui/badge";

interface AuditLogDetailProps {
  log: AuditLog;
  onClose: () => void;
}

export function AuditLogDetail({ log, onClose }: AuditLogDetailProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Badge tone="brand">{AUDIT_ACTION_LABELS[log.action] || log.action}</Badge>
        <span className="text-sm text-stone-600">{new Date(log.createdAt).toLocaleString()}</span>
      </div>

      <div className="grid gap-4">
        <div>
          <p className="text-sm font-medium text-stone-700">Actor</p>
          <p className="text-stone-900">{log.actor?.email || "System"}</p>
        </div>

        <div>
          <p className="text-sm font-medium text-stone-700">Entity Type</p>
          <p className="text-stone-900">{log.entityType}</p>
        </div>

        {log.entityId && (
          <div>
            <p className="text-sm font-medium text-stone-700">Entity ID</p>
            <p className="text-sm font-mono text-stone-600">{log.entityId}</p>
          </div>
        )}

        {log.ipAddress && (
          <div>
            <p className="text-sm font-medium text-stone-700">IP Address</p>
            <p className="text-sm font-mono text-stone-600">{log.ipAddress}</p>
          </div>
        )}

        {log.before && (
          <div>
            <p className="text-sm font-medium text-stone-700">Before</p>
            <pre className="mt-1 overflow-auto rounded-md bg-stone-100 p-3 text-xs font-mono text-stone-700">
              {JSON.stringify(log.before, null, 2)}
            </pre>
          </div>
        )}

        {log.after && (
          <div>
            <p className="text-sm font-medium text-stone-700">After</p>
            <pre className="mt-1 overflow-auto rounded-md bg-stone-100 p-3 text-xs font-mono text-stone-700">
              {JSON.stringify(log.after, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button
          onClick={onClose}
          className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
        >
          Close
        </button>
      </div>
    </div>
  );
}
