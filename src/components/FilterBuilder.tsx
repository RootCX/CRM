import { useState } from "react";
import {
  Button, Input, Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
  Popover, PopoverTrigger, PopoverContent, Separator,
} from "@rootcx/ui";
import { IconFilter, IconX, IconChevronDown, IconPlus } from "@tabler/icons-react";
import type { WhereClause } from "@rootcx/sdk";

export type FieldType = "text" | "number" | "date" | "boolean" | "enum" | "entity_link";
export type Operator = "contains" | "not_contains" | "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "is_empty" | "is_not_empty" | "is" | "is_not";

export interface FilterFieldDef {
  key: string;
  label: string;
  type: FieldType;
  options?: { label: string; value: string }[];
}

export interface ActiveFilter {
  id: string;
  field: FilterFieldDef;
  operator: Operator;
  value: string | null;
}

// [ops, defaultOp] per type. entity_link shares enum bucket.
const OPS: Record<string, [{ value: Operator; label: string }[], Operator]> = {
  text:    [[{ value: "contains", label: "contains" }, { value: "not_contains", label: "doesn't contain" }, { value: "eq", label: "is" }, { value: "ne", label: "is not" }, { value: "is_empty", label: "is empty" }, { value: "is_not_empty", label: "is not empty" }], "contains"],
  number:  [[{ value: "eq", label: "=" }, { value: "ne", label: "≠" }, { value: "gt", label: ">" }, { value: "gte", label: "≥" }, { value: "lt", label: "<" }, { value: "lte", label: "≤" }, { value: "is_empty", label: "is empty" }, { value: "is_not_empty", label: "is not empty" }], "eq"],
  date:    [[{ value: "eq", label: "is" }, { value: "gt", label: "after" }, { value: "gte", label: "on or after" }, { value: "lt", label: "before" }, { value: "lte", label: "on or before" }, { value: "is_empty", label: "is empty" }, { value: "is_not_empty", label: "is not empty" }], "eq"],
  enum:    [[{ value: "is", label: "is" }, { value: "is_not", label: "is not" }, { value: "is_empty", label: "is empty" }, { value: "is_not_empty", label: "is not empty" }], "is"],
  boolean: [[{ value: "is", label: "is" }], "is"],
};
const getOps = (t: FieldType) => OPS[t === "entity_link" ? "enum" : t] ?? OPS.text;
const NO_VAL = new Set<Operator>(["is_empty", "is_not_empty"]);

const OP_MAP: Record<Operator, (k: string, v: string | null) => WhereClause> = {
  contains:     (k, v) => ({ [k]: { $ilike: `%${v}%` } }),
  not_contains: (k, v) => ({ $not: { [k]: { $ilike: `%${v}%` } } }),
  eq:           (k, v) => ({ [k]: { $eq: v } }),
  ne:           (k, v) => ({ [k]: { $ne: v } }),
  gt:           (k, v) => ({ [k]: { $gt: v } }),
  gte:          (k, v) => ({ [k]: { $gte: v } }),
  lt:           (k, v) => ({ [k]: { $lt: v } }),
  lte:          (k, v) => ({ [k]: { $lte: v } }),
  is:           (k, v) => ({ [k]: { $eq: v } }),
  is_not:       (k, v) => ({ [k]: { $ne: v } }),
  is_empty:     (k)    => ({ [k]: { $isNull: true } }),
  is_not_empty: (k)    => ({ [k]: { $isNull: false } }),
};

export function buildWhereClause(filters: ActiveFilter[]): WhereClause | undefined {
  if (!filters.length) return undefined;
  const clauses = filters.map(f => OP_MAP[f.operator](f.field.key, f.value));
  return clauses.length === 1 ? clauses[0] : { $and: clauses };
}

function ValuePicker({ field, value, onChange }: { field: FilterFieldDef; value: string; onChange: (v: string) => void }) {
  if (field.type === "boolean") return (
    <Select value={value || "true"} onValueChange={onChange}>
      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="true"  className="text-xs">True</SelectItem>
        <SelectItem value="false" className="text-xs">False</SelectItem>
      </SelectContent>
    </Select>
  );
  if ((field.type === "enum" || field.type === "entity_link") && field.options) return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select…" /></SelectTrigger>
      <SelectContent>{field.options.map(o => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}</SelectContent>
    </Select>
  );
  return (
    <Input
      type={field.type === "date" ? "date" : field.type === "number" ? "number" : "text"}
      className="h-8 text-xs" placeholder="Enter value…" value={value}
      onChange={e => onChange(e.target.value)}
      autoFocus={field.type === "text"}
    />
  );
}

function FilterPill({ filter, onUpdate, onRemove }: { filter: ActiveFilter; onUpdate: (f: ActiveFilter) => void; onRemove: () => void }) {
  const [open, setOpen] = useState(false);
  const [ops] = getOps(filter.field.type);
  const noValue = NO_VAL.has(filter.operator);
  const opLabel = ops.find(o => o.value === filter.operator)?.label ?? filter.operator;
  const valLabel = noValue ? null
    : (filter.field.type === "enum" || filter.field.type === "entity_link")
      ? filter.field.options?.find(o => o.value === filter.value)?.label ?? filter.value
      : filter.value;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors bg-background hover:bg-muted border-border text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className="text-muted-foreground">{filter.field.label}</span>
          <span>{opLabel}</span>
          {valLabel && <span className="text-primary font-semibold">{valLabel}</span>}
          <IconChevronDown className="h-3 w-3 text-muted-foreground ml-0.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3 space-y-3" align="start">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{filter.field.label}</p>
        <Select value={filter.operator} onValueChange={v => {
          const op = v as Operator;
          onUpdate({ ...filter, operator: op, value: NO_VAL.has(op) ? null : filter.value });
        }}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{ops.map(op => <SelectItem key={op.value} value={op.value} className="text-xs">{op.label}</SelectItem>)}</SelectContent>
        </Select>
        {!noValue && <ValuePicker field={filter.field} value={filter.value ?? ""} onChange={v => onUpdate({ ...filter, value: v || null })} />}
        <Separator />
        <Button variant="ghost" size="sm" className="w-full text-destructive hover:text-destructive text-xs" onClick={() => { onRemove(); setOpen(false); }}>
          <IconX className="h-3 w-3 mr-1" /> Remove filter
        </Button>
      </PopoverContent>
    </Popover>
  );
}

function AddFilterPopover({ fields, onAdd }: { fields: FilterFieldDef[]; onAdd: (f: ActiveFilter) => void }) {
  const [open, setOpen]         = useState(false);
  const [field, setField]       = useState<FilterFieldDef | null>(null);
  const [operator, setOperator] = useState<Operator>("contains");
  const [value, setValue]       = useState("");

  const reset = () => { setField(null); setOperator("contains"); setValue(""); };
  const selectField = (f: FilterFieldDef) => { setField(f); setOperator(getOps(f.type)[1]); setValue(""); };
  const apply = () => {
    if (!field) return;
    onAdd({ id: `${field.key}-${Date.now()}`, field, operator, value: NO_VAL.has(operator) ? null : value || null });
    setOpen(false);
    reset();
  };

  const [ops] = field ? getOps(field.type) : [[]];

  return (
    <Popover open={open} onOpenChange={o => { setOpen(o); if (!o) reset(); }}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs border-dashed">
          <IconPlus className="h-3 w-3" /> Add filter
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        {!field ? (
          <div className="py-1">
            <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Filter by</p>
            {fields.map(f => (
              <button key={f.key} className="w-full flex items-center px-3 py-1.5 text-sm hover:bg-muted transition-colors text-left" onClick={() => selectField(f)}>
                {f.label}
              </button>
            ))}
          </div>
        ) : (
          <form className="p-3 space-y-3" onSubmit={e => { e.preventDefault(); apply(); }}>
            <button type="button" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors" onClick={() => setField(null)}>
              ← {field.label}
            </button>
            <Select value={operator} onValueChange={v => { setOperator(v as Operator); setValue(""); }}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{ops.map(op => <SelectItem key={op.value} value={op.value} className="text-xs">{op.label}</SelectItem>)}</SelectContent>
            </Select>
            {!NO_VAL.has(operator) && <ValuePicker field={field} value={value} onChange={setValue} />}
            <Button type="submit" size="sm" className="w-full h-7 text-xs">Apply</Button>
          </form>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function FilterBuilder({ fields, filters, onChange }: {
  fields: FilterFieldDef[];
  filters: ActiveFilter[];
  onChange: (filters: ActiveFilter[]) => void;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <IconFilter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      {filters.map(f => (
        <FilterPill key={f.id} filter={f}
          onUpdate={u => onChange(filters.map(x => x.id === f.id ? u : x))}
          onRemove={() => onChange(filters.filter(x => x.id !== f.id))}
        />
      ))}
      <AddFilterPopover fields={fields} onAdd={f => onChange([...filters, f])} />
      {filters.length > 0 && (
        <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground px-2" onClick={() => onChange([])}>
          <IconX className="h-3 w-3 mr-1" /> Clear
        </Button>
      )}
    </div>
  );
}
