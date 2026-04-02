import { useState } from "react";
import { useAppCollection } from "@rootcx/sdk";
import { PageHeader, DataTable, FormDialog, ConfirmDialog, EmptyState, StatusBadge, Button, SearchInput, toast } from "@rootcx/ui";
import { IconPlus, IconEdit, IconTrash, IconUsers } from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";
import { FilterBuilder, buildWhereClause } from "@/components/FilterBuilder";
import type { ActiveFilter, FilterFieldDef } from "@/components/FilterBuilder";
import type { Company, Contact } from "@/lib/types";
import { mergeWhere, buildSearchClause } from "@/lib/search";

const APP_ID = "crm";

const STATUS_MAP: Record<string, string> = { Lead: "pending", Prospect: "active", Customer: "active", Churned: "error" };

const CONTACT_FILTER_FIELDS: FilterFieldDef[] = [
  { key: "first_name", label: "First name", type: "text" },
  { key: "last_name",  label: "Last name",  type: "text" },
  { key: "email",      label: "Email",      type: "text" },
  { key: "phone",      label: "Phone",      type: "text" },
  { key: "job_title",  label: "Job title",  type: "text" },
  { key: "status",     label: "Status",     type: "enum", options: ["Lead", "Prospect", "Customer", "Churned"].map(s => ({ label: s, value: s })) },
];

const CONTACT_FORM_FIELDS = [
  { name: "first_name", label: "First Name", type: "text"   as const, required: true },
  { name: "last_name",  label: "Last Name",  type: "text"   as const, required: true },
  { name: "email",      label: "Email",      type: "text"   as const },
  { name: "phone",      label: "Phone",      type: "text"   as const },
  { name: "job_title",  label: "Job Title",  type: "text"   as const },
];

export default function ContactsView({ onSelectContact }: { onSelectContact: (id: string) => void }) {
  const [filters, setFilters]       = useState<ActiveFilter[]>([]);
  const [search, setSearch]         = useState("");
  const [formOpen, setFormOpen]     = useState(false);
  const [editTarget, setEditTarget] = useState<Contact | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null);

  const where = mergeWhere(buildWhereClause(filters), buildSearchClause(search, ["first_name", "last_name", "email", "job_title"]));
  const { data: contacts, loading, create, update, remove } = useAppCollection<Contact>(APP_ID, "contacts", where ? { where } : undefined);
  const { data: companies } = useAppCollection<Company>(APP_ID, "companies");

  const companyOptions = companies.map(c => ({ label: c.name, value: c.id }));
  const companyName    = (id: string) => companies.find(c => c.id === id)?.name ?? "—";

  const filterFields: FilterFieldDef[] = [
    ...CONTACT_FILTER_FIELDS,
    { key: "company_id", label: "Company", type: "entity_link", options: companyOptions },
  ];

  const formFields = [
    ...CONTACT_FORM_FIELDS,
    { name: "company_id", label: "Company", type: "select" as const, options: companyOptions },
    { name: "status", label: "Status", type: "select" as const, options: ["Lead", "Prospect", "Customer", "Churned"].map(s => ({ label: s, value: s })) },
  ];

  const columns: ColumnDef<Contact, unknown>[] = [
    {
      accessorKey: "first_name", header: "Name",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.first_name} {row.original.last_name}</span>
          {row.original.email && <span className="text-xs text-muted-foreground">{row.original.email}</span>}
        </div>
      ),
    },
    { accessorKey: "job_title",  header: "Title",   cell: ({ row }) => row.original.job_title  || "—" },
    { accessorKey: "company_id", header: "Company", cell: ({ row }) => row.original.company_id ? companyName(row.original.company_id) : "—" },
    { accessorKey: "phone",      header: "Phone",   cell: ({ row }) => row.original.phone      || "—" },
    { accessorKey: "status",     header: "Status",  cell: ({ row }) => row.original.status ? <StatusBadge status={STATUS_MAP[row.original.status] ?? "default"} /> : "—" },
  ];

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      if (editTarget) { await update(editTarget.id, values); toast.success("Contact updated"); }
      else            { await create(values);                toast.success("Contact created"); }
      setFormOpen(false); setEditTarget(null);
    } catch { toast.error("Something went wrong"); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { await remove(deleteTarget.id); toast.success("Contact deleted"); setDeleteTarget(null); }
    catch { toast.error("Failed to delete contact"); }
  };

  const filtered = filters.length > 0 || !!search;

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="Contacts" description="Manage your contacts and leads"
        actions={<Button onClick={() => { setEditTarget(null); setFormOpen(true); }}><IconPlus className="h-4 w-4 mr-1.5" /> Add Contact</Button>}
      />
      <div className="flex items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search contacts…" debounceMs={300} />
        <FilterBuilder fields={filterFields} filters={filters} onChange={setFilters} />
      </div>
      <DataTable
        data={contacts} columns={columns} loading={loading} pageSize={15} selectable
        onRowClick={row => onSelectContact(row.id)}
        rowActions={[
          { label: "Edit",   icon: <IconEdit  className="h-4 w-4" />, onClick: row => { setEditTarget(row); setFormOpen(true); } },
          { label: "Delete", icon: <IconTrash className="h-4 w-4" />, onClick: row => setDeleteTarget(row), destructive: true },
        ]}
        bulkActions={[{ label: "Delete selected", destructive: true, onClick: async rows => { await Promise.all(rows.map(r => remove(r.id))); toast.success(`${rows.length} contacts deleted`); } }]}
        emptyState={
          <EmptyState icon={<IconUsers className="h-8 w-8" />}
            title={filtered ? "No contacts match these filters" : "No contacts yet"}
            description={filtered ? "Try adjusting or clearing your filters" : "Add your first contact to get started"}
            action={filtered ? undefined : <Button onClick={() => { setEditTarget(null); setFormOpen(true); }}><IconPlus className="h-4 w-4 mr-1.5" /> Add Contact</Button>}
          />
        }
      />
      <FormDialog
        open={formOpen} onOpenChange={o => { setFormOpen(o); if (!o) setEditTarget(null); }}
        title={editTarget ? "Edit Contact" : "New Contact"}
        description={editTarget ? "Update contact details" : "Add a new contact to your CRM"}
        fields={formFields} defaultValues={editTarget ? { ...editTarget } : {}}
        onSubmit={handleSubmit} submitLabel={editTarget ? "Save Changes" : "Create Contact"}
      />
      <ConfirmDialog
        open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}
        title="Delete Contact"
        description={`Are you sure you want to delete ${deleteTarget?.first_name} ${deleteTarget?.last_name}? This cannot be undone.`}
        onConfirm={handleDelete} confirmLabel="Delete" destructive
      />
    </div>
  );
}
