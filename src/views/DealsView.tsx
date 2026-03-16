import { useState } from "react";
import { useAppCollection } from "@rootcx/sdk";
import {
  PageHeader, DataTable, FormDialog, ConfirmDialog, EmptyState,
  Tabs, TabsList, TabsTrigger, TabsContent,
  Card, CardContent,
  toast,
} from "@rootcx/ui";
import { IconPlus, IconEdit, IconTrash, IconCurrencyDollar } from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";

const APP_ID = "crm";

interface Contact { id: string; first_name: string; last_name: string; }
interface Company { id: string; name: string; }
interface Deal {
  id: string;
  title: string;
  value: number;
  stage: string;
  contact_id: string;
  company_id: string;
  close_date: string;
  notes: string;
}

const STAGES = ["Lead", "Qualified", "Proposal", "Negotiation", "Closed Won", "Closed Lost"];

const STAGE_STYLES: Record<string, string> = {
  Lead: "bg-slate-100 text-slate-700 border-slate-200",
  Qualified: "bg-blue-100 text-blue-700 border-blue-200",
  Proposal: "bg-purple-100 text-purple-700 border-purple-200",
  Negotiation: "bg-yellow-100 text-yellow-700 border-yellow-200",
  "Closed Won": "bg-green-100 text-green-700 border-green-200",
  "Closed Lost": "bg-red-100 text-red-700 border-red-200",
};

const PIPELINE_STAGES = ["Lead", "Qualified", "Proposal", "Negotiation"];

export default function DealsView() {
  const { data: deals, loading, create, update, remove } = useAppCollection<Deal>(APP_ID, "deals");
  const { data: contacts } = useAppCollection<Contact>(APP_ID, "contacts");
  const { data: companies } = useAppCollection<Company>(APP_ID, "companies");

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Deal | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Deal | null>(null);

  const contactName = (id: string) => {
    const c = contacts.find(c => c.id === id);
    return c ? `${c.first_name} ${c.last_name}` : "—";
  };
  const companyName = (id: string) => companies.find(c => c.id === id)?.name ?? "—";

  const columns: ColumnDef<Deal, unknown>[] = [
    {
      accessorKey: "title",
      header: "Deal",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.title}</span>
          {row.original.contact_id && <span className="text-xs text-muted-foreground">{contactName(row.original.contact_id)}</span>}
        </div>
      ),
    },
    {
      accessorKey: "value",
      header: "Value",
      cell: ({ row }) => row.original.value != null
        ? <span className="font-semibold text-emerald-600">${row.original.value.toLocaleString()}</span>
        : "—",
    },
    {
      accessorKey: "stage",
      header: "Stage",
      cell: ({ row }) => (
        <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium border", STAGE_STYLES[row.original.stage] ?? "bg-gray-100 text-gray-700")}>
          {row.original.stage}
        </span>
      ),
    },
    {
      accessorKey: "company_id",
      header: "Company",
      cell: ({ row }) => row.original.company_id ? companyName(row.original.company_id) : "—",
    },
    { accessorKey: "close_date", header: "Close Date", cell: ({ row }) => row.original.close_date || "—" },
  ];

  const formFields = [
    { name: "title", label: "Deal Title", type: "text" as const, required: true },
    { name: "value", label: "Value ($)", type: "number" as const },
    {
      name: "stage", label: "Stage", type: "select" as const, required: true,
      options: STAGES.map(s => ({ label: s, value: s })),
    },
    {
      name: "contact_id", label: "Contact", type: "select" as const,
      options: contacts.map(c => ({ label: `${c.first_name} ${c.last_name}`, value: c.id })),
    },
    {
      name: "company_id", label: "Company", type: "select" as const,
      options: companies.map(c => ({ label: c.name, value: c.id })),
    },
    { name: "close_date", label: "Expected Close Date", type: "date" as const },
    { name: "notes", label: "Notes", type: "textarea" as const },
  ];

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      if (editTarget) {
        await update(editTarget.id, values);
        toast.success("Deal updated");
      } else {
        await create(values);
        toast.success("Deal created");
      }
      setFormOpen(false);
      setEditTarget(null);
    } catch {
      toast.error("Something went wrong");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await remove(deleteTarget.id);
      toast.success("Deal deleted");
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to delete deal");
    }
  };

  const totalPipelineValue = deals
    .filter(d => PIPELINE_STAGES.includes(d.stage))
    .reduce((sum, d) => sum + (d.value ?? 0), 0);

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Deals"
        description="Track your sales pipeline and close deals"
        actions={
          <button
            onClick={() => { setEditTarget(null); setFormOpen(true); }}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <IconPlus className="h-4 w-4" /> Add Deal
          </button>
        }
      />

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">List</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
        </TabsList>

        {/* List View */}
        <TabsContent value="list" className="mt-4">
          <DataTable
            data={deals}
            columns={columns}
            loading={loading}
            searchable
            pagination
            pageSize={15}
            selectable
            rowActions={[
              {
                label: "Edit",
                icon: <IconEdit className="h-4 w-4" />,
                onClick: (row) => { setEditTarget(row); setFormOpen(true); },
              },
              {
                label: "Delete",
                icon: <IconTrash className="h-4 w-4" />,
                onClick: (row) => setDeleteTarget(row),
                destructive: true,
              },
            ]}
            bulkActions={[
              {
                label: "Delete selected",
                onClick: async (rows) => {
                  await Promise.all(rows.map(r => remove(r.id)));
                  toast.success(`${rows.length} deals deleted`);
                },
                destructive: true,
              },
            ]}
            emptyState={
              <EmptyState
                icon={<IconCurrencyDollar className="h-8 w-8" />}
                title="No deals yet"
                description="Start tracking your sales pipeline"
                action={
                  <button
                    onClick={() => { setEditTarget(null); setFormOpen(true); }}
                    className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
                  >
                    <IconPlus className="h-4 w-4" /> Add Deal
                  </button>
                }
              />
            }
          />
        </TabsContent>

        {/* Kanban Pipeline View */}
        <TabsContent value="pipeline" className="mt-4">
          <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <IconCurrencyDollar className="h-4 w-4" />
            <span>Pipeline value: <strong className="text-foreground">${totalPipelineValue.toLocaleString()}</strong></span>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {PIPELINE_STAGES.map(stage => {
              const stageDeals = deals.filter(d => d.stage === stage);
              const stageValue = stageDeals.reduce((s, d) => s + (d.value ?? 0), 0);
              return (
                <div key={stage} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium border", STAGE_STYLES[stage])}>
                      {stage}
                    </span>
                    <span className="text-xs text-muted-foreground">{stageDeals.length}</span>
                  </div>
                  {stageValue > 0 && (
                    <p className="text-xs text-muted-foreground">${stageValue.toLocaleString()}</p>
                  )}
                  <div className="flex flex-col gap-2 min-h-24">
                    {stageDeals.length === 0 && (
                      <div className="rounded-lg border border-dashed p-3 text-xs text-center text-muted-foreground">
                        No deals
                      </div>
                    )}
                    {stageDeals.map(deal => (
                      <Card key={deal.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setEditTarget(deal); setFormOpen(true); }}>
                        <CardContent className="p-3 space-y-1">
                          <p className="text-sm font-medium leading-tight">{deal.title}</p>
                          {deal.value != null && (
                            <p className="text-xs font-semibold text-emerald-600">${deal.value.toLocaleString()}</p>
                          )}
                          {deal.company_id && (
                            <p className="text-xs text-muted-foreground">{companyName(deal.company_id)}</p>
                          )}
                          {deal.close_date && (
                            <p className="text-xs text-muted-foreground">Close: {deal.close_date}</p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      <FormDialog
        open={formOpen}
        onOpenChange={(o) => { setFormOpen(o); if (!o) setEditTarget(null); }}
        title={editTarget ? "Edit Deal" : "New Deal"}
        description={editTarget ? "Update deal details" : "Add a new deal to your pipeline"}
        fields={formFields}
        defaultValues={editTarget ?? {}}
        onSubmit={handleSubmit}
        submitLabel={editTarget ? "Save Changes" : "Create Deal"}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete Deal"
        description={`Are you sure you want to delete "${deleteTarget?.title}"? This cannot be undone.`}
        onConfirm={handleDelete}
        confirmLabel="Delete"
        destructive
      />
    </div>
  );
}
