"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown, MoreVertical } from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Skeleton } from "../ui/skeleton";

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: unknown, row: T) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  onSort?: (key: string, direction: "asc" | "desc") => void;
  sortKey?: string;
  sortDirection?: "asc" | "desc";
  rowActions?: (row: T) => React.ReactNode;
}

export function DataTable<T>({
  columns,
  data,
  loading = false,
  empty = false,
  emptyTitle = "No data",
  emptyDescription,
  emptyAction,
  onSort,
  sortKey,
  sortDirection,
  rowActions,
}: DataTableProps<T>) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="overflow-x-auto rounded-sm border border-stone-200">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="px-4 py-3 font-medium">
                  <Skeleton className="h-4 w-20" />
                </th>
              ))}
              {rowActions && <th className="px-4 py-3 font-medium" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i}>
                {columns.map((_, j) => (
                  <td key={j} className="px-4 py-3">
                    <Skeleton className="h-4 w-full" />
                  </td>
                ))}
                {rowActions && (
                  <td className="px-4 py-3">
                    <Skeleton className="h-8 w-8" />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (empty || data.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-sm border border-dashed border-stone-300 px-6 py-16 text-center">
        <p className="font-medium text-stone-700">{emptyTitle}</p>
        {emptyDescription && <p className="max-w-sm text-sm text-stone-500">{emptyDescription}</p>}
        {emptyAction}
      </div>
    );
  }

  const handleSort = (key: string) => {
    if (!onSort) return;

    if (sortKey === key) {
      onSort(key, sortDirection === "asc" ? "desc" : "asc");
    } else {
      onSort(key, "asc");
    }
  };

  const renderSortIcon = (key: string) => {
    if (sortKey !== key) return null;
    return sortDirection === "asc" ? (
      <ChevronUp className="size-4" aria-hidden="true" />
    ) : (
      <ChevronDown className="size-4" aria-hidden="true" />
    );
  };

  return (
    <div className="overflow-x-auto rounded-sm border border-stone-200">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={`px-4 py-3 font-medium ${column.sortable && onSort ? "cursor-pointer hover:bg-stone-100" : ""}`}
                onClick={() => column.sortable && handleSort(column.key)}
              >
                <div className="flex items-center gap-1">
                  {column.label}
                  {column.sortable && renderSortIcon(column.key)}
                </div>
              </th>
            ))}
            {rowActions && <th className="px-4 py-3 font-medium">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {data.map((row, index) => {
            const rowId = (row as { id?: string }).id || index.toString();
            return (
              <tr key={rowId} className="hover:bg-stone-50">
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-3 align-top">
                    {column.render
                      ? column.render((row as Record<string, unknown>)[column.key], row)
                      : String((row as Record<string, unknown>)[column.key] ?? "")}
                  </td>
                ))}
                {rowActions && (
                  <td className="px-4 py-3 align-top">
                    <div className="flex items-center gap-2">
                      {rowActions(row)}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
