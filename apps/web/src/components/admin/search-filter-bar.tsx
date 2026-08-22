"use client";

import { Search, X } from "lucide-react";
import { Button } from "../ui/button";
import { Select } from "../ui/select";

export interface FilterOption {
  value: string;
  label: string;
}

export interface SearchFilterBarProps {
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  filters?: Array<{
    key: string;
    label: string;
    options: FilterOption[];
    value?: string;
    onChange?: (value: string) => void;
  }>;
  onClearFilters?: () => void;
}

export function SearchFilterBar({
  searchPlaceholder = "Search...",
  searchValue = "",
  onSearchChange,
  filters = [],
  onClearFilters,
}: SearchFilterBarProps) {
  const hasActiveFilters = filters.some((f) => f.value) || searchValue.length > 0;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" aria-hidden="true" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="w-full rounded-sm border border-stone-300 px-3.5 py-2.5 pl-9 text-sm text-stone-900 placeholder:text-stone-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-700"
          />
        </div>
        {hasActiveFilters && onClearFilters && (
          <Button variant="secondary" size="sm" onClick={onClearFilters}>
            <X className="size-4" aria-hidden="true" />
            Clear
          </Button>
        )}
      </div>

      {filters.length > 0 && (
        <div className="flex flex-wrap items-end gap-3">
          {filters.map((filter) => (
            <div key={filter.key} className="w-40">
              <Select
                label={filter.label}
                value={filter.value || ""}
                onChange={(e) => filter.onChange?.(e.target.value)}
              >
                <option value="">All</option>
                {filter.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
