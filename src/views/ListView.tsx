import { useState, useMemo } from "react";
import { useAppCollection } from "@rootcx/sdk";
import {
  PageHeader, DataTable, FormDialog, ConfirmDialog, EmptyState, StatusBadge,
  Button, SearchInput, Card, CardContent, Separator, toast,
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  Input,
  Popover, PopoverTrigger, PopoverContent,
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@rootcx/ui";
import {
  IconPlus, IconTrash, IconDotsVertical, IconEdit, IconCopy,
  IconUsers, IconBuilding, IconCurrencyDollar, IconList,
} from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";
import { FilterBuilder, buildWhereClause } from "@/components/FilterBuilder";
import type { ActiveFilter, FilterFieldDef } from "@/components/FilterBuilder";
import { usePaginatedCollection } from "@/hooks/usePaginatedCollection";
import { mergeWhere, buildSearchClause } from "@/lib/search";
import { cn } from "@/lib/utils";
import {
  APP_ID, CONTACT_STATUSES, STAGE_STYLES, CURRENCY_SYMBOLS,
  STAGE_OPTIONS, SOURCE_OPTIONS, PIPELINE_STAGES, INDUSTRY_COLORS,
  LIST_ENTITY_TYPES, ENTITY_LINK_FIELD,
} from "@/lib/constants";
import type { List, ListRecord, Contact, Company, Deal } from "@/lib/types";

const ENTITY_ICON: Record<string, React.ReactNode> = {
  contacts:  <IconUsers className="h-5 w-5" />,
  companies: <IconBuilding className="h-5 w-5" />,
  deals:     <IconCurrencyDollar className="h-5 w-5" />,
};

const ENTITY_LABEL: Record<string, string> = Object.fromEntries(LIST_ENTITY_TYPES.map(t => [t.value, t.label]));

const SEARCH_FIELDS: Record<string, string[]> = {
  contacts:  ["first_name", "last_name", "email", "job_title", "city"],
  companies: ["name", "domain_name", "website"],
  deals:     ["title"],
};

function useContactColumns(companies: Company[]): ColumnDef<Contact, unknown>[] {
  return useMemo(() => [
    {
      accessorKey: "first_name", header: "Name",
      cell: ({ row: { original: r } }) => (
        <div className="flex items-center gap-3">
          {r.avatar_url
            ? <img src={r.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover shrink-0" />
            : <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold shrink-0">{r.first_name.charAt(0)}{r.last_name.charAt(0)}</div>
          }
          <div className="flex flex-col min-w-0">
            <span className="font-medium">{r.first_name} {r.last_name}</span>
            {r.email && <span className="text-xs text-muted-foreground truncate">{r.email}</span>}
          </div>
        </div>
      ),
    },
    { accessorKey: "job_title",  header: "Title",   cell: ({ row: { original: r } }) => r.job_title || "—" },
    { accessorKey: "company_id", header: "Company", cell: ({ row: { original: r } }) => companies.find(c => c.id === r.company_id)?.name ?? "—" },
    { accessorKey: "city",       header: "City",    cell: ({ row: { original: r } }) => r.city  || "—" },
    { accessorKey: "phone",      header: "Phone",   cell: ({ row: { original: r } }) => r.phone || "—" },
    { accessorKey: "status",     header: "Status",  cell: ({ row: { original: r } }) => r.status ? <StatusBadge status={r.status} /> : "—" },
  ], [companies]);
}

function useCompanyColumns(): ColumnDef<Company, unknown>[] {
  return useMemo(() => [
    {
      accessorKey: "name", header: "Company",
      cell: ({ row: { original: r } }) => (
        <div className="flex items-center gap-3">
          {r.domain_name
            ? <img src={`https://www.google.com/s2/favicons?sz=32&domain=${r.domain_name}`} alt="" className="h-7 w-7 rounded shrink-0" />
            : <div className="flex h-7 w-7 items-center justify-center rounded bg-primary/10 text-primary text-xs font-bold shrink-0">{r.name.charAt(0)}</div>
          }
          <div className="flex flex-col min-w-0">
            <span className="font-medium">{r.name}</span>
            {r.domain_name && <span className="text-xs text-muted-foreground truncate">{r.domain_name}</span>}
          </div>
        </div>
      ),
    },
    { accessorKey: "industry",  header: "Industry", cell: ({ row: { original: r } }) => r.industry ? <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", INDUSTRY_COLORS[r.industry] ?? "bg-slate-100 text-slate-700")}>{r.industry}</span> : "—" },
    { accessorKey: "employees", header: "Employees", cell: ({ row: { original: r } }) => r.employees?.toLocaleString() ?? "—" },
    { accessorKey: "website",   header: "Website",   cell: ({ row: { original: r } }) => r.website || "—" },
  ], []);
}

function useDealColumns(contacts: Contact[], companies: Company[]): ColumnDef<Deal, unknown>[] {
  return useMemo(() => [
    {
      accessorKey: "title", header: "Deal",
      cell: ({ row: { original: r } }) => {
        const c = contacts.find(c => c.id === r.contact_id);
        return (
          <div className="flex flex-col">
            <span className="font-medium">{r.title}</span>
            {c && <span className="text-xs text-muted-foreground">{c.first_name} {c.last_name}</span>}
          </div>
        );
      },
    },
    {
      accessorKey: "value", header: "Value",
      cell: ({ row: { original: r } }) => {
        const sym = CURRENCY_SYMBOLS[r.currency ?? "USD"] ?? "$";
        return r.value != null ? <span className="font-semibold text-emerald-600">{sym}{r.value.toLocaleString()}</span> : "—";
      },
    },
    { accessorKey: "stage",      header: "Stage",   cell: ({ row: { original: r } }) => <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium border", STAGE_STYLES[r.stage] ?? "bg-gray-100 text-gray-700")}>{r.stage}</span> },
    { accessorKey: "probability",header: "Prob.",   cell: ({ row: { original: r } }) => r.probability != null ? `${r.probability}%` : "—" },
    { accessorKey: "source",     header: "Source",  cell: ({ row: { original: r } }) => r.source || "—" },
    { accessorKey: "company_id", header: "Company", cell: ({ row: { original: r } }) => companies.find(c => c.id === r.company_id)?.name ?? "—" },
    { accessorKey: "close_date", header: "Close",   cell: ({ row: { original: r } }) => r.close_date || "—" },
  ], [contacts, companies]);
}

function useFilterFields(entityType: string, contacts: Contact[], companies: Company[]): FilterFieldDef[] {
  return useMemo(() => {
    if (entityType === "contacts") return [
      { key: "first_name", label: "First name", type: "text" as const },
      { key: "last_name",  label: "Last name",  type: "text" as const },
      { key: "email",      label: "Email",      type: "text" as const },
      { key: "job_title",  label: "Job title",  type: "text" as const },
      { key: "city",       label: "City",       type: "text" as const },
      { key: "status",     label: "Status",     type: "enum" as const, options: CONTACT_STATUSES.map(s => ({ label: s, value: s })) },
      { key: "company_id", label: "Company",    type: "entity_link" as const, options: companies.map(c => ({ label: c.name, value: c.id })) },
    ];
    if (entityType === "companies") return [
      { key: "name",        label: "Name",      type: "text" as const },
      { key: "domain_name", label: "Domain",    type: "text" as const },
      { key: "industry",    label: "Industry",  type: "enum" as const, options: Object.keys(INDUSTRY_COLORS).map(s => ({ label: s, value: s })) },
      { key: "website",     label: "Website",   type: "text" as const },
    ];
    return [
      { key: "title",      label: "Title",    type: "text" as const },
      { key: "value",      label: "Value",    type: "number" as const },
      { key: "close_date", label: "Close",    type: "date" as const },
      { key: "stage",      label: "Stage",    type: "enum" as const, options: STAGE_OPTIONS },
      { key: "source",     label: "Source",   type: "enum" as const, options: SOURCE_OPTIONS },
      { key: "contact_id", label: "Contact",  type: "entity_link" as const, options: contacts.map(c => ({ label: `${c.first_name} ${c.last_name}`, value: c.id })) },
      { key: "company_id", label: "Company",  type: "entity_link" as const, options: companies.map(c => ({ label: c.name, value: c.id })) },
    ];
  }, [entityType, contacts, companies]);
}

function AddRecordDialog({ open, onOpenChange, entityType, allRecords, existingIds, onAdd }: {
  open: boolean; onOpenChange: (o: boolean) => void; entityType: string;
  allRecords: { id: string; label: string }[]; existingIds: Set<string>;
  onAdd: (recordId: string) => Promise<void>;
}) {
  const available = allRecords.filter(r => !existingIds.has(r.id));
  return (
    <FormDialog open={open} onOpenChange={onOpenChange}
      title="Add to list"
      description={`Add an existing ${ENTITY_LABEL[entityType]?.toLowerCase().slice(0, -1) ?? "record"} to this list`}
      fields={[{
        name: "record_id",
        label: ENTITY_LABEL[entityType]?.slice(0, -1) ?? "Record",
        type: "select" as const, required: true,
        options: available.map(r => ({ label: r.label, value: r.id })),
      }]}
      defaultValues={{}} onSubmit={async v => { await onAdd(v.record_id as string); onOpenChange(false); }} submitLabel="Add to list"
    />
  );
}

function DealPipeline({ deals, companies }: { deals: Deal[]; companies: Company[] }) {
  const totalValue = deals.filter(d => PIPELINE_STAGES.includes(d.stage)).reduce((s, d) => s + (d.value ?? 0), 0);
  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <IconCurrencyDollar className="h-4 w-4" />
        Pipeline value: <strong className="text-foreground">${totalValue.toLocaleString()}</strong>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:grid-cols-4">
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
                      <Card key={deal.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-3 space-y-1">
                          <p className="text-sm font-medium leading-tight">{deal.title}</p>
                          {deal.value != null && <p className="text-xs font-semibold text-emerald-600">{sym}{deal.value.toLocaleString()}</p>}
                          {deal.probability != null && (
                            <div className="flex items-center gap-1.5">
                              <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden"><div className="h-full bg-emerald-400 rounded-full" style={{ width: `${deal.probability}%` }} /></div>
                              <span className="text-xs text-muted-foreground">{deal.probability}%</span>
                            </div>
                          )}
                          {deal.company_id && <p className="text-xs text-muted-foreground">{companies.find(c => c.id === deal.company_id)?.name}</p>}
                          {deal.close_date && <p className="text-xs text-muted-foreground">Close: {deal.close_date}</p>}
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
    </div>
  );
}

function RenamePopover({ name, onRename, children }: { name: string; onRename: (n: string) => void; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(name);
  return (
    <Popover open={open} onOpenChange={o => { setOpen(o); if (o) setValue(name); }}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-64 p-3 space-y-3" align="start">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rename list</p>
        <form onSubmit={e => { e.preventDefault(); if (value.trim()) { onRename(value.trim()); setOpen(false); } }}>
          <Input value={value} onChange={e => setValue(e.target.value)} className="h-8 text-sm" autoFocus />
          <Button type="submit" size="sm" className="w-full mt-2 h-7 text-xs" disabled={!value.trim()}>Save</Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}

interface Props {
  list: List;
  onBack: () => void;
  onDuplicate: (list: List) => void;
  onDelete: (list: List) => void;
  onNavigateContact?: (id: string) => void;
  onNavigateCompany?: (id: string) => void;
  onNavigateDeal?: (id: string) => void;
}

export default function ListView({ list, onBack, onDuplicate, onDelete, onNavigateContact, onNavigateCompany, onNavigateDeal }: Props) {
  const [filters, setFilters] = useState<ActiveFilter[]>([]);
  const [search, setSearch]   = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const linkField = ENTITY_LINK_FIELD[list.entity_type] as keyof ListRecord;

  const { data: listRecords, loading: lrLoading, create: createLR, remove: removeLR } = useAppCollection<ListRecord>(APP_ID, "list_records", { where: { list_id: { $eq: list.id } } });
  const { update: updateList } = useAppCollection<List>(APP_ID, "lists");

  const recordIds = useMemo(() => listRecords.map(lr => lr[linkField] as string).filter(Boolean), [listRecords, linkField]);
  const recordIdSet = useMemo(() => new Set(recordIds), [recordIds]);

  const userWhere = mergeWhere(buildWhereClause(filters), buildSearchClause(search, SEARCH_FIELDS[list.entity_type] ?? []));
  const where = mergeWhere({ id: { $in: recordIds } }, userWhere);

  const activeResult = usePaginatedCollection(APP_ID, list.entity_type, { where });

  const { data: allDealsInList } = useAppCollection<Deal>(APP_ID, "deals",
    list.entity_type === "deals" ? { where: { id: { $in: recordIds } } } : { where: { id: { $in: [] } } });

  const { data: companies } = useAppCollection<Company>(APP_ID, "companies");
  const { data: contacts }  = useAppCollection<Contact>(APP_ID, "contacts");

  const allRecordsForType: { id: string; label: string }[] = useMemo(() => {
    if (list.entity_type === "contacts")  return contacts.map(c => ({ id: c.id, label: `${c.first_name} ${c.last_name}` }));
    if (list.entity_type === "companies") return companies.map(c => ({ id: c.id, label: c.name }));
    return [];
  }, [list.entity_type, contacts, companies]);

  const contactColumns  = useContactColumns(companies);
  const companyColumns  = useCompanyColumns();
  const dealColumns     = useDealColumns(contacts, companies);
  const filterFields    = useFilterFields(list.entity_type, contacts, companies);

  const handleAddRecord = async (recordId: string) => {
    try {
      await createLR({ list_id: list.id, [linkField]: recordId, position: listRecords.length });
      toast.success("Record added to list");
    } catch { toast.error("Failed to add record"); }
  };

  const handleRemoveRecord = async (recordId: string) => {
    const lr = listRecords.find(lr => lr[linkField] === recordId);
    if (!lr) return;
    try {
      await removeLR(lr.id);
      toast.success("Record removed from list");
      setDeleteTarget(null);
    } catch { toast.error("Failed to remove record"); }
  };

  const handleRename = async (newName: string) => {
    try {
      await updateList(list.id, { name: newName });
      toast.success("List renamed");
    } catch { toast.error("Failed to rename list"); }
  };

  const handleRowClick = (row: Contact | Company | Deal) => {
    if (list.entity_type === "contacts")  onNavigateContact?.(row.id);
    if (list.entity_type === "companies") onNavigateCompany?.(row.id);
    if (list.entity_type === "deals")     onNavigateDeal?.(row.id);
  };

  const rowActions = [
    { label: "Remove from list", icon: <IconTrash className="h-4 w-4" />, onClick: (row: { id: string }) => setDeleteTarget(row.id), destructive: true },
  ];

  const bulkActions = [{
    label: "Remove selected", destructive: true,
    onClick: async (rows: { id: string }[]) => {
      await Promise.all(rows.map(r => handleRemoveRecord(r.id)));
      toast.success(`${rows.length} records removed`);
    },
  }];

  const filtered = filters.length > 0 || !!search;
  const isEmpty = !lrLoading && recordIds.length === 0;
  const emptyIcon = ENTITY_ICON[list.entity_type] ?? <IconList className="h-8 w-8" />;

  const emptyState = (
    <EmptyState icon={emptyIcon}
      title={filtered ? "No records match these filters" : "This list is empty"}
      description={filtered ? "Try adjusting or clearing your filters" : `Add ${ENTITY_LABEL[list.entity_type]?.toLowerCase() ?? "records"} to get started`}
      action={filtered ? undefined : <Button onClick={() => setAddOpen(true)}><IconPlus className="h-4 w-4 mr-1.5" /> Add {ENTITY_LABEL[list.entity_type]?.slice(0, -1)}</Button>}
    />
  );

  const renderTable = () => {
    if (isEmpty && !filtered) return emptyState;

    const sharedProps = {
      loading: lrLoading || activeResult.loading,
      pageSize: activeResult.pageSize,
      selectable: true,
      rowCount: activeResult.rowCount,
      onPaginationChange: activeResult.onPaginationChange,
      onRowClick: handleRowClick,
      rowActions,
      bulkActions,
      emptyState,
    };

    const columns = list.entity_type === "contacts" ? contactColumns
      : list.entity_type === "companies" ? companyColumns : dealColumns;
    return <DataTable data={activeResult.data} columns={columns} {...sharedProps} />;
  };

  const tableContent = (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder={`Search ${ENTITY_LABEL[list.entity_type]?.toLowerCase()}…`} debounceMs={300} />
        <FilterBuilder fields={filterFields} filters={filters} onChange={setFilters} />
      </div>
      {renderTable()}
    </>
  );

  return (
    <div className="p-4 md:p-6 space-y-4">
      <PageHeader title={list.name}
        description={`${isEmpty ? 0 : activeResult.rowCount} ${ENTITY_LABEL[list.entity_type]?.toLowerCase() ?? "records"}`}
        onBack={onBack}
        actions={
          <div className="flex items-center gap-2">
            <Button onClick={() => setAddOpen(true)}>
              <IconPlus className="h-4 w-4 mr-1.5" /> Add {ENTITY_LABEL[list.entity_type]?.slice(0, -1)}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon"><IconDotsVertical className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <RenamePopover name={list.name} onRename={handleRename}>
                  <DropdownMenuItem onSelect={e => e.preventDefault()}>
                    <IconEdit className="h-4 w-4 mr-2" /> Rename
                  </DropdownMenuItem>
                </RenamePopover>
                <DropdownMenuItem onClick={() => onDuplicate(list)}>
                  <IconCopy className="h-4 w-4 mr-2" /> Duplicate list
                </DropdownMenuItem>
                <Separator className="my-1" />
                <DropdownMenuItem onClick={() => onDelete(list)} className="text-destructive focus:text-destructive">
                  <IconTrash className="h-4 w-4 mr-2" /> Delete list
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      {list.entity_type === "deals" ? (
        <Tabs defaultValue="list">
          <TabsList className="w-fit">
            <TabsTrigger value="list">List</TabsTrigger>
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          </TabsList>
          <TabsContent value="list" className="space-y-4 mt-4">{tableContent}</TabsContent>
          <TabsContent value="pipeline" className="mt-4">
            <DealPipeline deals={allDealsInList} companies={companies} />
          </TabsContent>
        </Tabs>
      ) : (
        tableContent
      )}

      <AddRecordDialog open={addOpen} onOpenChange={setAddOpen} entityType={list.entity_type}
        allRecords={allRecordsForType} existingIds={recordIdSet} onAdd={handleAddRecord} />

      <ConfirmDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}
        title="Remove from list" description="Are you sure you want to remove this record from the list? The record itself won't be deleted."
        onConfirm={async () => { if (deleteTarget) await handleRemoveRecord(deleteTarget); }}
        confirmLabel="Remove" destructive />
    </div>
  );
}
