import { useState } from "react";
import { useAppCollection } from "@rootcx/sdk";
import { PageHeader, DataTable, FormDialog, ConfirmDialog, EmptyState, SearchInput, Button, toast } from "@rootcx/ui";
import { IconPlus, IconEdit, IconTrash, IconChecklist, IconCheck } from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { FilterBuilder, buildWhereClause } from "@/components/FilterBuilder";
import type { ActiveFilter, FilterFieldDef } from "@/components/FilterBuilder";
import { mergeWhere, buildSearchClause } from "@/lib/search";
import { APP_ID, TYPE_STYLES } from "@/lib/constants";
import type { Contact, Company, Deal, Activity } from "@/lib/types";

const ACTIVITY_TYPES = ["Call", "Email", "Meeting", "Task"];

const FILTER_FIELDS: FilterFieldDef[] = [
  { key: "type",     label: "Type",     type: "enum", options: ACTIVITY_TYPES.map(t => ({ label: t, value: t })) },
  { key: "due_date", label: "Due date", type: "date" },
];

export default function ActivitiesView() {
  const [filters, setFilters]           = useState<ActiveFilter[]>([]);
  const [search, setSearch]             = useState("");
  const [filterDone, setFilterDone]     = useState<"all" | "pending" | "done">("all");
  const [formOpen, setFormOpen]         = useState(false);
  const [editTarget, setEditTarget]     = useState<Activity | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Activity | null>(null);

  const doneClause = filterDone === "pending" ? { done: { $eq: false } } : filterDone === "done" ? { done: { $eq: true } } : undefined;
  const where = mergeWhere(mergeWhere(buildWhereClause(filters), doneClause), buildSearchClause(search, ["subject", "body"]));

  const { data: activities, loading, create, update, remove } = useAppCollection<Activity>(APP_ID, "activities", where ? { where } : undefined);
  const { data: contacts }  = useAppCollection<Contact>(APP_ID, "contacts");
  const { data: companies } = useAppCollection<Company>(APP_ID, "companies");
  const { data: deals }     = useAppCollection<Deal>(APP_ID, "deals");

  const formFields = [
    { name: "type",       label: "Type",    type: "select"   as const, required: true, options: ACTIVITY_TYPES.map(t => ({ label: t, value: t })) },
    { name: "subject",    label: "Subject", type: "text"     as const, required: true },
    { name: "body",       label: "Notes",   type: "textarea" as const },
    { name: "contact_id", label: "Contact", type: "select"   as const, options: contacts.map(c => ({ label: `${c.first_name} ${c.last_name}`, value: c.id })) },
    { name: "company_id", label: "Company", type: "select"   as const, options: companies.map(c => ({ label: c.name, value: c.id })) },
    { name: "deal_id",    label: "Deal",    type: "select"   as const, options: deals.map(d => ({ label: d.title, value: d.id })) },
    { name: "due_date",   label: "Due Date",type: "date"     as const },
  ];

  const contactName = (id?: string) => { const c = contacts.find(c => c.id === id); return c ? `${c.first_name} ${c.last_name}` : "—"; };

  const columns: ColumnDef<Activity, unknown>[] = [
    {
      id: "done", header: "",
      cell: ({ row: { original: r } }) => (
        <button onClick={e => { e.stopPropagation(); update(r.id, { done: !r.done }); }}
          className={cn("flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors",
            r.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-muted-foreground hover:border-emerald-500")}
        >
          {r.done && <IconCheck className="h-3 w-3" />}
        </button>
      ),
    },
    {
      accessorKey: "subject", header: "Subject",
      cell: ({ row: { original: r } }) => (
        <div className="flex flex-col">
          <span className={cn("font-medium", r.done && "line-through text-muted-foreground")}>{r.subject}</span>
          {r.body && <span className="text-xs text-muted-foreground truncate max-w-xs">{r.body}</span>}
        </div>
      ),
    },
    { accessorKey: "type",       header: "Type",    cell: ({ row: { original: r } }) => <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", TYPE_STYLES[r.type] ?? "bg-gray-100 text-gray-700")}>{r.type}</span> },
    { accessorKey: "contact_id", header: "Contact", cell: ({ row: { original: r } }) => contactName(r.contact_id) },
    { accessorKey: "company_id", header: "Company", cell: ({ row: { original: r } }) => companies.find(c => c.id === r.company_id)?.name ?? "—" },
    { accessorKey: "deal_id",    header: "Deal",    cell: ({ row: { original: r } }) => deals.find(d => d.id === r.deal_id)?.title ?? "—" },
    { accessorKey: "due_date",   header: "Due Date",cell: ({ row: { original: r } }) => r.due_date || "—" },
  ];

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      if (editTarget) { await update(editTarget.id, values); toast.success("Activity updated"); }
      else { await create({ ...values, done: false }); toast.success("Activity logged"); }
      setFormOpen(false); setEditTarget(null);
    } catch { toast.error("Something went wrong"); }
  };

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="Activities"
        description={filterDone === "pending" ? `${activities.length} pending` : "Log and track your sales activities"}
        actions={<Button onClick={() => { setEditTarget(null); setFormOpen(true); }}><IconPlus className="h-4 w-4 mr-1.5" /> Log Activity</Button>}
      />
      <div className="flex items-center gap-3 flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="Search activities…" debounceMs={300} />
        <div className="flex gap-1.5">
          {(["all", "pending", "done"] as const).map(f => (
            <button key={f} onClick={() => setFilterDone(f)}
              className={cn("px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors",
                filterDone === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80")}
            >{f}</button>
          ))}
        </div>
        <FilterBuilder fields={FILTER_FIELDS} filters={filters} onChange={setFilters} />
      </div>
      <DataTable data={activities} columns={columns} loading={loading} pageSize={15} selectable
        rowActions={[
          { label: "Edit",   icon: <IconEdit  className="h-4 w-4" />, onClick: row => { setEditTarget(row); setFormOpen(true); } },
          { label: "Delete", icon: <IconTrash className="h-4 w-4" />, onClick: row => setDeleteTarget(row), destructive: true },
        ]}
        bulkActions={[{ label: "Delete selected", destructive: true, onClick: async rows => { await Promise.all(rows.map(r => remove(r.id))); toast.success(`${rows.length} activities deleted`); } }]}
        emptyState={<EmptyState icon={<IconChecklist className="h-8 w-8" />} title="No activities" description="Log calls, emails, meetings, and tasks" action={<Button onClick={() => { setEditTarget(null); setFormOpen(true); }}><IconPlus className="h-4 w-4 mr-1.5" /> Log Activity</Button>} />}
      />
      <FormDialog open={formOpen} onOpenChange={o => { setFormOpen(o); if (!o) setEditTarget(null); }}
        title={editTarget ? "Edit Activity" : "Log Activity"} description={editTarget ? "Update activity details" : "Record a new activity"}
        fields={formFields} defaultValues={editTarget ?? {}} onSubmit={handleSubmit} submitLabel={editTarget ? "Save Changes" : "Log Activity"}
      />
      <ConfirmDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}
        title="Delete Activity" description={`Are you sure you want to delete "${deleteTarget?.subject}"? This cannot be undone.`}
        onConfirm={async () => { if (!deleteTarget) return; try { await remove(deleteTarget.id); toast.success("Activity deleted"); setDeleteTarget(null); } catch { toast.error("Failed to delete activity"); } }}
        confirmLabel="Delete" destructive
      />
    </div>
  );
}
