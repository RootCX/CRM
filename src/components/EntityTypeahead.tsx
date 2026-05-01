import { useState, useEffect } from "react";
import { useAppCollection } from "@rootcx/sdk";
import { Popover, PopoverTrigger, PopoverContent, Input, Button } from "@rootcx/ui";
import { IconCheck, IconSelector, IconX } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { buildSearchClause } from "@/lib/search";
import { APP_ID } from "@/lib/constants";

export interface EntityTypeaheadConfig {
  entity: string;
  searchFields: string[];
  labelFn: (record: Record<string, unknown>) => string;
}

interface EntityTypeaheadProps {
  config: EntityTypeaheadConfig;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  className?: string;
}

function SelectedLabel({ config, value }: { config: EntityTypeaheadConfig; value: string }) {
  const { data } = useAppCollection<Record<string, unknown>>(
    APP_ID, config.entity, { where: { id: { $eq: value } }, limit: 1 },
  );
  return <span className="truncate">{data.length > 0 ? config.labelFn(data[0]) : "…"}</span>;
}

function TypeaheadDropdown({ config, value, onSelect }: {
  config: EntityTypeaheadConfig; value: string | undefined; onSelect: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 200);
    return () => clearTimeout(timer);
  }, [search]);

  const where = buildSearchClause(debouncedSearch, config.searchFields);
  const { data: results, loading } = useAppCollection<Record<string, unknown>>(
    APP_ID, config.entity, { where, limit: 20, orderBy: "created_at", order: "desc" },
  );

  return (
    <>
      <div className="p-2 border-b">
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search…"
          className="h-8"
          autoFocus
        />
      </div>
      <div className="overflow-y-auto h-56">
        {loading && results.length === 0 ? (
          <div className="p-3 text-center text-sm text-muted-foreground">Searching…</div>
        ) : results.length === 0 ? (
          <div className="p-3 text-center text-sm text-muted-foreground">No results</div>
        ) : (
          <div className="p-1">
            {results.map(record => {
              const id = record.id as string;
              const label = config.labelFn(record);
              const isSelected = id === value;
              return (
                <button
                  key={id}
                  onClick={() => onSelect(id)}
                  className={cn(
                    "flex items-center gap-2 w-full rounded-sm px-2 py-1.5 text-sm text-left transition-colors",
                    isSelected ? "bg-accent" : "hover:bg-accent/50",
                  )}
                >
                  <IconCheck className={cn("h-3.5 w-3.5 shrink-0", isSelected ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

export function EntityTypeahead({ config, value, onChange, placeholder, className }: EntityTypeaheadProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (id: string) => {
    onChange(id);
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(undefined);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal h-9", !value && "text-muted-foreground", className)}
        >
          {value ? <SelectedLabel config={config} value={value} /> : <span className="truncate">{placeholder ?? "Select…"}</span>}
          <div className="flex items-center gap-1 shrink-0 ml-2">
            {value && (
              <span onClick={handleClear} className="rounded-sm hover:bg-accent p-0.5">
                <IconX className="h-3 w-3" />
              </span>
            )}
            <IconSelector className="h-3.5 w-3.5 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0 overflow-hidden"
        align="start"
        sideOffset={4}
        onOpenAutoFocus={e => { e.preventDefault(); const input = (e.target as HTMLElement).querySelector("input"); input?.focus(); }}
      >
        {open && <TypeaheadDropdown config={config} value={value} onSelect={handleSelect} />}
      </PopoverContent>
    </Popover>
  );
}

export const ENTITY_CONFIGS: Record<string, EntityTypeaheadConfig> = {
  contacts: {
    entity: "contacts",
    searchFields: ["first_name", "last_name", "email"],
    labelFn: (r) => `${r.first_name} ${r.last_name}`,
  },
  companies: {
    entity: "companies",
    searchFields: ["name", "domain_name"],
    labelFn: (r) => r.name as string,
  },
  deals: {
    entity: "deals",
    searchFields: ["title"],
    labelFn: (r) => r.title as string,
  },
};
