import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAppRecord, useAppCollection, useIntegration, useRuntimeClient, useAuth } from "@rootcx/sdk";
import { EmailThreadList } from "@/components/EmailThreadList";
import { ComposeEmailDialog, type ComposeMode } from "@/components/ComposeEmailDialog";
import {
  PageHeader, Tabs, TabsList, TabsTrigger, TabsContent,
  Badge, StatusBadge, Button, Separator,
  ConfirmDialog, LoadingState, ErrorState, EmptyState,
  ScrollArea, toast,
} from "@rootcx/ui";
import {
  IconEdit, IconTrash, IconMail, IconPhone, IconBriefcase, IconBuilding,
  IconNotes, IconRefresh, IconPlugConnected, IconMapPin,
  IconBrandLinkedin, IconBrandTwitter, IconStar, IconStarFilled,
  IconChecklist, IconCurrencyDollar, IconUser,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { NotesTab } from "@/components/notes/NotesTab";
import { ActivitiesTab } from "@/components/ActivitiesTab";
import { useFavorites } from "@/hooks/useFavorites";
import { EntityFormDialog } from "@/components/EntityFormDialog";
import type { ExtendedFieldDefinition } from "@/components/EntityFormDialog";
import { ENTITY_CONFIGS } from "@/components/EntityTypeahead";
import { APP_ID, STATUS_MAP, STAGE_STYLES, CURRENCY_SYMBOLS } from "@/lib/constants";
import type { Contact, Company, Deal, StoredEmail, EmailParticipant } from "@/lib/types";

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


interface EmailWithParticipants {
  id: string;
  header_message_id?: string;
  thread_id?: string;
  thread_external_id?: string;
  subject?: string;
  body?: string;
  body_html?: string;
  body_text_raw?: string;
  received_at: string;
  created_at?: string;
  participants: EmailParticipant[];
  attachments?: any[];
}

function EmailsTab({ contactId, contactEmail }: { contactId: string; contactEmail?: string }) {
  const { connected: gmailConnected, loading: gmailLoading, connect: connectGmail } = useIntegration("gmail");
  const { connected: outlookConnected, loading: outlookLoading, connect: connectOutlook } = useIntegration("outlook");
  const { connected: imapConnected, loading: imapLoading, connect: connectImap, submitCredentials: submitImapCreds } = useIntegration("imap_smtp");
  const client = useRuntimeClient();
  const { user } = useAuth();
  const [emails, setEmails] = useState<EmailWithParticipants[]>([]);
  const [loading, setLoading] = useState(true);
  const [compose, setCompose] = useState<ComposeMode | null>(null);
  const [imapForm, setImapForm] = useState<any>(null);
  const [imapValues, setImapValues] = useState<Record<string, string>>({});
  const [aliases, setAliases] = useState<string[]>([]);
  const [primaryHandle, setPrimaryHandle] = useState<string>("");

  const connected = gmailConnected || outlookConnected || imapConnected;
  const integLoading = gmailLoading || outlookLoading || imapLoading;
  const provider = outlookConnected ? "outlook" : imapConnected ? "imap_smtp" : "gmail";

  const fetchEmails = async () => {
    if (!contactId) return;
    setLoading(true);
    try {
      const result = await client.rpc(APP_ID, "get_contact_emails", { contact_id: contactId, limit: 100 }) as any;
      setEmails(result?.emails ?? []);
    } catch { setEmails([]); }
    finally { setLoading(false); }
  };

  const loadAliases = async () => {
    if (provider !== "gmail" || !gmailConnected) return;
    try {
      const r = await client.rpc(APP_ID, "refresh_aliases", { provider }) as any;
      if (r?.handle) {
        setPrimaryHandle(r.handle);
        setAliases([r.handle, ...(r.aliases ?? [])]);
      }
    } catch { /* fallback to user email */ }
  };

  useEffect(() => { fetchEmails(); }, [contactId]);
  useEffect(() => { loadAliases(); }, [gmailConnected, provider]);
  useEffect(() => {
    if (!primaryHandle && user?.email) {
      setPrimaryHandle(user.email);
      setAliases([user.email]);
    }
  }, [user?.email, primaryHandle]);

  if (integLoading || loading) return <LoadingState variant="spinner" />;
  const handleConnectImap = async () => {
    const result = await connectImap();
    if (result?.type === "credentials" && result.schema) {
      const defaults: Record<string, string> = {};
      for (const [key, def] of Object.entries((result.schema as any).properties ?? {})) {
        if ((def as any).default != null) defaults[key] = String((def as any).default);
      }
      setImapValues(defaults);
      setImapForm(result.schema);
    }
  };

  const handleSubmitImap = async () => {
    try {
      await submitImapCreds(imapValues);
      setImapForm(null);
      setImapValues({});
    } catch (e: any) {
      toast.error(e?.message ?? "Connection failed");
    }
  };

  if (!connected) return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <IconPlugConnected className="h-6 w-6 text-muted-foreground" />
      </div>
      {!imapForm ? (
        <>
          <div>
            <p className="font-medium">Connect Email</p>
            <p className="text-sm text-muted-foreground mt-1">Connect your email account to see email history.</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={connectGmail}>Connect Gmail</Button>
            <Button variant="outline" onClick={connectOutlook}>Connect Outlook</Button>
            <Button variant="outline" onClick={handleConnectImap}>Connect IMAP</Button>
          </div>
        </>
      ) : (
        <div className="w-full max-w-sm text-left space-y-3">
          {Object.entries((imapForm.properties ?? {}) as Record<string, any>).map(([key, def]) => (
            <div key={key} className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{def.label || key}</label>
              <input
                type={def.secret || /password/i.test(key) ? "password" : "text"}
                placeholder={def.placeholder || ""}
                value={imapValues[key] ?? ""}
                onChange={(e) => setImapValues((v) => ({ ...v, [key]: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            <Button onClick={handleSubmitImap}>Connect</Button>
            <Button variant="outline" onClick={() => setImapForm(null)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
  if (!contactEmail) return (
    <EmptyState icon={<IconMail className="h-8 w-8" />} title="No email address" description="Add an email address to this contact to see their email history." />
  );

  if (compose) {
    return (
      <ComposeEmailDialog
        mode={compose}
        provider={provider}
        aliases={aliases}
        primaryHandle={primaryHandle}
        onSent={() => { setCompose(null); fetchEmails(); }}
        onCancel={() => setCompose(null)}
      />
    );
  }

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{emails.length} email{emails.length !== 1 ? "s" : ""}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setCompose({ kind: "new", defaultTo: contactEmail })}>
            <IconMail className="h-4 w-4 mr-1.5" /> Compose
          </Button>
          <Button variant="outline" size="sm" onClick={fetchEmails}>
            <IconRefresh className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {emails.length === 0 && <EmptyState icon={<IconMail className="h-8 w-8" />} title="No emails yet" description="Emails will appear here once the background sync completes." />}

      <ScrollArea className="flex-1">
        <EmailThreadList
          emails={emails}
          onReply={(e) => setCompose({ kind: "reply", email: e })}
          onReplyAll={(e) => setCompose({ kind: "reply_all", email: e })}
          onForward={(e) => setCompose({ kind: "forward", email: e })}
        />
      </ScrollArea>
    </div>
  );
}

function DealsTab({ contactId }: { contactId: string }) {
  const navigate = useNavigate();
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
            <div key={deal.id} onClick={() => navigate(`/deals/${deal.id}`)}
              className="flex items-center justify-between rounded-lg border px-3 py-2.5 transition-colors cursor-pointer hover:bg-muted/40"
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

export default function ContactDetail() {
  const { id: contactId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: contact, loading, error, update, remove } = useAppRecord<Contact>(APP_ID, "contacts", contactId!);
  const { data: companies } = useAppCollection<Company>(APP_ID, "companies");
  const { data: activities } = useAppCollection<any>(APP_ID, "activities");
  const { isFavorite, toggle: toggleFav } = useFavorites();
  const [editOpen, setEditOpen]     = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (loading) return <LoadingState variant="skeleton" />;
  if (error || !contact) return <ErrorState message="Contact not found" onRetry={() => navigate("/contacts")} />;

  const company      = companies.find(c => c.id === contact.company_id);
  const pendingCount = activities.filter(a => a.contact_id === contactId && !a.done).length;
  const isFav        = isFavorite("contact", contactId!);

  const formFields: ExtendedFieldDefinition[] = [
    { name: "first_name",     label: "First Name",   type: "text"   as const, required: true },
    { name: "last_name",      label: "Last Name",    type: "text"   as const, required: true },
    { name: "email",          label: "Email",        type: "text"   as const },
    { name: "phone",          label: "Phone",        type: "text"   as const },
    { name: "job_title",      label: "Job Title",    type: "text"   as const },
    { name: "city",           label: "City",         type: "text"   as const },
    { name: "avatar_url",     label: "Avatar URL",   type: "text"   as const },
    { name: "linkedin_url",   label: "LinkedIn URL", type: "text"   as const },
    { name: "twitter_handle", label: "Twitter / X",  type: "text"   as const },
    { name: "company_id",     label: "Company",      type: "relation" as const, config: ENTITY_CONFIGS.companies },
    { name: "status",         label: "Status",       type: "select" as const, options: ["Lead","Prospect","Customer","Churned"].map(s => ({ label: s, value: s })) },
  ];

  const sidebarContent = (
    <>
      <div className="flex flex-col items-center gap-3 py-2 md:py-4">
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
              <button onClick={() => navigate(`/companies/${company.id}`)} className="text-sm text-left text-primary underline-offset-2 hover:underline">
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
    </>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 md:p-6 md:pb-4">
        <PageHeader
          title={`${contact.first_name} ${contact.last_name}`}
          description={[contact.job_title, company?.name].filter(Boolean).join(" · ") || "No details"}
          onBack={() => navigate("/contacts")}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => toggleFav("contact", contactId!, `${contact.first_name} ${contact.last_name}`)}>
                {isFav ? <IconStarFilled className="h-4 w-4 text-yellow-400" /> : <IconStar className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}><IconEdit className="h-4 w-4 mr-1.5" /> Edit</Button>
              <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}><IconTrash className="h-4 w-4 mr-1.5" /> Delete</Button>
            </div>
          }
        />
      </div>

      <div className="flex flex-1 gap-0 overflow-hidden px-4 md:px-6 pb-6">
        <div className="hidden md:flex flex-col gap-4 w-72 shrink-0 pr-6 overflow-y-auto">
          {sidebarContent}
        </div>

        <Separator orientation="vertical" className="hidden md:block" />

        <div className="flex flex-col flex-1 overflow-hidden md:pl-6">
          <Tabs defaultValue="notes" className="flex flex-col flex-1 overflow-hidden">
            <TabsList className="w-fit max-w-full shrink-0 overflow-x-auto">
              <TabsTrigger value="details" className="md:hidden"><IconUser className="h-4 w-4 mr-1.5" /> Details</TabsTrigger>
              <TabsTrigger value="notes"><IconNotes className="h-4 w-4 mr-1.5" /> Notes</TabsTrigger>
              <TabsTrigger value="activities">
                <IconChecklist className="h-4 w-4 mr-1.5" /> Activities
                {pendingCount > 0 && <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-xs">{pendingCount}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="deals"><IconCurrencyDollar className="h-4 w-4 mr-1.5" /> Deals</TabsTrigger>
              <TabsTrigger value="emails"><IconMail className="h-4 w-4 mr-1.5" /> Emails</TabsTrigger>
            </TabsList>
            <TabsContent value="details" className="md:hidden flex-1 overflow-y-auto mt-4">
              <div className="flex flex-col gap-4 pb-4">{sidebarContent}</div>
            </TabsContent>
            <TabsContent value="notes"      className="flex-1 overflow-hidden mt-4"><NotesTab filterKey="contact_id" filterId={contactId!} /></TabsContent>
            <TabsContent value="activities" className="flex-1 overflow-hidden mt-4"><ActivitiesTab filterKey="contact_id" filterId={contactId!} /></TabsContent>
            <TabsContent value="deals"      className="flex-1 overflow-hidden mt-4"><DealsTab contactId={contactId!} /></TabsContent>
            <TabsContent value="emails"     className="flex-1 overflow-hidden mt-4"><EmailsTab contactId={contactId!} contactEmail={contact.email} /></TabsContent>
          </Tabs>
        </div>
      </div>

      <EntityFormDialog open={editOpen} onOpenChange={setEditOpen} title="Edit Contact" description="Update contact details"
        fields={formFields} defaultValues={contact} onSubmit={async v => { try { await update(v); toast.success("Contact updated"); setEditOpen(false); } catch { toast.error("Failed to update contact"); } }} submitLabel="Save Changes"
      />
      <ConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} title="Delete Contact"
        description={`Are you sure you want to delete ${contact.first_name} ${contact.last_name}? This cannot be undone.`}
        onConfirm={async () => { try { await remove(); toast.success("Contact deleted"); navigate("/contacts"); } catch { toast.error("Failed to delete contact"); } }}
        confirmLabel="Delete" destructive
      />
    </div>
  );
}
