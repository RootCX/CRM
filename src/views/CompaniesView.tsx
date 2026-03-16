import { useState } from "react";
import { useAppCollection } from "@rootcx/sdk";
import {
  PageHeader, DataTable, FormDialog, ConfirmDialog, EmptyState,
  Badge, toast,
} from "@rootcx/ui";
import { IconPlus, IconEdit, IconTrash, IconBuilding } from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";

const APP_ID = "crm";

interface Company {
  id: string;
  name: string;
  industry: string;
  website: string;
  phone: string;
  address: string;
  notes: string;
}

const INDUSTRY_COLORS: Record<string, string> = {
  Technology: "bg-blue-100 text-blue-700",
  Finance: "bg-emerald-100 text-emerald-700",
  Healthcare: "bg-red-100 text-red-700",
  Retail: "bg-orange-100 text-orange-700",
  Manufacturing: "bg-gray-100 text-gray-700",
  "Real Estate": "bg-yellow-100 text-yellow-700",
  Education: "bg-purple-100 text-purple-700",
  Other: "bg-slate-100 text-slate-700",
};

export default function CompaniesView() {
  const { data: companies, loading, create, update, remove } = useAppCollection<Company>(APP_ID, "companies");

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Company | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);

  const columns: ColumnDef<Company, unknown>[] = [
    {
      accessorKey: "name",
      header: "Company",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-muted text-sm font-semibold shrink-0">
            {row.original.name.charAt(0).toUpperCase()}
          </div>
          <span className="font-medium">{row.original.name}</span>
        </div>
      ),
    },
    {
      accessorKey: "industry",
      header: "Industry",
      cell: ({ row }) => row.original.industry
        ? <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${INDUSTRY_COLORS[row.original.industry] ?? "bg-gray-100 text-gray-700"}`}>{row.original.industry}</span>
        : "—",
    },
    {
      accessorKey: "website",
      header: "Website",
      cell: ({ row }) => row.original.website
        ? <a href={row.original.website} target="_blank" rel="noreferrer" className="text-primary underline text-sm">{row.original.website}</a>
        : "—",
    },
    { accessorKey: "phone", header: "Phone", cell: ({ row }) => row.original.phone || "—" },
    { accessorKey: "address", header: "Address", cell: ({ row }) => row.original.address || "—" },
  ];

  const formFields = [
    { name: "name", label: "Company Name", type: "text" as const, required: true },
    {
      name: "industry", label: "Industry", type: "select" as const,
      options: ["Technology", "Finance", "Healthcare", "Retail", "Manufacturing", "Real Estate", "Education", "Other"]
        .map(i => ({ label: i, value: i })),
    },
    { name: "website", label: "Website", type: "text" as const },
    { name: "phone", label: "Phone", type: "text" as const },
    { name: "address", label: "Address", type: "text" as const },
    { name: "notes", label: "Notes", type: "textarea" as const },
  ];

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      if (editTarget) {
        await update(editTarget.id, values);
        toast.success("Company updated");
      } else {
        await create(values);
        toast.success("Company created");
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
      toast.success("Company deleted");
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to delete company");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Companies"
        description="Manage the companies in your pipeline"
        actions={
          <button
            onClick={() => { setEditTarget(null); setFormOpen(true); }}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <IconPlus className="h-4 w-4" /> Add Company
          </button>
        }
      />

      <DataTable
        data={companies}
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
              toast.success(`${rows.length} companies deleted`);
            },
            destructive: true,
          },
        ]}
        emptyState={
          <EmptyState
            icon={<IconBuilding className="h-8 w-8" />}
            title="No companies yet"
            description="Add your first company to track your accounts"
            action={
              <button
                onClick={() => { setEditTarget(null); setFormOpen(true); }}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
              >
                <IconPlus className="h-4 w-4" /> Add Company
              </button>
            }
          />
        }
      />

      <FormDialog
        open={formOpen}
        onOpenChange={(o) => { setFormOpen(o); if (!o) setEditTarget(null); }}
        title={editTarget ? "Edit Company" : "New Company"}
        description={editTarget ? "Update company details" : "Add a new company to your CRM"}
        fields={formFields}
        defaultValues={editTarget ?? {}}
        onSubmit={handleSubmit}
        submitLabel={editTarget ? "Save Changes" : "Create Company"}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete Company"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        onConfirm={handleDelete}
        confirmLabel="Delete"
        destructive
      />
    </div>
  );
}
