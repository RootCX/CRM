import { useState } from "react";
import { useAppRecord, useAppCollection, useIntegration, useRuntimeClient } from "@rootcx/sdk";
import {
  PageHeader, Tabs, TabsList, TabsTrigger, TabsContent,
  Card, CardContent, CardHeader, CardTitle,
  Badge, StatusBadge, Button, Separator,
  FormDialog, ConfirmDialog, LoadingState, ErrorState, EmptyState,
  ScrollArea, toast,
} from "@rootcx/ui";
import {
  IconEdit, IconTrash, IconMail, IconPhone, IconBriefcase, IconBuilding,
  IconNotes, IconRefresh, IconAlertCircle, IconPlugConnected, IconMapPin,
  IconBrandLinkedin, IconBrandTwitter, IconStar, IconStarFilled,
  IconChecklist, IconCurrencyDollar,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { NotesTab } from "@/components/notes/NotesTab";
import { ActivitiesTab } from "@/components/ActivitiesTab";
import { useFavorites } from "@/hooks/useFavorites";
import { APP_ID, STATUS_MAP, STAGE_STYLES, CURRENCY_SYMBOLS } from "@/lib/constants";
import type { Contact, Company, Deal, StoredEmail } from "@/lib/types";

function InfoRow({ icon, label, value, href }: { icon: React.ReactNode; label: string; value?: string | null; href?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0 text-muted-foreground">{icon}</div>
      <div className="flex flex-col min-w-0">
        <span className="text-xs text-muted-foreground">{label}</span>
        {href
          ? <a href={href} target="_blank" rel="noreferrer" className="text-sm text-primary underline truncate">{value}</a>
          : <span className="text-sm break-all">{value}</span>}
      </div>
    </div>
  );
}

function GmailTab({ contactId, contactEmail }: { contactId: string; contactEmail?: string }) {
  const { connected, loading: integLoading, connect } = useIntegration(APP_ID, "gmail");
  const { data: storedEmails, loading: dbLoading, refetch } = useAppCollection<StoredEmail>(APP_ID, "contact_emails");
  const client = useRuntimeClient();
  const [syncing, setSyncing] = useState(false);
  const [selected, setSelected] = useState<StoredEmail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncInfo, setSyncInfo] = useState<{ synced: number; total: number } | null>(null);

  const emails = storedEmails
    .filter(e => e.contact_id === contactId)
    .sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime());

  const handleSync = async () => {
    if (!contactEmail || syncing) return;
    setSyncing(true); setError(null);
    try {
      const result = await client.rpc(APP_ID, "sync_emails", { contact_id: contactId, contact_email: contactEmail });
      await refetch();
      setSyncInfo({ synced: result.synced, total: result.total });
      if (result.synced > 0) toast.success(`${result.synced} new email${result.synced > 1 ? "s" : ""} synced`);
    } catch (e: any) {
      setError(e?.message ?? "Failed to sync emails");
      toast.error("Email sync failed");
    } finally { setSyncing(false); }
  };

  if (integLoading || dbLoading) return <LoadingState variant="spinner" />;
  if (!connected) return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <IconPlugConnected className="h-6 w-6 text-muted-foreground" />
      </div>
      <div>
        <p className="font-medium">Connect Gmail</p>
        <p className="text-sm text-muted-foreground mt-1">Connect your Gmail account to see email history.</p>
      </div>
      <Button onClick={connect}>Connect Gmail</Button>
    </div>
  );
  if (!contactEmail) return (
    <EmptyState icon={<IconMail className="h-8 w-8" />} title="No email address" description="Add an email address to this contact to see their email history." />
  );

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <p className="text-sm text-muted-foreground">Emails with <span className="font-medium text-foreground">{contactEmail}</span></p>
          {syncInfo && <p className="text-xs text-muted-foreground">{syncInfo.total} in DB{syncInfo.synced > 0 && <span className="text-emerald-600 ml-1">· +{syncInfo.synced} new</span>}</p>}
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
      {!syncing && emails.length === 0 && <EmptyState icon={<IconMail className="h-8 w-8" />} title="No emails found" description={`No emails exchanged with ${contactEmail}`} />}
      {emails.length > 0 && (
        selected ? (
          <div className="flex flex-col gap-3">
            <button onClick={() => setSelected(null)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground w-fit">← Back to list</button>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{selected.subject || "(no subject)"}</CardTitle>
                <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                  <span>From: {selected.from}</span><span>To: {selected.to}</span>
                  <span>{selected.date && new Date(selected.date).toLocaleString()}</span>
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="pt-4"><p className="text-sm whitespace-pre-wrap">{selected.body || selected.snippet}</p></CardContent>
            </Card>
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="flex flex-col divide-y">
              {emails.map(email => (
                <button key={email.id} onClick={() => setSelected(email)} className="flex flex-col gap-1 p-3 text-left hover:bg-muted/50 transition-colors">
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

function DealsTab({ contactId, onNavigateDeal }: { contactId: string; onNavigateDeal?: (id: string) => void }) {
  const { data: deals }     = useAppCollection<Deal>(APP_ID, "deals");
  const { data: companies } = useAppCollection<Company>(APP_ID, "companies");
  const contactDeals = deals.filter(d => d.contact_id === contactId);

  if (contactDeals.length === 0) return (
    <EmptyState icon={<IconCurrencyDollar className="h-8 w-8" />} title="No deals" description="No deals linked to this contact yet." />
  );

  return (
    <ScrollArea className="flex-1">
      <div className="flex flex-col gap-2 p-3">
        {contactDeals.map(deal => {
          const sym = CURRENCY_SYMBOLS[deal.currency ?? "USD"] ?? "$";
          const company = companies.find(c => c.id === deal.company_id);
          return (
            <div key={deal.id} onClick={() => onNavigateDeal?.(deal.id)}
              className={cn("flex items-center justify-between rounded-lg border px-3 py-2.5 transition-colors", onNavigateDeal && "cursor-pointer hover:bg-muted/40")}
            >
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium truncate">{deal.title}</span>
                {company && <span className="text-xs text-muted-foreground">{company.name}</span>}
                {deal.close_date && <span className="text-xs text-muted-foreground">Close: {deal.close_date}</span>}
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0 ml-3">
                {deal.value != null && <span className="text-sm font-semibold text-emerald-600">{sym}{deal.value.toLocaleString()}</span>}
                <span className={cn("text-xs px-1.5 py-0.5 rounded-full font-medium", STAGE_STYLES[deal.stage] ?? "bg-gray-100 text-gray-700")}>{deal.stage}</span>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}

interface Props { contactId: string; onBack: () => void; onNavigateCompany?: (id: string) => void; onNavigateDeal?: (id: string) => void; }

export default function ContactDetail({ contactId, onBack, onNavigateCompany, onNavigateDeal }: Props) {
  const { data: contact, loading, error, update, remove } = useAppRecord<Contact>(APP_ID, "contacts", contactId);
  const { data: companies } = useAppCollection<Company>(APP_ID, "companies");
  const { data: activities } = useAppCollection<typeof APP_ID, any>(APP_ID, "activities");
  const { isFavorite, toggle: toggleFav } = useFavorites();
  const [editOpen, setEditOpen]     = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (loading) return <LoadingState variant="skeleton" />;
  if (error || !contact) return <ErrorState message="Contact not found" onRetry={onBack} />;

  const company      = companies.find(c => c.id === contact.company_id);
  const pendingCount = activities.filter(a => a.contact_id === contactId && !a.done).length;
  const isFav        = isFavorite("contact", contactId);

  const formFields = [
    { name: "first_name",     label: "First Name",   type: "text"   as const, required: true },
    { name: "last_name",      label: "Last Name",    type: "text"   as const, required: true },
    { name: "email",          label: "Email",        type: "text"   as const },
    { name: "phone",          label: "Phone",        type: "text"   as const },
    { name: "job_title",      label: "Job Title",    type: "text"   as const },
    { name: "city",           label: "City",         type: "text"   as const },
    { name: "avatar_url",     label: "Avatar URL",   type: "text"   as const },
    { name: "linkedin_url",   label: "LinkedIn URL", type: "text"   as const },
    { name: "twitter_handle", label: "Twitter / X",  type: "text"   as const },
    { name: "company_id",     label: "Company",      type: "select" as const, options: companies.map(c => ({ label: c.name, value: c.id })) },
    { name: "status",         label: "Status",       type: "select" as const, options: ["Lead","Prospect","Customer","Churned"].map(s => ({ label: s, value: s })) },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 pb-4">
        <PageHeader
          title={`${contact.first_name} ${contact.last_name}`}
          description={[contact.job_title, company?.name].filter(Boolean).join(" · ") || "No details"}
          onBack={onBack}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => toggleFav("contact", contactId, `${contact.first_name} ${contact.last_name}`)}>
                {isFav ? <IconStarFilled className="h-4 w-4 text-yellow-400" /> : <IconStar className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}><IconEdit className="h-4 w-4 mr-1.5" /> Edit</Button>
              <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}><IconTrash className="h-4 w-4 mr-1.5" /> Delete</Button>
            </div>
          }
        />
      </div>

      <div className="flex flex-1 gap-0 overflow-hidden px-6 pb-6">
        <div className="flex flex-col gap-4 w-72 shrink-0 pr-6 overflow-y-auto">
          <div className="flex flex-col items-center gap-3 py-4">
            {contact.avatar_url
              ? <img src={contact.avatar_url} alt="" className="h-20 w-20 rounded-full object-cover" />
              : <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary text-2xl font-bold">{contact.first_name.charAt(0)}{contact.last_name.charAt(0)}</div>
            }
            <div className="text-center">
              <p className="font-semibold text-lg">{contact.first_name} {contact.last_name}</p>
              {contact.status && <StatusBadge status={STATUS_MAP[contact.status] ?? "default"} label={contact.status} />}
            </div>
          </div>
          <Separator />
          <div className="flex flex-col gap-3">
            <InfoRow icon={<IconMail className="h-4 w-4" />}          label="Email"     value={contact.email}        href={contact.email ? `mailto:${contact.email}` : undefined} />
            <InfoRow icon={<IconPhone className="h-4 w-4" />}         label="Phone"     value={contact.phone}        href={contact.phone ? `tel:${contact.phone}` : undefined} />
            <InfoRow icon={<IconBriefcase className="h-4 w-4" />}     label="Job Title" value={contact.job_title} />
            <InfoRow icon={<IconMapPin className="h-4 w-4" />}        label="City"      value={contact.city} />
            <InfoRow icon={<IconBrandLinkedin className="h-4 w-4" />} label="LinkedIn"  value={contact.linkedin_url}   href={contact.linkedin_url ?? undefined} />
            <InfoRow icon={<IconBrandTwitter className="h-4 w-4" />}  label="Twitter"   value={contact.twitter_handle} href={contact.twitter_handle ? `https://twitter.com/${contact.twitter_handle.replace("@","")}` : undefined} />
            {company && (
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0 text-muted-foreground"><IconBuilding className="h-4 w-4" /></div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs text-muted-foreground">Company</span>
                  <button onClick={() => onNavigateCompany?.(company.id)} className={cn("text-sm text-left", onNavigateCompany && "text-primary underline-offset-2 hover:underline")}>
                    {company.name}
                  </button>
                </div>
              </div>
            )}
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-muted p-3 text-center">
              <p className="text-2xl font-bold">{pendingCount}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
            <div className="rounded-lg bg-muted p-3 text-center">
              <p className="text-2xl font-bold">{new Date(contact.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</p>
              <p className="text-xs text-muted-foreground">Added</p>
            </div>
          </div>
        </div>

        <Separator orientation="vertical" />

        <div className="flex flex-col flex-1 overflow-hidden pl-6">
          <Tabs defaultValue="notes" className="flex flex-col flex-1 overflow-hidden">
            <TabsList className="w-fit shrink-0">
              <TabsTrigger value="notes"><IconNotes className="h-4 w-4 mr-1.5" /> Notes</TabsTrigger>
              <TabsTrigger value="activities">
                <IconChecklist className="h-4 w-4 mr-1.5" /> Activities
                {pendingCount > 0 && <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-xs">{pendingCount}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="deals"><IconCurrencyDollar className="h-4 w-4 mr-1.5" /> Deals</TabsTrigger>
              <TabsTrigger value="emails"><IconMail className="h-4 w-4 mr-1.5" /> Emails</TabsTrigger>
            </TabsList>
            <TabsContent value="notes"      className="flex-1 overflow-hidden mt-4"><NotesTab filterKey="contact_id" filterId={contactId} /></TabsContent>
            <TabsContent value="activities" className="flex-1 overflow-hidden mt-4"><ActivitiesTab filterKey="contact_id" filterId={contactId} /></TabsContent>
            <TabsContent value="deals"      className="flex-1 overflow-hidden mt-4"><DealsTab contactId={contactId} onNavigateDeal={onNavigateDeal} /></TabsContent>
            <TabsContent value="emails"     className="flex-1 overflow-hidden mt-4"><GmailTab contactId={contactId} contactEmail={contact.email} /></TabsContent>
          </Tabs>
        </div>
      </div>

      <FormDialog open={editOpen} onOpenChange={setEditOpen} title="Edit Contact" description="Update contact details"
        fields={formFields} defaultValues={contact} onSubmit={async v => { try { await update(v); toast.success("Contact updated"); setEditOpen(false); } catch { toast.error("Failed to update contact"); } }} submitLabel="Save Changes"
      />
      <ConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} title="Delete Contact"
        description={`Are you sure you want to delete ${contact.first_name} ${contact.last_name}? This cannot be undone.`}
        onConfirm={async () => { try { await remove(); toast.success("Contact deleted"); onBack(); } catch { toast.error("Failed to delete contact"); } }}
        confirmLabel="Delete" destructive
      />
    </div>
  );
}
