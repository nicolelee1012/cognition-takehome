"use client";

export interface SelectFilter {
  key: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

interface FilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: SelectFilter[];
  resultCount?: number;
}

/** Shared search + filter controls for queue screens. */
export function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder = "Search…",
  filters = [],
  resultCount,
}: FilterBarProps) {
  return (
    <div className="filterBar">
      <input
        className="input searchInput"
        type="search"
        name="search"
        id="filter-search"
        value={search}
        placeholder={searchPlaceholder}
        aria-label="Search"
        onChange={(e) => onSearchChange(e.target.value)}
      />
      {filters.map((filter) => (
        <label key={filter.key} className="filterField">
          <span>{filter.label}</span>
          <select
            className="input"
            name={filter.key}
            id={`filter-${filter.key}`}
            value={filter.value}
            aria-label={filter.label}
            onChange={(e) => filter.onChange(e.target.value)}
          >
            {filter.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      ))}
      {resultCount !== undefined && <span className="resultCount">{resultCount} results</span>}
    </div>
  );
}
