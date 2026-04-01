import { useState } from "react";
import { useAppCollection } from "@rootcx/sdk";
import {
  PageHeader, DataTable, FormDialog, ConfirmDialog, EmptyState,
  Badge, Switch, toast,
} from "@rootcx/ui";
import { IconPlus, IconEdit, IconTrash, IconChecklist, IconCheck } from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";

const APP_ID = "crm";

interface Contact { id: string; first_name: string; last_name: string; }
interface Deal { id: string; title: string; }
interface Activity {
  id: string;
  type: string;
  subject: string;
  body: string;
  contact_id: string;
  deal_id: string;
  due_date: string;
  done: boolean;
}

const TYPE_STYLES: Record<string, string> = {
  Call:    "bg-blue-100 text-blue-700",
  Email:   "bg-violet-100 text-violet-700",
  Meeting: "bg-emerald-100 text-emerald-700",
  Task:    "bg-orange-100 text-orange-700",
};

export default function ActivitiesView() {
  const { data: activities, loading, create, update, remove } = useAppCollection<Activity>(APP_ID, "activities");
  const { data: contacts } = useAppCollection<Contact>(APP_ID, "contacts");
  const { data: deals } = useAppCollection<Deal>(APP_ID, "deals");

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Activity | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Activity | null>(null);
  const [filterDone, setFilterDone] = useState<"all" | "pending" | "done">("all");

  const contactName = (id: string) => {
    const c = contacts.find(c => c.id === id);
    return c ? `${c.first_name} ${c.last_name}` : "—";
  };
  const dealName = (id: string) => deals.find(d => d.id === id)?.title ?? "—";

  const filteredActivities = activities.filter(a => {
    if (filterDone === "pending") return !a.done;
    if (filterDone === "done") return a.done;
    return true;
  });

  const columns: ColumnDef<Activity, unknown>[] = [
    {
      id: "done",
      header: "",
      cell: ({ row }) => (
        <button
          onClick={async (e) => {
            e.stopPropagation();
            await update(row.original.id, { done: !row.original.done });
            toast.success(row.original.done ? "Marked as pending" : "Marked as done");
          }}
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors",
            row.original.done
              ? "border-emerald-500 bg-emerald-500 text-white"
              : "border-muted-foreground hover:border-emerald-500"
          )}
        >
          {row.original.done && <IconCheck className="h-3 w-3" />}
        </button>
      ),
    },
    {
      accessorKey: "subject",
      header: "Subject",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className={cn("font-medium", row.original.done && "line-through text-muted-foreground")}>
            {row.original.subject}
          </span>
          {row.original.body && (
            <span className="text-xs text-muted-foreground truncate max-w-xs">{row.original.body}</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => (
        <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", TYPE_STYLES[row.original.type] ?? "bg-gray-100 text-gray-700")}>
          {row.original.type}
        </span>
      ),
    },
    {
      accessorKey: "contact_id",
      header: "Contact",
      cell: ({ row }) => row.original.contact_id ? contactName(row.original.contact_id) : "—",
    },
    {
      accessorKey: "deal_id",
      header: "Deal",
      cell: ({ row }) => row.original.deal_id ? dealName(row.original.deal_id) : "—",
    },
    { accessorKey: "due_date", header: "Due Date", cell: ({ row }) => row.original.due_date || "—" },
  ];

  const formFields = [
    {
      name: "type", label: "Type", type: "select" as const, required: true,
      options: ["Call", "Email", "Meeting", "Task"].map(t => ({ label: t, value: t })),
    },
    { name: "subject", label: "Subject", type: "text" as const, required: true },
    { name: "body", label: "Description", type: "textarea" as const },
    {
      name: "contact_id", label: "Contact", type: "select" as const,
      options: contacts.map(c => ({ label: `${c.first_name} ${c.last_name}`, value: c.id })),
    },
    {
      name: "deal_id", label: "Deal", type: "select" as const,
      options: deals.map(d => ({ label: d.title, value: d.id })),
    },
    { name: "due_date", label: "Due Date", type: "date" as const },
  ];

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      if (editTarget) {
        await update(editTarget.id, values);
        toast.success("Activity updated");
      } else {
        await create({ ...values, done: false });
        toast.success("Activity created");
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
      toast.success("Activity deleted");
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to delete activity");
    }
  };

  const pendingCount = activities.filter(a => !a.done).length;

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Activities"
        description={`${pendingCount} pending ${pendingCount === 1 ? "activity" : "activities"}`}
        actions={
          <button
            onClick={() => { setEditTarget(null); setFormOpen(true); }}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <IconPlus className="h-4 w-4" /> Log Activity
          </button>
        }
      />

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(["all", "pending", "done"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilterDone(f)}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors",
              filterDone === f
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      <DataTable
        data={filteredActivities}
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
              toast.success(`${rows.length} activities deleted`);
            },
            destructive: true,
          },
        ]}
        emptyState={
          <EmptyState
            icon={<IconChecklist className="h-8 w-8" />}
            title="No activities"
            description="Log calls, emails, meetings, and tasks"
            action={
              <button
                onClick={() => { setEditTarget(null); setFormOpen(true); }}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
              >
                <IconPlus className="h-4 w-4" /> Log Activity
              </button>
            }
          />
        }
      />

      <FormDialog
        open={formOpen}
        onOpenChange={(o) => { setFormOpen(o); if (!o) setEditTarget(null); }}
        title={editTarget ? "Edit Activity" : "Log Activity"}
        description={editTarget ? "Update activity details" : "Record a new activity"}
        fields={formFields}
        defaultValues={editTarget ?? {}}
        onSubmit={handleSubmit}
        submitLabel={editTarget ? "Save Changes" : "Log Activity"}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete Activity"
        description={`Are you sure you want to delete "${deleteTarget?.subject}"? This cannot be undone.`}
        onConfirm={handleDelete}
        confirmLabel="Delete"
        destructive
      />
    </div>
  );
}
