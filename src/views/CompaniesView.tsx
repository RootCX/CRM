import { useState } from "react";
import { useAppCollection } from "@rootcx/sdk";
import { PageHeader, DataTable, FormDialog, ConfirmDialog, EmptyState, Tabs, TabsList, TabsTrigger, TabsContent, Button, Separator, toast } from "@rootcx/ui";
import { IconPlus, IconEdit, IconTrash, IconBuilding, IconNotes, IconWorld, IconPhone, IconMapPin } from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { NotesTab } from "@/components/notes/NotesTab";
import { FilterBuilder, buildWhereClause } from "@/components/FilterBuilder";
import type { ActiveFilter, FilterFieldDef } from "@/components/FilterBuilder";
import type { Company } from "@/lib/types";

const APP_ID = "crm";

const INDUSTRY_COLORS: Record<string, string> = {
  Technology: "bg-blue-100 text-blue-700", Finance: "bg-emerald-100 text-emerald-700",
  Healthcare: "bg-red-100 text-red-700",   Retail: "bg-orange-100 text-orange-700",
  Manufacturing: "bg-gray-100 text-gray-700", "Real Estate": "bg-yellow-100 text-yellow-700",
  Education: "bg-purple-100 text-purple-700", Other: "bg-slate-100 text-slate-700",
};
const INDUSTRIES = Object.keys(INDUSTRY_COLORS);

const FORM_FIELDS = [
  { name: "name",     label: "Company Name", type: "text"   as const, required: true },
  { name: "industry", label: "Industry",     type: "select" as const, options: INDUSTRIES.map(i => ({ label: i, value: i })) },
  { name: "website",  label: "Website",      type: "text"   as const },
  { name: "phone",    label: "Phone",        type: "text"   as const },
  { name: "address",  label: "Address",      type: "text"   as const },
];

const FILTER_FIELDS: FilterFieldDef[] = [
  { key: "name",     label: "Name",     type: "text" },
  { key: "website",  label: "Website",  type: "text" },
  { key: "phone",    label: "Phone",    type: "text" },
  { key: "address",  label: "Address",  type: "text" },
  { key: "industry", label: "Industry", type: "enum", options: INDUSTRIES.map(i => ({ label: i, value: i })) },
];

function InfoRow({ icon, label, value, href }: { icon: React.ReactNode; label: string; value?: string | null; href?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0 text-muted-foreground">{icon}</div>
      <div className="flex flex-col min-w-0">
        <span className="text-xs text-muted-foreground">{label}</span>
        {href
          ? <a href={href} target="_blank" rel="noreferrer" className="text-sm text-primary underline truncate">{value}</a>
          : <span className="text-sm">{value}</span>}
      </div>
    </div>
  );
}

function CompanyDetail({ company, onBack, onEdit }: { company: Company; onBack: () => void; onEdit: () => void }) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-6 pb-4">
        <PageHeader title={company.name} description={company.industry ?? "No industry set"} onBack={onBack}
          actions={<Button variant="outline" size="sm" onClick={onEdit}><IconEdit className="h-4 w-4 mr-1.5" /> Edit</Button>}
        />
      </div>
      <div className="flex flex-1 gap-0 overflow-hidden px-6 pb-6">
        <div className="flex flex-col gap-4 w-64 shrink-0 pr-6">
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 text-primary text-2xl font-bold">
              {company.name.charAt(0).toUpperCase()}
            </div>
            <p className="font-semibold text-lg text-center">{company.name}</p>
            {company.industry && (
              <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", INDUSTRY_COLORS[company.industry] ?? "bg-gray-100 text-gray-700")}>
                {company.industry}
              </span>
            )}
          </div>
          <Separator />
          <div className="flex flex-col gap-3">
            <InfoRow icon={<IconWorld className="h-4 w-4" />}  label="Website" value={company.website} href={company.website} />
            <InfoRow icon={<IconPhone className="h-4 w-4" />}  label="Phone"   value={company.phone} />
            <InfoRow icon={<IconMapPin className="h-4 w-4" />} label="Address" value={company.address} />
          </div>
        </div>
        <Separator orientation="vertical" />
        <div className="flex flex-col flex-1 overflow-hidden pl-6">
          <Tabs defaultValue="notes" className="flex flex-col flex-1 overflow-hidden">
            <TabsList className="w-fit">
              <TabsTrigger value="notes"><IconNotes className="h-4 w-4 mr-1.5" /> Notes</TabsTrigger>
            </TabsList>
            <TabsContent value="notes" className="flex-1 overflow-hidden mt-4">
              <NotesTab filterKey="company_id" filterId={company.id} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

export default function CompaniesView() {
  const [filters, setFilters]           = useState<ActiveFilter[]>([]);
  const [selectedId, setSelectedId]     = useState<string | null>(null);
  const [formOpen, setFormOpen]         = useState(false);
  const [editTarget, setEditTarget]     = useState<Company | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);

  const where = buildWhereClause(filters);
  const { data: companies, loading, create, update, remove } = useAppCollection<Company>(APP_ID, "companies", where ? { where } : undefined);

  const selected = companies.find(c => c.id === selectedId) ?? null;
  const openEdit = (c: Company) => { setEditTarget(c); setFormOpen(true); };

  const columns: ColumnDef<Company, unknown>[] = [
    {
      accessorKey: "name", header: "Company",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-muted text-sm font-semibold shrink-0">
            {row.original.name.charAt(0).toUpperCase()}
          </div>
          <span className="font-medium">{row.original.name}</span>
        </div>
      ),
    },
    { accessorKey: "industry", header: "Industry", cell: ({ row }) => row.original.industry ? <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", INDUSTRY_COLORS[row.original.industry] ?? "bg-gray-100 text-gray-700")}>{row.original.industry}</span> : "—" },
    { accessorKey: "website",  header: "Website",  cell: ({ row }) => row.original.website ? <a href={row.original.website} target="_blank" rel="noreferrer" className="text-primary underline text-sm">{row.original.website}</a> : "—" },
    { accessorKey: "phone",    header: "Phone",    cell: ({ row }) => row.original.phone   || "—" },
    { accessorKey: "address",  header: "Address",  cell: ({ row }) => row.original.address || "—" },
  ];

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      if (editTarget) { await update(editTarget.id, values); toast.success("Company updated"); }
      else            { await create(values);                toast.success("Company created"); }
      setFormOpen(false); setEditTarget(null);
    } catch { toast.error("Something went wrong"); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await remove(deleteTarget.id);
      toast.success("Company deleted");
      if (selectedId === deleteTarget.id) setSelectedId(null);
      setDeleteTarget(null);
    } catch { toast.error("Failed to delete company"); }
  };

  if (selected) return <CompanyDetail company={selected} onBack={() => setSelectedId(null)} onEdit={() => openEdit(selected)} />;

  const filtered = filters.length > 0;

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="Companies" description="Manage the companies in your pipeline"
        actions={<Button onClick={() => { setEditTarget(null); setFormOpen(true); }}><IconPlus className="h-4 w-4 mr-1.5" /> Add Company</Button>}
      />
      <FilterBuilder fields={FILTER_FIELDS} filters={filters} onChange={setFilters} />
      <DataTable
        data={companies} columns={columns} loading={loading} searchable pageSize={15} selectable
        onRowClick={row => setSelectedId(row.id)}
        rowActions={[
          { label: "Edit",   icon: <IconEdit  className="h-4 w-4" />, onClick: row => openEdit(row) },
          { label: "Delete", icon: <IconTrash className="h-4 w-4" />, onClick: row => setDeleteTarget(row), destructive: true },
        ]}
        bulkActions={[{ label: "Delete selected", destructive: true, onClick: async rows => { await Promise.all(rows.map(r => remove(r.id))); toast.success(`${rows.length} companies deleted`); } }]}
        emptyState={
          <EmptyState icon={<IconBuilding className="h-8 w-8" />}
            title={filtered ? "No companies match these filters" : "No companies yet"}
            description={filtered ? "Try adjusting or clearing your filters" : "Add your first company to track your accounts"}
            action={filtered ? undefined : <Button onClick={() => { setEditTarget(null); setFormOpen(true); }}><IconPlus className="h-4 w-4 mr-1.5" /> Add Company</Button>}
          />
        }
      />
      <FormDialog
        open={formOpen} onOpenChange={o => { setFormOpen(o); if (!o) setEditTarget(null); }}
        title={editTarget ? "Edit Company" : "New Company"}
        description={editTarget ? "Update company details" : "Add a new company to your CRM"}
        fields={FORM_FIELDS} defaultValues={editTarget ? { ...editTarget } : {}}
        onSubmit={handleSubmit} submitLabel={editTarget ? "Save Changes" : "Create Company"}
      />
      <ConfirmDialog
        open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}
        title="Delete Company" description={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        onConfirm={handleDelete} confirmLabel="Delete" destructive
      />
    </div>
  );
}
