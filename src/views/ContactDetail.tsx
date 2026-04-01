import { useState } from "react";
import { useAppRecord, useAppCollection, useIntegration, useRuntimeClient } from "@rootcx/sdk";
import {
  PageHeader, Tabs, TabsList, TabsTrigger, TabsContent,
  Card, CardContent, CardHeader, CardTitle,
  Badge, StatusBadge, Button, Separator,
  FormDialog, ConfirmDialog,
  LoadingState, ErrorState, EmptyState,
  ScrollArea, toast,
} from "@rootcx/ui";
import {
  IconEdit, IconTrash, IconMail, IconPhone, IconBriefcase,
  IconBuilding, IconNotes, IconRefresh, IconAlertCircle, IconPlugConnected,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { NotesTab } from "@/components/notes/NotesTab";
import type { Contact, Company, Deal, Activity, StoredEmail } from "@/lib/types";

const APP_ID = "crm";

const STATUS_MAP: Record<string, string> = {
  Lead: "pending", Prospect: "active", Customer: "active", Churned: "error",
};

const STAGE_STYLES: Record<string, string> = {
  Lead: "bg-slate-100 text-slate-700",
  Qualified: "bg-blue-100 text-blue-700",
  Proposal: "bg-purple-100 text-purple-700",
  Negotiation: "bg-yellow-100 text-yellow-700",
  "Closed Won": "bg-green-100 text-green-700",
  "Closed Lost": "bg-red-100 text-red-700",
};

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0 text-muted-foreground">{icon}</div>
      <div className="flex flex-col min-w-0">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-sm">{value}</span>
      </div>
    </div>
  );
}

function GmailTab({ contactId, contactEmail }: { contactId: string; contactEmail?: string }) {
  const { connected, loading: integLoading, connect } = useIntegration("gmail");
  const { data: storedEmails, loading: dbLoading, refetch } = useAppCollection<StoredEmail>(APP_ID, "contact_emails");
  const client = useRuntimeClient();
  const [syncing, setSyncing] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<StoredEmail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncInfo, setSyncInfo] = useState<{ synced: number; total: number } | null>(null);

  const emails = storedEmails
    .filter(e => e.contact_id === contactId)
    .sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime());

  const handleSync = async () => {
    if (!contactEmail || syncing) return;
    setSyncing(true);
    setError(null);
    try {
      const result = await client.rpc(APP_ID, "sync_emails", { contact_id: contactId, contact_email: contactEmail });
      await refetch();
      setSyncInfo({ synced: result.synced, total: result.total });
      if (result.synced > 0) toast.success(`${result.synced} new email${result.synced > 1 ? "s" : ""} synced`);
    } catch (e: any) {
      setError(e?.message ?? "Failed to sync emails");
      toast.error("Email sync failed");
    } finally {
      setSyncing(false);
    }
  };

  if (integLoading || dbLoading) return <LoadingState variant="spinner" />;

  if (!connected) return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <IconPlugConnected className="h-6 w-6 text-muted-foreground" />
      </div>
      <div>
        <p className="font-medium">Connect Gmail</p>
        <p className="text-sm text-muted-foreground mt-1">Connect your Gmail account to see email history for this contact.</p>
      </div>
      <Button onClick={() => connect()}>Connect Gmail</Button>
    </div>
  );

  if (!contactEmail) return (
    <EmptyState icon={<IconMail className="h-8 w-8" />} title="No email address" description="Add an email address to this contact to see their email history." />
  );

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <p className="text-sm text-muted-foreground">
            Emails with <span className="font-medium text-foreground">{contactEmail}</span>
          </p>
          {syncInfo && (
            <p className="text-xs text-muted-foreground">
              {syncInfo.total} email{syncInfo.total !== 1 ? "s" : ""} in DB
              {syncInfo.synced > 0 && <span className="text-emerald-600 ml-1">· +{syncInfo.synced} new</span>}
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
          <IconRefresh className={cn("h-4 w-4 mr-1.5", syncing && "animate-spin")} />
          {syncing ? "Syncing…" : "Refresh"}
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <IconAlertCircle className="h-4 w-4 shrink-0" />{error}
        </div>
      )}

      {syncing && emails.length === 0 && <LoadingState variant="skeleton" />}
      {!syncing && emails.length === 0 && (
        <EmptyState icon={<IconMail className="h-8 w-8" />} title="No emails found" description={`No emails exchanged with ${contactEmail}`} />
      )}

      {emails.length > 0 && (
        selectedEmail ? (
          <div className="flex flex-col gap-3">
            <button onClick={() => setSelectedEmail(null)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground w-fit">
              ← Back to list
            </button>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{selectedEmail.subject || "(no subject)"}</CardTitle>
                <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                  <span>From: {selectedEmail.from}</span>
                  <span>To: {selectedEmail.to}</span>
                  <span>{selectedEmail.date && new Date(selectedEmail.date).toLocaleString()}</span>
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="pt-4">
                <p className="text-sm whitespace-pre-wrap">{selectedEmail.body || selectedEmail.snippet}</p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="flex flex-col divide-y">
              {emails.map(email => (
                <button key={email.id} onClick={() => setSelectedEmail(email)} className="flex flex-col gap-1 p-3 text-left hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">{email.subject || "(no subject)"}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{email.date && new Date(email.date).toLocaleDateString()}</span>
                  </div>
                  <span className="text-xs text-muted-foreground truncate">{email.from}</span>
                  <span className="text-xs text-muted-foreground line-clamp-2">{email.snippet}</span>
                </button>
              ))}
            </div>
          </ScrollArea>
        )
      )}
    </div>
  );
}

interface Props { contactId: string; onBack: () => void; }

export default function ContactDetail({ contactId, onBack }: Props) {
  const { data: contact, loading, error, update, remove } = useAppRecord<Contact>(APP_ID, "contacts", contactId);
  const { data: companies }  = useAppCollection<Company>(APP_ID, "companies");
  const { data: deals }      = useAppCollection<Deal>(APP_ID, "deals");
  const { data: activities } = useAppCollection<Activity>(APP_ID, "activities");
  const [editOpen, setEditOpen]     = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (loading) return <LoadingState variant="skeleton" />;
  if (error || !contact) return <ErrorState message="Contact not found" onRetry={onBack} />;

  const company          = companies.find(c => c.id === contact.company_id);
  const contactDeals     = deals.filter(d => d.contact_id === contactId);
  const contactActivities = activities.filter(a => a.contact_id === contactId);
  const pendingCount     = contactActivities.filter(a => !a.done).length;

  const formFields = [
    { name: "first_name", label: "First Name", type: "text" as const, required: true },
    { name: "last_name",  label: "Last Name",  type: "text" as const, required: true },
    { name: "email",      label: "Email",      type: "text" as const },
    { name: "phone",      label: "Phone",      type: "text" as const },
    { name: "job_title",  label: "Job Title",  type: "text" as const },
    { name: "company_id", label: "Company",    type: "select" as const, options: companies.map(c => ({ label: c.name, value: c.id })) },
    { name: "status",     label: "Status",     type: "select" as const, options: ["Lead", "Prospect", "Customer", "Churned"].map(s => ({ label: s, value: s })) },
  ];

  const handleUpdate = async (values: Record<string, unknown>) => {
    try { await update(values); toast.success("Contact updated"); setEditOpen(false); }
    catch { toast.error("Failed to update contact"); }
  };

  const handleDelete = async () => {
    try { await remove(); toast.success("Contact deleted"); onBack(); }
    catch { toast.error("Failed to delete contact"); }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 pb-4">
        <PageHeader
          title={`${contact.first_name} ${contact.last_name}`}
          description={[contact.job_title, company?.name].filter(Boolean).join(" · ") || "No details"}
          onBack={onBack}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <IconEdit className="h-4 w-4 mr-1.5" /> Edit
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
                <IconTrash className="h-4 w-4 mr-1.5" /> Delete
              </Button>
            </div>
          }
        />
      </div>

      <div className="flex flex-1 gap-0 overflow-hidden px-6 pb-6">
        {/* Left panel */}
        <div className="flex flex-col gap-4 w-72 shrink-0 pr-6">
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary text-2xl font-bold">
              {contact.first_name.charAt(0)}{contact.last_name.charAt(0)}
            </div>
            <div className="text-center">
              <p className="font-semibold text-lg">{contact.first_name} {contact.last_name}</p>
              {contact.status && <StatusBadge status={STATUS_MAP[contact.status] ?? "default"} label={contact.status} />}
            </div>
          </div>

          <Separator />

          <div className="flex flex-col gap-3">
            <InfoRow icon={<IconMail className="h-4 w-4" />}     label="Email"    value={contact.email} />
            <InfoRow icon={<IconPhone className="h-4 w-4" />}    label="Phone"    value={contact.phone} />
            <InfoRow icon={<IconBriefcase className="h-4 w-4" />} label="Job Title" value={contact.job_title} />
            <InfoRow icon={<IconBuilding className="h-4 w-4" />} label="Company"  value={company?.name} />
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-muted p-3 text-center">
              <p className="text-2xl font-bold">{contactDeals.length}</p>
              <p className="text-xs text-muted-foreground">Deals</p>
            </div>
            <div className="rounded-lg bg-muted p-3 text-center">
              <p className="text-2xl font-bold">{pendingCount}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </div>

          {contactDeals.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Deals</p>
              {contactDeals.map(deal => (
                <div key={deal.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <span className="text-sm truncate">{deal.title}</span>
                  <span className={cn("text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0 ml-2", STAGE_STYLES[deal.stage] ?? "bg-gray-100 text-gray-700")}>
                    {deal.stage}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator orientation="vertical" />

        {/* Right panel — tabs */}
        <div className="flex flex-col flex-1 overflow-hidden pl-6">
          <Tabs defaultValue="notes" className="flex flex-col flex-1 overflow-hidden">
            <TabsList className="w-fit">
              <TabsTrigger value="notes">
                <IconNotes className="h-4 w-4 mr-1.5" /> Notes
              </TabsTrigger>
              <TabsTrigger value="emails">
                <IconMail className="h-4 w-4 mr-1.5" /> Emails
              </TabsTrigger>
              <TabsTrigger value="activities">
                <IconNotes className="h-4 w-4 mr-1.5" /> Activities
                {pendingCount > 0 && <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-xs">{pendingCount}</Badge>}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="notes" className="flex-1 overflow-hidden mt-4">
              <NotesTab filterKey="contact_id" filterId={contactId} />
            </TabsContent>

            <TabsContent value="emails" className="flex-1 overflow-hidden mt-4">
              <GmailTab contactId={contactId} contactEmail={contact.email} />
            </TabsContent>

            <TabsContent value="activities" className="flex-1 overflow-hidden mt-4">
              {contactActivities.length === 0 ? (
                <EmptyState icon={<IconNotes className="h-8 w-8" />} title="No activities" description="No activities logged for this contact yet." />
              ) : (
                <ScrollArea className="h-full">
                  <div className="flex flex-col gap-2">
                    {contactActivities.map(a => (
                      <div key={a.id} className={cn("flex items-start gap-3 rounded-lg border p-3", a.done && "opacity-60")}>
                        <div className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2", a.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-muted-foreground")}>
                          {a.done && <span className="text-[10px]">✓</span>}
                        </div>
                        <div className="flex flex-col flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={cn("text-sm font-medium", a.done && "line-through")}>{a.subject}</span>
                            <Badge variant="outline" className="text-xs">{a.type}</Badge>
                          </div>
                          {a.due_date && <span className="text-xs text-muted-foreground">{a.due_date}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <FormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Edit Contact"
        description="Update contact details"
        fields={formFields}
        defaultValues={contact}
        onSubmit={handleUpdate}
        submitLabel="Save Changes"
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Contact"
        description={`Are you sure you want to delete ${contact.first_name} ${contact.last_name}? This cannot be undone.`}
        onConfirm={handleDelete}
        confirmLabel="Delete"
        destructive
      />
    </div>
  );
}
