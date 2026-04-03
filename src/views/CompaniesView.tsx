import { useState } from "react";
import { useAppCollection } from "@rootcx/sdk";
import {
  PageHeader, DataTable, FormDialog, ConfirmDialog, EmptyState,
  Tabs, TabsList, TabsTrigger, TabsContent,
  Button, Separator, SearchInput, ScrollArea, toast,
} from "@rootcx/ui";
import {
  IconPlus, IconEdit, IconTrash, IconBuilding, IconNotes,
  IconWorld, IconPhone, IconMapPin, IconUsers, IconCurrencyDollar,
  IconChecklist, IconBrandLinkedin, IconStarFilled, IconStar, IconTarget,
} from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { NotesTab } from "@/components/notes/NotesTab";
import { ActivitiesTab } from "@/components/ActivitiesTab";
import { FilterBuilder, buildWhereClause } from "@/components/FilterBuilder";
import type { ActiveFilter, FilterFieldDef } from "@/components/FilterBuilder";
import { mergeWhere, buildSearchClause } from "@/lib/search";
import { useFavorites } from "@/hooks/useFavorites";
import { APP_ID, INDUSTRY_COLORS, STAGE_STYLES, CURRENCY_SYMBOLS, INDUSTRIES } from "@/lib/constants";
import type { Company, Contact, Deal, Activity } from "@/lib/types";

function InfoRow({ icon, label, value, href }: { icon: React.ReactNode; label: string; value?: string | null; href?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0 text-muted-foreground">{icon}</div>
      <div className="flex flex-col min-w-0">
        <span className="text-xs text-muted-foreground">{label}</span>
        {href
          ? <a href={href} target="_blank" rel="noreferrer" className="text-sm text-primary underline truncate">{value}</a>
          : <span className="text-sm break-words">{value}</span>}
      </div>
    </div>
  );
}

function PeopleTab({ companyId, onNavigateContact }: { companyId: string; onNavigateContact?: (id: string) => void }) {
  const { data: contacts } = useAppCollection<Contact>(APP_ID, "contacts");
  const people = contacts.filter(c => c.company_id === companyId);

  if (people.length === 0) return <EmptyState icon={<IconUsers className="h-8 w-8" />} title="No people" description="No contacts linked to this company yet." />;

  return (
    <ScrollArea className="flex-1">
      <div className="flex flex-col gap-2 p-3">
        {people.map(c => (
          <div key={c.id} onClick={() => onNavigateContact?.(c.id)}
            className={cn("flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors", onNavigateContact && "cursor-pointer hover:bg-muted/40")}
          >
            {c.avatar_url
              ? <img src={c.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover shrink-0" />
              : <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold shrink-0">{c.first_name.charAt(0)}{c.last_name.charAt(0)}</div>
            }
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium">{c.first_name} {c.last_name}</span>
              {c.job_title && <span className="text-xs text-muted-foreground">{c.job_title}</span>}
              {c.email    && <span className="text-xs text-muted-foreground truncate">{c.email}</span>}
            </div>
            {c.status && (
              <span className={cn("ml-auto text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0",
                c.status === "Customer" ? "bg-emerald-100 text-emerald-700" :
                c.status === "Lead"     ? "bg-yellow-100 text-yellow-700"  :
                c.status === "Churned"  ? "bg-red-100 text-red-700"        : "bg-blue-100 text-blue-700"
              )}>{c.status}</span>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

function CompanyDealsTab({ companyId, onNavigateDeal }: { companyId: string; onNavigateDeal?: (id: string) => void }) {
  const { data: deals } = useAppCollection<Deal>(APP_ID, "deals");
  const companyDeals = deals.filter(d => d.company_id === companyId);
  const pipeline = companyDeals.filter(d => d.stage !== "Closed Won" && d.stage !== "Closed Lost").reduce((s, d) => s + (d.value ?? 0), 0);

  if (companyDeals.length === 0) return <EmptyState icon={<IconCurrencyDollar className="h-8 w-8" />} title="No deals" description="No deals linked to this company yet." />;

  return (
    <div className="flex flex-col h-full">
      {pipeline > 0 && (
        <div className="px-3 pt-3">
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-700">
            Pipeline value: <span className="font-semibold">${pipeline.toLocaleString()}</span>
          </div>
        </div>
      )}
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-2 p-3">
          {companyDeals.map(deal => {
            const sym = CURRENCY_SYMBOLS[deal.currency ?? "USD"] ?? "$";
            return (
              <div key={deal.id} onClick={() => onNavigateDeal?.(deal.id)}
                className={cn("flex items-center justify-between rounded-lg border px-3 py-2.5 transition-colors", onNavigateDeal && "cursor-pointer hover:bg-muted/40")}
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium truncate">{deal.title}</span>
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
    </div>
  );
}

interface DetailProps { company: Company; onBack: () => void; onEdit: () => void; onNavigateContact?: (id: string) => void; onNavigateDeal?: (id: string) => void; }

function CompanyDetail({ company, onBack, onEdit, onNavigateContact, onNavigateDeal }: DetailProps) {
  const { data: contacts }   = useAppCollection<Contact>(APP_ID, "contacts");
  const { data: deals }      = useAppCollection<Deal>(APP_ID, "deals");
  const { data: activities } = useAppCollection<Activity>(APP_ID, "activities");
  const { isFavorite, toggle: toggleFav } = useFavorites();

  const peopleCount   = contacts.filter(c => c.company_id === company.id).length;
  const dealsCount    = deals.filter(d => d.company_id === company.id).length;
  const pendingCount  = activities.filter(a => a.company_id === company.id && !a.done).length;
  const pipelineValue = deals.filter(d => d.company_id === company.id && d.stage !== "Closed Won" && d.stage !== "Closed Lost").reduce((s, d) => s + (d.value ?? 0), 0);
  const isFav         = isFavorite("company", company.id);

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 pb-4">
        <PageHeader
          title={company.name}
          description={[company.industry, company.domain_name].filter(Boolean).join(" · ") || "No industry set"}
          onBack={onBack}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => toggleFav("company", company.id, company.name)}>
                {isFav ? <IconStarFilled className="h-4 w-4 text-yellow-400" /> : <IconStar className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="sm" onClick={onEdit}><IconEdit className="h-4 w-4 mr-1.5" /> Edit</Button>
            </div>
          }
        />
      </div>

      <div className="flex flex-1 gap-0 overflow-hidden px-6 pb-6">
        <div className="flex flex-col gap-4 w-64 shrink-0 pr-6 overflow-y-auto">
          <div className="flex flex-col items-center gap-3 py-4">
            {company.domain_name
              ? <img src={`https://www.google.com/s2/favicons?sz=64&domain=${company.domain_name}`} alt="" className="h-14 w-14 rounded-xl object-contain bg-muted p-1" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
              : <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary text-2xl font-bold">{company.name.charAt(0).toUpperCase()}</div>
            }
            <p className="font-semibold text-lg text-center">{company.name}</p>
            {company.industry && <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", INDUSTRY_COLORS[company.industry] ?? "bg-gray-100 text-gray-700")}>{company.industry}</span>}
            {company.ideal_customer_profile && <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-violet-100 text-violet-700"><IconTarget className="h-3 w-3" /> ICP</span>}
          </div>

          <Separator />

          <div className="grid grid-cols-3 gap-2">
            {[["People", peopleCount], ["Deals", dealsCount], ["Tasks", pendingCount]].map(([label, val]) => (
              <div key={label as string} className="rounded-lg bg-muted p-2 text-center">
                <p className="text-xl font-bold">{val}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>

          {pipelineValue > 0 && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-center">
              <p className="text-xs text-emerald-600 mb-0.5">Pipeline</p>
              <p className="text-sm font-bold text-emerald-700">${pipelineValue.toLocaleString()}</p>
            </div>
          )}

          <Separator />

          <div className="flex flex-col gap-3">
            {company.description && <div><p className="text-xs text-muted-foreground mb-1">About</p><p className="text-sm text-muted-foreground leading-relaxed">{company.description}</p></div>}
            <InfoRow icon={<IconWorld className="h-4 w-4" />}        label="Website"   value={company.website}        href={company.website} />
            <InfoRow icon={<IconWorld className="h-4 w-4" />}        label="Domain"    value={company.domain_name}    href={company.domain_name ? `https://${company.domain_name}` : undefined} />
            <InfoRow icon={<IconPhone className="h-4 w-4" />}        label="Phone"     value={company.phone} />
            <InfoRow icon={<IconMapPin className="h-4 w-4" />}       label="Address"   value={company.address} />
            <InfoRow icon={<IconBrandLinkedin className="h-4 w-4" />}label="LinkedIn"  value={company.linkedin_url}   href={company.linkedin_url ?? undefined} />
            {company.employees != null && <InfoRow icon={<IconUsers className="h-4 w-4" />} label="Employees" value={company.employees.toLocaleString()} />}
            {company.annual_recurring_revenue != null && <InfoRow icon={<IconCurrencyDollar className="h-4 w-4" />} label="ARR" value={`$${company.annual_recurring_revenue.toLocaleString()}`} />}
          </div>
        </div>

        <Separator orientation="vertical" />

        <div className="flex flex-col flex-1 overflow-hidden pl-6">
          <Tabs defaultValue="people" className="flex flex-col flex-1 overflow-hidden">
            <TabsList className="w-fit shrink-0">
              <TabsTrigger value="people"><IconUsers className="h-4 w-4 mr-1.5" /> People{peopleCount > 0 && <span className="ml-1.5 text-xs text-muted-foreground">({peopleCount})</span>}</TabsTrigger>
              <TabsTrigger value="deals"><IconCurrencyDollar className="h-4 w-4 mr-1.5" /> Deals{dealsCount > 0 && <span className="ml-1.5 text-xs text-muted-foreground">({dealsCount})</span>}</TabsTrigger>
              <TabsTrigger value="activities"><IconChecklist className="h-4 w-4 mr-1.5" /> Activities</TabsTrigger>
              <TabsTrigger value="notes"><IconNotes className="h-4 w-4 mr-1.5" /> Notes</TabsTrigger>
            </TabsList>
            <TabsContent value="people"     className="flex-1 overflow-hidden mt-4"><PeopleTab companyId={company.id} onNavigateContact={onNavigateContact} /></TabsContent>
            <TabsContent value="deals"      className="flex-1 overflow-hidden mt-4"><CompanyDealsTab companyId={company.id} onNavigateDeal={onNavigateDeal} /></TabsContent>
            <TabsContent value="activities" className="flex-1 overflow-hidden mt-4"><ActivitiesTab filterKey="company_id" filterId={company.id} /></TabsContent>
            <TabsContent value="notes"      className="flex-1 overflow-hidden mt-4"><NotesTab filterKey="company_id" filterId={company.id} /></TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

const FORM_FIELDS = [
  { name: "name",                     label: "Company Name",  type: "text"     as const, required: true },
  { name: "domain_name",              label: "Domain",        type: "text"     as const },
  { name: "industry",                 label: "Industry",      type: "select"   as const, options: INDUSTRIES.map(i => ({ label: i, value: i })) },
  { name: "description",              label: "Description",   type: "textarea" as const },
  { name: "employees",                label: "Employees",     type: "number"   as const },
  { name: "annual_recurring_revenue", label: "ARR ($)",       type: "number"   as const },
  { name: "website",                  label: "Website",       type: "text"     as const },
  { name: "phone",                    label: "Phone",         type: "text"     as const },
  { name: "address",                  label: "Address",       type: "text"     as const },
  { name: "linkedin_url",             label: "LinkedIn URL",  type: "text"     as const },
];

const FILTER_FIELDS: FilterFieldDef[] = [
  { key: "name",        label: "Name",     type: "text" },
  { key: "domain_name", label: "Domain",   type: "text" },
  { key: "website",     label: "Website",  type: "text" },
  { key: "industry",    label: "Industry", type: "enum", options: INDUSTRIES.map(i => ({ label: i, value: i })) },
];

interface Props { onNavigateContact?: (id: string) => void; onNavigateDeal?: (id: string) => void; initialSelectedId?: string | null; }

export default function CompaniesView({ onNavigateContact, onNavigateDeal, initialSelectedId = null }: Props) {
  const [filters, setFilters]           = useState<ActiveFilter[]>([]);
  const [search, setSearch]             = useState("");
  const [selectedId, setSelectedId]     = useState<string | null>(initialSelectedId);
  const [formOpen, setFormOpen]         = useState(false);
  const [editTarget, setEditTarget]     = useState<Company | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);

  const where = mergeWhere(buildWhereClause(filters), buildSearchClause(search, ["name","industry","website","address","domain_name"]));
  const { data: companies, loading, create, update, remove } = useAppCollection<Company>(APP_ID, "companies", where ? { where } : undefined);

  const selected = companies.find(c => c.id === selectedId) ?? null;
  const openEdit = (c: Company) => { setEditTarget(c); setFormOpen(true); };

  const columns: ColumnDef<Company, unknown>[] = [
    {
      accessorKey: "name", header: "Company",
      cell: ({ row: { original: r } }) => (
        <div className="flex items-center gap-3">
          {r.domain_name
            ? <img src={`https://www.google.com/s2/favicons?sz=32&domain=${r.domain_name}`} alt="" className="h-7 w-7 rounded object-contain bg-muted p-0.5 shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
            : <div className="flex h-7 w-7 items-center justify-center rounded bg-muted text-sm font-semibold shrink-0">{r.name.charAt(0).toUpperCase()}</div>
          }
          <div className="flex flex-col min-w-0">
            <span className="font-medium truncate">{r.name}</span>
            {r.domain_name && <span className="text-xs text-muted-foreground truncate">{r.domain_name}</span>}
          </div>
        </div>
      ),
    },
    { accessorKey: "industry", header: "Industry", cell: ({ row: { original: r } }) => r.industry ? <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", INDUSTRY_COLORS[r.industry] ?? "bg-gray-100 text-gray-700")}>{r.industry}</span> : "—" },
    { accessorKey: "employees", header: "Employees", cell: ({ row: { original: r } }) => r.employees?.toLocaleString() ?? "—" },
    { accessorKey: "website",   header: "Website",   cell: ({ row: { original: r } }) => r.website ? <a href={r.website} target="_blank" rel="noreferrer" className="text-primary underline text-sm truncate max-w-[160px] block" onClick={e => e.stopPropagation()}>{r.website}</a> : "—" },
    { accessorKey: "phone",     header: "Phone",     cell: ({ row: { original: r } }) => r.phone || "—" },
    { id: "icp",                header: "ICP",       cell: ({ row: { original: r } }) => r.ideal_customer_profile ? <span className="flex items-center gap-1 text-xs text-violet-600 font-medium"><IconTarget className="h-3.5 w-3.5" /> ICP</span> : null },
  ];

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      if (editTarget) { await update(editTarget.id, values); toast.success("Company updated"); }
      else { await create(values); toast.success("Company created"); }
      setFormOpen(false); setEditTarget(null);
    } catch { toast.error("Something went wrong"); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await remove(deleteTarget.id); toast.success("Company deleted");
      if (selectedId === deleteTarget.id) setSelectedId(null);
      setDeleteTarget(null);
    } catch { toast.error("Failed to delete company"); }
  };

  if (selected) return <CompanyDetail company={selected} onBack={() => setSelectedId(null)} onEdit={() => openEdit(selected)} onNavigateContact={onNavigateContact} onNavigateDeal={onNavigateDeal} />;

  const filtered = filters.length > 0 || !!search;
  return (
    <div className="p-6 space-y-4">
      <PageHeader title="Companies" description="Manage the companies in your pipeline"
        actions={<Button onClick={() => { setEditTarget(null); setFormOpen(true); }}><IconPlus className="h-4 w-4 mr-1.5" /> Add Company</Button>}
      />
      <div className="flex items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search companies…" debounceMs={300} />
        <FilterBuilder fields={FILTER_FIELDS} filters={filters} onChange={setFilters} />
      </div>
      <DataTable data={companies} columns={columns} loading={loading} pageSize={15} selectable onRowClick={row => setSelectedId(row.id)}
        rowActions={[
          { label: "Edit",   icon: <IconEdit  className="h-4 w-4" />, onClick: row => openEdit(row) },
          { label: "Delete", icon: <IconTrash className="h-4 w-4" />, onClick: row => setDeleteTarget(row), destructive: true },
        ]}
        bulkActions={[{ label: "Delete selected", destructive: true, onClick: async rows => { await Promise.all(rows.map(r => remove(r.id))); toast.success(`${rows.length} companies deleted`); } }]}
        emptyState={<EmptyState icon={<IconBuilding className="h-8 w-8" />} title={filtered ? "No companies match these filters" : "No companies yet"} description={filtered ? "Try adjusting or clearing your filters" : "Add your first company to track your accounts"} action={filtered ? undefined : <Button onClick={() => { setEditTarget(null); setFormOpen(true); }}><IconPlus className="h-4 w-4 mr-1.5" /> Add Company</Button>} />}
      />
      <FormDialog open={formOpen} onOpenChange={o => { setFormOpen(o); if (!o) setEditTarget(null); }}
        title={editTarget ? "Edit Company" : "New Company"} description={editTarget ? "Update company details" : "Add a new company to your CRM"}
        fields={FORM_FIELDS} defaultValues={editTarget ?? {}} onSubmit={handleSubmit} submitLabel={editTarget ? "Save Changes" : "Create Company"}
      />
      <ConfirmDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}
        title="Delete Company" description={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        onConfirm={handleDelete} confirmLabel="Delete" destructive
      />
    </div>
  );
}
