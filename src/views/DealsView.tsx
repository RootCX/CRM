import { useState } from "react";
import { useAppCollection } from "@rootcx/sdk";
import { PageHeader, DataTable, FormDialog, ConfirmDialog, EmptyState, Tabs, TabsList, TabsTrigger, TabsContent, Card, CardContent, Button, Separator, toast } from "@rootcx/ui";
import { IconPlus, IconEdit, IconTrash, IconCurrencyDollar, IconNotes } from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { NotesTab } from "@/components/notes/NotesTab";
import { FilterBuilder, buildWhereClause } from "@/components/FilterBuilder";
import type { ActiveFilter, FilterFieldDef } from "@/components/FilterBuilder";
import type { Contact, Company, Deal } from "@/lib/types";

const APP_ID = "crm";
const STAGES = ["Lead", "Qualified", "Proposal", "Negotiation", "Closed Won", "Closed Lost"] as const;
const PIPELINE_STAGES = STAGES.slice(0, 4);
const STAGE_STYLES: Record<string, string> = {
  Lead: "bg-slate-100 text-slate-700 border-slate-200",        Qualified:     "bg-blue-100 text-blue-700 border-blue-200",
  Proposal: "bg-purple-100 text-purple-700 border-purple-200", Negotiation:   "bg-yellow-100 text-yellow-700 border-yellow-200",
  "Closed Won": "bg-green-100 text-green-700 border-green-200","Closed Lost":  "bg-red-100 text-red-700 border-red-200",
};
const STAGE_OPTIONS = STAGES.map(s => ({ label: s, value: s }));

function DealDetail({ deal, contactName, companyName, onBack, onEdit }: {
  deal: Deal; contactName?: string; companyName?: string; onBack: () => void; onEdit: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-6 pb-4">
        <PageHeader title={deal.title} description={[contactName, companyName].filter(Boolean).join(" · ") || "No details"} onBack={onBack}
          actions={<Button variant="outline" size="sm" onClick={onEdit}><IconEdit className="h-4 w-4 mr-1.5" /> Edit</Button>}
        />
      </div>
      <div className="flex flex-1 gap-0 overflow-hidden px-6 pb-6">
        <div className="flex flex-col gap-3 w-56 shrink-0 pr-6 py-4">
          <div><p className="text-xs text-muted-foreground mb-1">Stage</p><span className={cn("text-xs px-2 py-0.5 rounded-full font-medium border", STAGE_STYLES[deal.stage] ?? "bg-gray-100 text-gray-700 border-gray-200")}>{deal.stage}</span></div>
          {deal.value != null && <div><p className="text-xs text-muted-foreground mb-1">Value</p><p className="text-xl font-bold text-emerald-600">${deal.value.toLocaleString()}</p></div>}
          {contactName && <div><p className="text-xs text-muted-foreground mb-1">Contact</p><p className="text-sm">{contactName}</p></div>}
          {companyName && <div><p className="text-xs text-muted-foreground mb-1">Company</p><p className="text-sm">{companyName}</p></div>}
          {deal.close_date && <div><p className="text-xs text-muted-foreground mb-1">Expected Close</p><p className="text-sm">{deal.close_date}</p></div>}
        </div>
        <Separator orientation="vertical" />
        <div className="flex flex-col flex-1 overflow-hidden pl-6">
          <Tabs defaultValue="notes" className="flex flex-col flex-1 overflow-hidden">
            <TabsList className="w-fit"><TabsTrigger value="notes"><IconNotes className="h-4 w-4 mr-1.5" /> Notes</TabsTrigger></TabsList>
            <TabsContent value="notes" className="flex-1 overflow-hidden mt-4"><NotesTab filterKey="deal_id" filterId={deal.id} /></TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

export default function DealsView() {
  const [filters, setFilters]           = useState<ActiveFilter[]>([]);
  const [selectedId, setSelectedId]     = useState<string | null>(null);
  const [formOpen, setFormOpen]         = useState(false);
  const [editTarget, setEditTarget]     = useState<Deal | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Deal | null>(null);

  const where = buildWhereClause(filters);
  const { data: deals, loading, create, update, remove } = useAppCollection<Deal>(APP_ID, "deals", where ? { where } : undefined);
  const { data: contacts }  = useAppCollection<Contact>(APP_ID, "contacts");
  const { data: companies } = useAppCollection<Company>(APP_ID, "companies");

  const contactName = (id?: string) => { const c = contacts.find(c => c.id === id); return c ? `${c.first_name} ${c.last_name}` : undefined; };
  const companyName = (id?: string) => companies.find(c => c.id === id)?.name;
  const selected    = deals.find(d => d.id === selectedId) ?? null;

  const filterFields: FilterFieldDef[] = [
    { key: "title",      label: "Title",      type: "text" },
    { key: "value",      label: "Value",      type: "number" },
    { key: "close_date", label: "Close date", type: "date" },
    { key: "stage",      label: "Stage",      type: "enum",        options: STAGE_OPTIONS },
    { key: "contact_id", label: "Contact",    type: "entity_link", options: contacts.map(c => ({ label: `${c.first_name} ${c.last_name}`, value: c.id })) },
    { key: "company_id", label: "Company",    type: "entity_link", options: companies.map(c => ({ label: c.name, value: c.id })) },
  ];

  const formFields = [
    { name: "title",      label: "Deal Title",         type: "text"   as const, required: true },
    { name: "value",      label: "Value ($)",           type: "number" as const },
    { name: "stage",      label: "Stage",               type: "select" as const, required: true, options: STAGE_OPTIONS },
    { name: "contact_id", label: "Contact",             type: "select" as const, options: contacts.map(c => ({ label: `${c.first_name} ${c.last_name}`, value: c.id })) },
    { name: "company_id", label: "Company",             type: "select" as const, options: companies.map(c => ({ label: c.name, value: c.id })) },
    { name: "close_date", label: "Expected Close Date", type: "date"   as const },
  ];

  const columns: ColumnDef<Deal, unknown>[] = [
    {
      accessorKey: "title", header: "Deal",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.title}</span>
          {row.original.contact_id && <span className="text-xs text-muted-foreground">{contactName(row.original.contact_id)}</span>}
        </div>
      ),
    },
    { accessorKey: "value",      header: "Value",      cell: ({ row }) => row.original.value != null ? <span className="font-semibold text-emerald-600">${row.original.value.toLocaleString()}</span> : "—" },
    { accessorKey: "stage",      header: "Stage",      cell: ({ row }) => <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium border", STAGE_STYLES[row.original.stage] ?? "bg-gray-100 text-gray-700")}>{row.original.stage}</span> },
    { accessorKey: "company_id", header: "Company",    cell: ({ row }) => companyName(row.original.company_id) ?? "—" },
    { accessorKey: "close_date", header: "Close Date", cell: ({ row }) => row.original.close_date || "—" },
  ];

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      if (editTarget) { await update(editTarget.id, values); toast.success("Deal updated"); }
      else            { await create(values);                toast.success("Deal created"); }
      setFormOpen(false); setEditTarget(null);
    } catch { toast.error("Something went wrong"); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await remove(deleteTarget.id);
      toast.success("Deal deleted");
      if (selectedId === deleteTarget.id) setSelectedId(null);
      setDeleteTarget(null);
    } catch { toast.error("Failed to delete deal"); }
  };

  if (selected) return (
    <DealDetail deal={selected} contactName={contactName(selected.contact_id)} companyName={companyName(selected.company_id)}
      onBack={() => setSelectedId(null)} onEdit={() => { setEditTarget(selected); setFormOpen(true); }}
    />
  );

  const filtered = filters.length > 0;
  const totalPipelineValue = deals.filter(d => PIPELINE_STAGES.includes(d.stage as typeof PIPELINE_STAGES[number])).reduce((s, d) => s + (d.value ?? 0), 0);

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="Deals" description="Track your sales pipeline and close deals"
        actions={<Button onClick={() => { setEditTarget(null); setFormOpen(true); }}><IconPlus className="h-4 w-4 mr-1.5" /> Add Deal</Button>}
      />
      <Tabs defaultValue="list">
        <div className="flex flex-col gap-4">
          <TabsList className="w-fit">
            <TabsTrigger value="list">List</TabsTrigger>
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          </TabsList>
          <TabsContent value="list" className="space-y-4 mt-0">
            <FilterBuilder fields={filterFields} filters={filters} onChange={setFilters} />
            <DataTable
              data={deals} columns={columns} loading={loading} searchable pageSize={15} selectable
              onRowClick={row => setSelectedId(row.id)}
              rowActions={[
                { label: "Edit",   icon: <IconEdit  className="h-4 w-4" />, onClick: row => { setEditTarget(row); setFormOpen(true); } },
                { label: "Delete", icon: <IconTrash className="h-4 w-4" />, onClick: row => setDeleteTarget(row), destructive: true },
              ]}
              bulkActions={[{ label: "Delete selected", destructive: true, onClick: async rows => { await Promise.all(rows.map(r => remove(r.id))); toast.success(`${rows.length} deals deleted`); } }]}
              emptyState={
                <EmptyState icon={<IconCurrencyDollar className="h-8 w-8" />}
                  title={filtered ? "No deals match these filters" : "No deals yet"}
                  description={filtered ? "Try adjusting or clearing your filters" : "Start tracking your sales pipeline"}
                  action={filtered ? undefined : <Button onClick={() => { setEditTarget(null); setFormOpen(true); }}><IconPlus className="h-4 w-4 mr-1.5" /> Add Deal</Button>}
                />
              }
            />
          </TabsContent>
          <TabsContent value="pipeline" className="mt-0">
            <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
              <IconCurrencyDollar className="h-4 w-4" />
              Pipeline value: <strong className="text-foreground">${totalPipelineValue.toLocaleString()}</strong>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {PIPELINE_STAGES.map(stage => {
                const stageDeals = deals.filter(d => d.stage === stage);
                const stageValue = stageDeals.reduce((s, d) => s + (d.value ?? 0), 0);
                return (
                  <div key={stage} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium border", STAGE_STYLES[stage])}>{stage}</span>
                      <span className="text-xs text-muted-foreground">{stageDeals.length}</span>
                    </div>
                    {stageValue > 0 && <p className="text-xs text-muted-foreground">${stageValue.toLocaleString()}</p>}
                    <div className="flex flex-col gap-2 min-h-24">
                      {stageDeals.length === 0
                        ? <div className="rounded-lg border border-dashed p-3 text-xs text-center text-muted-foreground">No deals</div>
                        : stageDeals.map(deal => (
                          <Card key={deal.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedId(deal.id)}>
                            <CardContent className="p-3 space-y-1">
                              <p className="text-sm font-medium leading-tight">{deal.title}</p>
                              {deal.value != null && <p className="text-xs font-semibold text-emerald-600">${deal.value.toLocaleString()}</p>}
                              {deal.company_id && <p className="text-xs text-muted-foreground">{companyName(deal.company_id)}</p>}
                              {deal.close_date && <p className="text-xs text-muted-foreground">Close: {deal.close_date}</p>}
                            </CardContent>
                          </Card>
                        ))
                      }
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </div>
      </Tabs>
      <FormDialog
        open={formOpen} onOpenChange={o => { setFormOpen(o); if (!o) setEditTarget(null); }}
        title={editTarget ? "Edit Deal" : "New Deal"} description={editTarget ? "Update deal details" : "Add a new deal to your pipeline"}
        fields={formFields} defaultValues={editTarget ? { ...editTarget } : {}}
        onSubmit={handleSubmit} submitLabel={editTarget ? "Save Changes" : "Create Deal"}
      />
      <ConfirmDialog
        open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}
        title="Delete Deal" description={`Are you sure you want to delete "${deleteTarget?.title}"? This cannot be undone.`}
        onConfirm={handleDelete} confirmLabel="Delete" destructive
      />
    </div>
  );
}
