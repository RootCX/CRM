import { useAppCollection } from "@rootcx/sdk";
import { Button, EmptyState, ScrollArea, toast, FormDialog, ConfirmDialog } from "@rootcx/ui";
import { IconCheck, IconPlus, IconTrash, IconEdit, IconChecklist } from "@tabler/icons-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { APP_ID, TYPE_STYLES } from "@/lib/constants";
import type { Activity, Contact, Company, Deal } from "@/lib/types";

interface Props {
  filterKey: "contact_id" | "company_id" | "deal_id";
  filterId: string;
}

export function ActivitiesTab({ filterKey, filterId }: Props) {
  const { data: all, loading, create, update, remove } = useAppCollection<Activity>(APP_ID, "activities");
  const { data: contacts }  = useAppCollection<Contact>(APP_ID, "contacts");
  const { data: companies } = useAppCollection<Company>(APP_ID, "companies");
  const { data: deals }     = useAppCollection<Deal>(APP_ID, "deals");

  const [formOpen, setFormOpen]         = useState(false);
  const [editTarget, setEditTarget]     = useState<Activity | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Activity | null>(null);

  // pending first → due_date asc → created_at desc
  const activities = all
    .filter(a => a[filterKey] === filterId)
    .sort((a, b) => {
      if (!!a.done !== !!b.done) return a.done ? 1 : -1;
      if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const pending = activities.filter(a => !a.done).length;

  const formFields = [
    { name: "type",       label: "Type",    type: "select"   as const, required: true, options: ["Call","Email","Meeting","Task"].map(t => ({ label: t, value: t })) },
    { name: "subject",    label: "Subject", type: "text"     as const, required: true },
    { name: "body",       label: "Notes",   type: "textarea" as const },
    { name: "due_date",   label: "Due Date",type: "date"     as const },
    { name: "contact_id", label: "Contact", type: "select"   as const, options: contacts.map(c => ({ label: `${c.first_name} ${c.last_name}`, value: c.id })) },
    { name: "company_id", label: "Company", type: "select"   as const, options: companies.map(c => ({ label: c.name, value: c.id })) },
    { name: "deal_id",    label: "Deal",    type: "select"   as const, options: deals.map(d => ({ label: d.title, value: d.id })) },
  ];

  const openForm = (a: Activity | null = null) => { setEditTarget(a); setFormOpen(true); };
  const closeForm = () => { setFormOpen(false); setEditTarget(null); };

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      if (editTarget) { await update(editTarget.id, values); toast.success("Activity updated"); }
      else { await create({ [filterKey]: filterId, done: false, ...values }); toast.success("Activity logged"); }
      closeForm();
    } catch { toast.error("Something went wrong"); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { await remove(deleteTarget.id); toast.success("Activity deleted"); setDeleteTarget(null); }
    catch { toast.error("Failed to delete activity"); }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b shrink-0">
        <span className="text-sm font-medium">
          Activities{activities.length > 0 && <span className="text-muted-foreground ml-1">({pending > 0 ? `${pending} pending` : activities.length})</span>}
        </span>
        <Button size="sm" variant="outline" onClick={() => openForm()}>
          <IconPlus className="h-3.5 w-3.5 mr-1" /> Log Activity
        </Button>
      </div>

      {loading && <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">Loading…</div>}

      {!loading && activities.length === 0 && (
        <EmptyState icon={<IconChecklist className="h-8 w-8" />} title="No activities yet" description="Log calls, meetings, emails and tasks."
          action={<Button onClick={() => openForm()}><IconPlus className="h-4 w-4 mr-1.5" /> Log Activity</Button>}
        />
      )}

      {!loading && activities.length > 0 && (
        <ScrollArea className="flex-1 px-3 py-3">
          <div className="flex flex-col gap-2">
            {activities.map(a => (
              <div key={a.id} className={cn("group flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/30", a.done && "opacity-60")}>
                <button
                  onClick={() => update(a.id, { done: !a.done }).catch(() => toast.error("Failed to update"))}
                  className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    a.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-muted-foreground hover:border-emerald-500")}
                >
                  {a.done && <IconCheck className="h-3 w-3" />}
                </button>
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn("text-sm font-medium", a.done && "line-through text-muted-foreground")}>{a.subject}</span>
                    <span className={cn("text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0", TYPE_STYLES[a.type] ?? "bg-gray-100 text-gray-700")}>{a.type}</span>
                  </div>
                  {a.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{a.body}</p>}
                  {a.due_date && <span className="text-xs text-muted-foreground mt-0.5">Due: {a.due_date}</span>}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button onClick={() => openForm(a)} className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"><IconEdit className="h-3.5 w-3.5" /></button>
                  <button onClick={() => setDeleteTarget(a)} className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-destructive transition-colors"><IconTrash className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      <FormDialog
        open={formOpen} onOpenChange={o => o ? undefined : closeForm()}
        title={editTarget ? "Edit Activity" : "Log Activity"}
        description={editTarget ? "Update activity details" : "Record a new activity"}
        fields={formFields}
        defaultValues={editTarget ?? { [filterKey]: filterId }}
        onSubmit={handleSubmit}
        submitLabel={editTarget ? "Save Changes" : "Log Activity"}
      />
      <ConfirmDialog
        open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}
        title="Delete Activity" description={`Delete "${deleteTarget?.subject}"? This cannot be undone.`}
        onConfirm={handleDelete} confirmLabel="Delete" destructive
      />
    </div>
  );
}
