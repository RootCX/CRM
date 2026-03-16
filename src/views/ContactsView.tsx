import { useState } from "react";
import { useAppCollection } from "@rootcx/sdk";
import {
  PageHeader, DataTable, FormDialog, ConfirmDialog, EmptyState,
  StatusBadge, toast,
} from "@rootcx/ui";
import { IconPlus, IconEdit, IconTrash, IconUsers } from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";

const APP_ID = "crm";

interface Company { id: string; name: string; }
interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  job_title: string;
  company_id: string;
  status: string;
  notes: string;
}

const STATUS_MAP: Record<string, string> = {
  Lead: "pending",
  Prospect: "active",
  Customer: "active",
  Churned: "error",
};

interface Props {
  onSelectContact: (id: string) => void;
}

export default function ContactsView({ onSelectContact }: Props) {
  const { data: contacts, loading, create, update, remove } = useAppCollection<Contact>(APP_ID, "contacts");
  const { data: companies } = useAppCollection<Company>(APP_ID, "companies");

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Contact | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null);

  const companyOptions = companies.map(c => ({ label: c.name, value: c.id }));
  const companyName = (id: string) => companies.find(c => c.id === id)?.name ?? "—";

  const columns: ColumnDef<Contact, unknown>[] = [
    {
      accessorKey: "first_name",
      header: "Name",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.first_name} {row.original.last_name}</span>
          {row.original.email && <span className="text-xs text-muted-foreground">{row.original.email}</span>}
        </div>
      ),
    },
    { accessorKey: "job_title", header: "Title", cell: ({ row }) => row.original.job_title || "—" },
    {
      accessorKey: "company_id",
      header: "Company",
      cell: ({ row }) => row.original.company_id ? companyName(row.original.company_id) : "—",
    },
    { accessorKey: "phone", header: "Phone", cell: ({ row }) => row.original.phone || "—" },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => row.original.status
        ? <StatusBadge status={STATUS_MAP[row.original.status] ?? "default"} label={row.original.status} />
        : "—",
    },
  ];

  const formFields = [
    { name: "first_name", label: "First Name", type: "text" as const, required: true },
    { name: "last_name", label: "Last Name", type: "text" as const, required: true },
    { name: "email", label: "Email", type: "text" as const },
    { name: "phone", label: "Phone", type: "text" as const },
    { name: "job_title", label: "Job Title", type: "text" as const },
    { name: "company_id", label: "Company", type: "select" as const, options: companyOptions },
    {
      name: "status", label: "Status", type: "select" as const,
      options: [
        { label: "Lead", value: "Lead" },
        { label: "Prospect", value: "Prospect" },
        { label: "Customer", value: "Customer" },
        { label: "Churned", value: "Churned" },
      ],
    },
    { name: "notes", label: "Notes", type: "textarea" as const },
  ];

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      if (editTarget) {
        await update(editTarget.id, values);
        toast.success("Contact updated");
      } else {
        await create(values);
        toast.success("Contact created");
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
      toast.success("Contact deleted");
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to delete contact");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Contacts"
        description="Manage your contacts and leads"
        actions={
          <button
            onClick={() => { setEditTarget(null); setFormOpen(true); }}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <IconPlus className="h-4 w-4" /> Add Contact
          </button>
        }
      />

      <DataTable
        data={contacts}
        columns={columns}
        loading={loading}
        searchable
        pagination
        pageSize={15}
        selectable
        onRowClick={(row) => onSelectContact(row.id)}
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
              toast.success(`${rows.length} contacts deleted`);
            },
            destructive: true,
          },
        ]}
        emptyState={
          <EmptyState
            icon={<IconUsers className="h-8 w-8" />}
            title="No contacts yet"
            description="Add your first contact to get started"
            action={
              <button
                onClick={() => { setEditTarget(null); setFormOpen(true); }}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
              >
                <IconPlus className="h-4 w-4" /> Add Contact
              </button>
            }
          />
        }
      />

      <FormDialog
        open={formOpen}
        onOpenChange={(o) => { setFormOpen(o); if (!o) setEditTarget(null); }}
        title={editTarget ? "Edit Contact" : "New Contact"}
        description={editTarget ? "Update contact details" : "Add a new contact to your CRM"}
        fields={formFields}
        defaultValues={editTarget ?? {}}
        onSubmit={handleSubmit}
        submitLabel={editTarget ? "Save Changes" : "Create Contact"}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete Contact"
        description={`Are you sure you want to delete ${deleteTarget?.first_name} ${deleteTarget?.last_name}? This cannot be undone.`}
        onConfirm={handleDelete}
        confirmLabel="Delete"
        destructive
      />
    </div>
  );
}
