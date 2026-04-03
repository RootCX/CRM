import { useState } from "react";
import { useAppCollection } from "@rootcx/sdk";
import {
  PageHeader, DataTable, FormDialog, ConfirmDialog, EmptyState,
  Tabs, TabsList, TabsTrigger, TabsContent,
  Card, CardContent, Button, Separator, SearchInput, ScrollArea, Badge, toast,
} from "@rootcx/ui";
import {
  IconPlus, IconEdit, IconTrash, IconCurrencyDollar, IconNotes,
  IconUsers, IconChecklist, IconStarFilled, IconStar,
} from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { NotesTab } from "@/components/notes/NotesTab";
import { ActivitiesTab } from "@/components/ActivitiesTab";
import { FilterBuilder, buildWhereClause } from "@/components/FilterBuilder";
import type { ActiveFilter, FilterFieldDef } from "@/components/FilterBuilder";
import { mergeWhere, buildSearchClause } from "@/lib/search";
import { useFavorites } from "@/hooks/useFavorites";
import { APP_ID, STAGE_STYLES, CURRENCY_SYMBOLS, STAGE_DEFAULT_PROBABILITY, PIPELINE_STAGES, STAGE_OPTIONS, SOURCE_OPTIONS, CURRENCY_OPTIONS } from "@/lib/constants";
import type { Contact, Company, Deal, DealContact, Activity } from "@/lib/types";

function DealPeopleTab({ deal, contacts, dealContacts, onCreate, onRemove, onNavigateContact }: {
  deal: Deal; contacts: Contact[]; dealContacts: DealContact[];
  onCreate: (contactId: string) => Promise<void>; onRemove: (id: string) => Promise<void>;
  onNavigateContact?: (id: string) => void;
}) {
  const linked = dealContacts
    .filter(dc => dc.deal_id === deal.id)
    .map(dc => ({ dc, contact: contacts.find(c => c.id === dc.contact_id) }))
    .filter((x): x is { dc: DealContact; contact: Contact } => x.contact != null);

  const linkedIds = new Set(linked.map(x => x.contact.id));
  const available = contacts.filter(c => !linkedIds.has(c.id));
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b shrink-0">
        <span className="text-sm font-medium">People{linked.length > 0 && <span className="text-muted-foreground ml-1">({linked.length})</span>}</span>
        {available.length > 0 && <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}><IconPlus className="h-3.5 w-3.5 mr-1" /> Add</Button>}
      </div>
      {linked.length === 0
        ? <EmptyState icon={<IconUsers className="h-8 w-8" />} title="No people" description="Link contacts to this deal." />
        : (
          <ScrollArea className="flex-1">
            <div className="flex flex-col gap-2 p-3">
              {linked.map(({ dc, contact }) => (
                <div key={dc.id} className="group flex items-center gap-3 rounded-lg border px-3 py-2.5 hover:bg-muted/30 transition-colors">
                  {contact.avatar_url
                    ? <img src={contact.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover shrink-0" />
                    : <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold shrink-0">{contact.first_name.charAt(0)}{contact.last_name.charAt(0)}</div>
                  }
                  <div className={cn("flex flex-col min-w-0 flex-1", onNavigateContact && "cursor-pointer")} onClick={() => onNavigateContact?.(contact.id)}>
                    <span className={cn("text-sm font-medium", onNavigateContact && "hover:underline")}>{contact.first_name} {contact.last_name}</span>
                    {contact.job_title && <span className="text-xs text-muted-foreground">{contact.job_title}</span>}
                  </div>
                  <button onClick={() => onRemove(dc.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-accent text-muted-foreground hover:text-destructive transition-all">
                    <IconTrash className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )
      }
      <FormDialog open={addOpen} onOpenChange={setAddOpen} title="Add Contact to Deal" description="Link an existing contact to this deal"
        fields={[{ name: "contact_id", label: "Contact", type: "select" as const, required: true, options: available.map(c => ({ label: `${c.first_name} ${c.last_name}`, value: c.id })) }]}
        defaultValues={{}} onSubmit={async v => { await onCreate(v.contact_id as string); setAddOpen(false); }} submitLabel="Add Contact"
      />
    </div>
  );
}

function DealDetail({ deal, contacts, companies, onBack, onEdit, onNavigateContact, onNavigateCompany }: {
  deal: Deal; contacts: Contact[]; companies: Company[];
  onBack: () => void; onEdit: () => void;
  onNavigateContact?: (id: string) => void; onNavigateCompany?: (id: string) => void;
}) {
  const { data: dealContacts, create: createDC, remove: removeDC } = useAppCollection<DealContact>(APP_ID, "deal_contacts");
  const { data: activities } = useAppCollection<Activity>(APP_ID, "activities");
  const { isFavorite, toggle: toggleFav } = useFavorites();

  const contact      = contacts.find(c => c.id === deal.contact_id);
  const company      = companies.find(c => c.id === deal.company_id);
  const isFav        = isFavorite("deal", deal.id);
  const sym          = CURRENCY_SYMBOLS[deal.currency ?? "USD"] ?? "$";
  const pendingCount = activities.filter(a => a.deal_id === deal.id && !a.done).length;
  const expectedRevenue = deal.value != null && deal.probability != null ? Math.round(deal.value * deal.probability / 100) : null;

  const handleAddContact = async (contactId: string) => {
    try { await createDC({ deal_id: deal.id, contact_id: contactId }); toast.success("Contact added"); }
    catch { toast.error("Failed to add contact"); }
  };

  const handleRemoveContact = async (dcId: string) => {
    try { await removeDC(dcId); toast.success("Contact removed"); }
    catch { toast.error("Failed to remove contact"); }
  };

  // Reusable clickable entity link in sidebar
  const EntityLink = ({ label, name, avatar, id, onNav }: { label: string; name: string; avatar?: string; id: string; onNav?: (id: string) => void }) => (
    <div>
      <p className="text-xs text-muted-foreground mb-1.5">{label}</p>
      <button onClick={() => onNav?.(id)} className={cn("flex items-center gap-2 w-full rounded-md p-1.5 -ml-1.5 transition-colors", onNav && "hover:bg-muted/50 cursor-pointer")}>
        {avatar
          ? <img src={avatar} alt="" className="h-7 w-7 rounded-full object-cover shrink-0" />
          : <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">{name.charAt(0)}</div>
        }
        <span className={cn("text-sm text-left", onNav && "hover:underline")}>{name}</span>
      </button>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 pb-4">
        <PageHeader title={deal.title}
          description={[contact ? `${contact.first_name} ${contact.last_name}` : null, company?.name].filter(Boolean).join(" · ") || "No details"}
          onBack={onBack}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => toggleFav("deal", deal.id, deal.title)}>
                {isFav ? <IconStarFilled className="h-4 w-4 text-yellow-400" /> : <IconStar className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="sm" onClick={onEdit}><IconEdit className="h-4 w-4 mr-1.5" /> Edit</Button>
            </div>
          }
        />
      </div>

      <div className="flex flex-1 gap-0 overflow-hidden px-6 pb-6">
        <div className="flex flex-col gap-3 w-56 shrink-0 pr-6 overflow-y-auto py-1">
          <div><p className="text-xs text-muted-foreground mb-1">Stage</p><span className={cn("text-xs px-2 py-0.5 rounded-full font-medium border", STAGE_STYLES[deal.stage] ?? "bg-gray-100 text-gray-700 border-gray-200")}>{deal.stage}</span></div>
          {deal.value != null && <div><p className="text-xs text-muted-foreground mb-1">Value</p><p className="text-xl font-bold text-emerald-600">{sym}{deal.value.toLocaleString()}</p></div>}
          {deal.probability != null && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Probability</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${deal.probability}%` }} /></div>
                <span className="text-xs font-medium shrink-0">{deal.probability}%</span>
              </div>
              {expectedRevenue != null && <p className="text-xs text-muted-foreground mt-0.5">Expected: <span className="font-medium text-foreground">{sym}{expectedRevenue.toLocaleString()}</span></p>}
            </div>
          )}
          {deal.source     && <div><p className="text-xs text-muted-foreground mb-1">Source</p><span className="text-sm">{deal.source}</span></div>}
          {deal.close_date && <div><p className="text-xs text-muted-foreground mb-1">Expected Close</p><p className="text-sm">{deal.close_date}</p></div>}
          <Separator />
          {contact && <EntityLink label="Primary Contact" name={`${contact.first_name} ${contact.last_name}`} avatar={contact.avatar_url} id={contact.id} onNav={onNavigateContact} />}
          {company && <EntityLink label="Company" name={company.name} id={company.id} onNav={onNavigateCompany} />}
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
              <TabsTrigger value="people"><IconUsers className="h-4 w-4 mr-1.5" /> People</TabsTrigger>
            </TabsList>
            <TabsContent value="notes"      className="flex-1 overflow-hidden mt-4"><NotesTab filterKey="deal_id" filterId={deal.id} /></TabsContent>
            <TabsContent value="activities" className="flex-1 overflow-hidden mt-4"><ActivitiesTab filterKey="deal_id" filterId={deal.id} /></TabsContent>
            <TabsContent value="people"     className="flex-1 overflow-hidden mt-4">
              <DealPeopleTab deal={deal} contacts={contacts} dealContacts={dealContacts} onCreate={handleAddContact} onRemove={handleRemoveContact} onNavigateContact={onNavigateContact} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

interface Props { onNavigateContact?: (id: string) => void; onNavigateCompany?: (id: string) => void; initialSelectedId?: string | null; }

export default function DealsView({ onNavigateContact, onNavigateCompany, initialSelectedId = null }: Props) {
  const [filters, setFilters]           = useState<ActiveFilter[]>([]);
  const [search, setSearch]             = useState("");
  const [selectedId, setSelectedId]     = useState<string | null>(initialSelectedId);
  const [formOpen, setFormOpen]         = useState(false);
  const [editTarget, setEditTarget]     = useState<Deal | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Deal | null>(null);

  const where = mergeWhere(buildWhereClause(filters), buildSearchClause(search, ["title"]));
  const { data: deals, loading, create, update, remove } = useAppCollection<Deal>(APP_ID, "deals", where ? { where } : undefined);
  const { data: contacts }  = useAppCollection<Contact>(APP_ID, "contacts");
  const { data: companies } = useAppCollection<Company>(APP_ID, "companies");

  const contactName = (id?: string) => { const c = contacts.find(c => c.id === id); return c ? `${c.first_name} ${c.last_name}` : undefined; };
  const companyName = (id?: string) => companies.find(c => c.id === id)?.name;
  const selected    = deals.find(d => d.id === selectedId) ?? null;

  const filterFields: FilterFieldDef[] = [
    { key: "title",      label: "Title",    type: "text" },
    { key: "value",      label: "Value",    type: "number" },
    { key: "close_date", label: "Close",    type: "date" },
    { key: "stage",      label: "Stage",    type: "enum",        options: STAGE_OPTIONS },
    { key: "source",     label: "Source",   type: "enum",        options: SOURCE_OPTIONS },
    { key: "contact_id", label: "Contact",  type: "entity_link", options: contacts.map(c => ({ label: `${c.first_name} ${c.last_name}`, value: c.id })) },
    { key: "company_id", label: "Company",  type: "entity_link", options: companies.map(c => ({ label: c.name, value: c.id })) },
  ];

  const formFields = [
    { name: "title",       label: "Deal Title",         type: "text"   as const, required: true },
    { name: "stage",       label: "Stage",              type: "select" as const, required: true, options: STAGE_OPTIONS },
    { name: "value",       label: "Value",              type: "number" as const },
    { name: "currency",    label: "Currency",           type: "select" as const, options: CURRENCY_OPTIONS },
    { name: "probability", label: "Probability (%)",    type: "number" as const },
    { name: "source",      label: "Source",             type: "select" as const, options: SOURCE_OPTIONS },
    { name: "contact_id",  label: "Primary Contact",    type: "select" as const, options: contacts.map(c => ({ label: `${c.first_name} ${c.last_name}`, value: c.id })) },
    { name: "company_id",  label: "Company",            type: "select" as const, options: companies.map(c => ({ label: c.name, value: c.id })) },
    { name: "close_date",  label: "Expected Close Date",type: "date"   as const },
  ];

  const columns: ColumnDef<Deal, unknown>[] = [
    {
      accessorKey: "title", header: "Deal",
      cell: ({ row: { original: r } }) => (
        <div className="flex flex-col">
          <span className="font-medium">{r.title}</span>
          {r.contact_id && <span className="text-xs text-muted-foreground">{contactName(r.contact_id)}</span>}
        </div>
      ),
    },
    {
      accessorKey: "value", header: "Value",
      cell: ({ row: { original: r } }) => {
        const sym = CURRENCY_SYMBOLS[r.currency ?? "USD"] ?? "$";
        return r.value != null ? <span className="font-semibold text-emerald-600">{sym}{r.value.toLocaleString()}</span> : "—";
      },
    },
    { accessorKey: "stage",       header: "Stage",    cell: ({ row: { original: r } }) => <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium border", STAGE_STYLES[r.stage] ?? "bg-gray-100 text-gray-700")}>{r.stage}</span> },
    { accessorKey: "probability", header: "Prob.",    cell: ({ row: { original: r } }) => r.probability != null ? `${r.probability}%` : "—" },
    { accessorKey: "source",      header: "Source",   cell: ({ row: { original: r } }) => r.source || "—" },
    { accessorKey: "company_id",  header: "Company",  cell: ({ row: { original: r } }) => companyName(r.company_id) ?? "—" },
    { accessorKey: "close_date",  header: "Close",    cell: ({ row: { original: r } }) => r.close_date || "—" },
  ];

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      const stage = values.stage as string;
      // Auto-set probability from stage when not explicitly provided
      const enriched = !values.probability && stage ? { ...values, probability: STAGE_DEFAULT_PROBABILITY[stage] ?? 0 } : values;
      if (editTarget) { await update(editTarget.id, enriched); toast.success("Deal updated"); }
      else { await create(enriched); toast.success("Deal created"); }
      setFormOpen(false); setEditTarget(null);
    } catch { toast.error("Something went wrong"); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await remove(deleteTarget.id); toast.success("Deal deleted");
      if (selectedId === deleteTarget.id) setSelectedId(null);
      setDeleteTarget(null);
    } catch { toast.error("Failed to delete deal"); }
  };

  if (selected) return (
    <DealDetail deal={selected} contacts={contacts} companies={companies}
      onBack={() => setSelectedId(null)} onEdit={() => { setEditTarget(selected); setFormOpen(true); }}
      onNavigateContact={onNavigateContact} onNavigateCompany={onNavigateCompany}
    />
  );

  const filtered = filters.length > 0 || !!search;
  const totalPipelineValue = deals.filter(d => PIPELINE_STAGES.includes(d.stage)).reduce((s, d) => s + (d.value ?? 0), 0);

  return (
    <div className="p-6 space-y-4">
      <PageHeader title="Deals" description="Track your sales pipeline and close deals"
        actions={<Button onClick={() => { setEditTarget(null); setFormOpen(true); }}><IconPlus className="h-4 w-4 mr-1.5" /> Add Deal</Button>}
      />
      <Tabs defaultValue="list">
        <div className="flex flex-col gap-4">
          <TabsList className="w-fit">
            <TabsTrigger value="list">List</TabsTrigger>
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4 mt-0">
            <div className="flex items-center gap-3">
              <SearchInput value={search} onChange={setSearch} placeholder="Search deals…" debounceMs={300} />
              <FilterBuilder fields={filterFields} filters={filters} onChange={setFilters} />
            </div>
            <DataTable data={deals} columns={columns} loading={loading} pageSize={15} selectable onRowClick={row => setSelectedId(row.id)}
              rowActions={[
                { label: "Edit",   icon: <IconEdit  className="h-4 w-4" />, onClick: row => { setEditTarget(row); setFormOpen(true); } },
                { label: "Delete", icon: <IconTrash className="h-4 w-4" />, onClick: row => setDeleteTarget(row), destructive: true },
              ]}
              bulkActions={[{ label: "Delete selected", destructive: true, onClick: async rows => { await Promise.all(rows.map(r => remove(r.id))); toast.success(`${rows.length} deals deleted`); } }]}
              emptyState={<EmptyState icon={<IconCurrencyDollar className="h-8 w-8" />} title={filtered ? "No deals match these filters" : "No deals yet"} description={filtered ? "Try adjusting or clearing your filters" : "Start tracking your sales pipeline"} action={filtered ? undefined : <Button onClick={() => { setEditTarget(null); setFormOpen(true); }}><IconPlus className="h-4 w-4 mr-1.5" /> Add Deal</Button>} />}
            />
          </TabsContent>

          <TabsContent value="pipeline" className="mt-0">
            <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
              <IconCurrencyDollar className="h-4 w-4" />
              Pipeline value: <strong className="text-foreground">${totalPipelineValue.toLocaleString()}</strong>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {PIPELINE_STAGES.map(stage => {
                const stageDeals = deals.filter(d => d.stage === stage);
                const stageValue = stageDeals.reduce((s, d) => s + (d.value ?? 0), 0);
                return (
                  <div key={stage} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium border", STAGE_STYLES[stage])}>{stage}</span>
                      <span className="text-xs text-muted-foreground">{stageDeals.length}</span>
                    </div>
                    {stageValue > 0 && <p className="text-xs text-muted-foreground">${stageValue.toLocaleString()}</p>}
                    <div className="flex flex-col gap-2 min-h-24">
                      {stageDeals.length === 0
                        ? <div className="rounded-lg border border-dashed p-3 text-xs text-center text-muted-foreground">No deals</div>
                        : stageDeals.map(deal => {
                          const sym = CURRENCY_SYMBOLS[deal.currency ?? "USD"] ?? "$";
                          return (
                            <Card key={deal.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedId(deal.id)}>
                              <CardContent className="p-3 space-y-1">
                                <p className="text-sm font-medium leading-tight">{deal.title}</p>
                                {deal.value != null && <p className="text-xs font-semibold text-emerald-600">{sym}{deal.value.toLocaleString()}</p>}
                                {deal.probability != null && (
                                  <div className="flex items-center gap-1.5">
                                    <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden"><div className="h-full bg-emerald-400 rounded-full" style={{ width: `${deal.probability}%` }} /></div>
                                    <span className="text-xs text-muted-foreground">{deal.probability}%</span>
                                  </div>
                                )}
                                {deal.company_id  && <p className="text-xs text-muted-foreground">{companyName(deal.company_id)}</p>}
                                {deal.close_date  && <p className="text-xs text-muted-foreground">Close: {deal.close_date}</p>}
                              </CardContent>
                            </Card>
                          );
                        })
                      }
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </div>
      </Tabs>

      <FormDialog open={formOpen} onOpenChange={o => { setFormOpen(o); if (!o) setEditTarget(null); }}
        title={editTarget ? "Edit Deal" : "New Deal"} description={editTarget ? "Update deal details" : "Add a new deal to your pipeline"}
        fields={formFields} defaultValues={editTarget ?? {}} onSubmit={handleSubmit} submitLabel={editTarget ? "Save Changes" : "Create Deal"}
      />
      <ConfirmDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}
        title="Delete Deal" description={`Are you sure you want to delete "${deleteTarget?.title}"? This cannot be undone.`}
        onConfirm={handleDelete} confirmLabel="Delete" destructive
      />
    </div>
  );
}
