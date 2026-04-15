import { useState } from "react";
import { AuthGate, useAppCollection } from "@rootcx/sdk";
import {
  AppShell, AppShellSidebar, AppShellMain,
  Sidebar, SidebarItem, SidebarSection,
  Tabs, TabsList, TabsTrigger, TabsContent,
  Toaster, DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, Separator, useTheme,
  FormDialog, ConfirmDialog, toast,
} from "@rootcx/ui";
import {
  IconLogout, IconUsers, IconBuilding, IconCurrencyDollar, IconChecklist,
  IconSettings, IconChevronUp, IconNotes, IconUser, IconBuildingSkyscraper,
  IconDatabase, IconSun, IconMoon, IconPlus, IconList,
} from "@tabler/icons-react";
import ContactsView   from "./views/ContactsView";
import ContactDetail  from "./views/ContactDetail";
import CompaniesView  from "./views/CompaniesView";
import DealsView      from "./views/DealsView";
import ActivitiesView from "./views/ActivitiesView";
import NotesView      from "./views/NotesView";
import ListView       from "./views/ListView";
import SeedView       from "./views/SeedView";
import type { Favorite, List } from "./lib/types";
import { APP_ID, LIST_ENTITY_TYPES } from "./lib/constants";

type View =
  | "contacts" | "contact_detail"
  | "companies" | "company_detail"
  | "deals" | "deal_detail"
  | "activities" | "notes" | "settings"
  | "list_detail";

type NavState = { view: View; id?: string };

const FAV_ICON: Record<Favorite["entity_type"], React.ReactNode> = {
  contact: <IconUser className="h-4 w-4" />,
  company: <IconBuildingSkyscraper className="h-4 w-4" />,
  deal:    <IconCurrencyDollar className="h-4 w-4" />,
};

const LIST_ENTITY_ICON: Record<string, React.ReactNode> = {
  contacts:  <IconUsers className="h-4 w-4" />,
  companies: <IconBuilding className="h-4 w-4" />,
  deals:     <IconCurrencyDollar className="h-4 w-4" />,
};

export default function App() {
  const [nav, setNav] = useState<NavState>({ view: "contacts" });
  const [createListOpen, setCreateListOpen] = useState(false);
  const [deleteListTarget, setDeleteListTarget] = useState<List | null>(null);

  const { data: lists, create: createList, remove: removeList } = useAppCollection<List>(APP_ID, "lists", { orderBy: "position", order: "asc" });

  const go = (view: View, id?: string) => setNav({ view, id });

  const handleCreateList = async (values: Record<string, unknown>) => {
    try {
      const created = await createList({ ...values, position: lists.length });
      toast.success("List created");
      setCreateListOpen(false);
      if (created?.id) go("list_detail", created.id);
    } catch { toast.error("Failed to create list"); }
  };

  const handleDuplicateList = async (list: List) => {
    try {
      const created = await createList({ name: `${list.name} (copy)`, entity_type: list.entity_type, position: lists.length });
      toast.success("List duplicated");
      if (created?.id) go("list_detail", created.id);
    } catch { toast.error("Failed to duplicate list"); }
  };

  const handleDeleteList = async () => {
    if (!deleteListTarget) return;
    try {
      await removeList(deleteListTarget.id);
      toast.success("List deleted");
      if (nav.view === "list_detail" && nav.id === deleteListTarget.id) go("contacts");
      setDeleteListTarget(null);
    } catch { toast.error("Failed to delete list"); }
  };

  return (
    <AuthGate appTitle="CRM">
      {({ user, logout }) => (
        <AppShell>
          <AppShellSidebar>
            <AppSidebar user={user} logout={logout} nav={nav} go={go} lists={lists} onCreateList={() => setCreateListOpen(true)} />
          </AppShellSidebar>
          <AppShellMain>
            <MainContent
              nav={nav} go={go} lists={lists}
              onDuplicateList={handleDuplicateList}
              onDeleteList={l => setDeleteListTarget(l)}
            />
          </AppShellMain>
          <Toaster />

          <FormDialog
            open={createListOpen}
            onOpenChange={setCreateListOpen}
            title="New List"
            description="Create a new list to organize and track records"
            fields={[
              { name: "name", label: "List name", type: "text" as const, required: true },
              { name: "entity_type", label: "Record type", type: "select" as const, required: true, options: LIST_ENTITY_TYPES.map(t => ({ label: t.label, value: t.value })) },
            ]}
            defaultValues={{}}
            onSubmit={handleCreateList}
            submitLabel="Create List"
          />

          <ConfirmDialog
            open={!!deleteListTarget}
            onOpenChange={o => !o && setDeleteListTarget(null)}
            title="Delete List"
            description={`Are you sure you want to delete "${deleteListTarget?.name}"? The records in the list won't be deleted.`}
            onConfirm={handleDeleteList}
            confirmLabel="Delete"
            destructive
          />
        </AppShell>
      )}
    </AuthGate>
  );
}

function MainContent({ nav, go, lists, onDuplicateList, onDeleteList }: {
  nav: NavState; go: (v: View, id?: string) => void;
  lists: List[]; onDuplicateList: (l: List) => void; onDeleteList: (l: List) => void;
}) {
  const { view, id } = nav;
  if (view === "contacts")       return <ContactsView onSelectContact={id => go("contact_detail", id)} lists={lists} />;
  if (view === "contact_detail") return <ContactDetail contactId={id!} onBack={() => go("contacts")} onNavigateCompany={id => go("company_detail", id)} onNavigateDeal={id => go("deal_detail", id)} />;
  if (view === "companies" || view === "company_detail") return <CompaniesView key={id ?? "list"} initialSelectedId={view === "company_detail" ? id : null} onNavigateContact={id => go("contact_detail", id)} onNavigateDeal={id => go("deal_detail", id)} lists={lists} />;
  if (view === "deals"    || view === "deal_detail")    return <DealsView    key={id ?? "list"} initialSelectedId={view === "deal_detail" ? id : null} onNavigateContact={id => go("contact_detail", id)} onNavigateCompany={id => go("company_detail", id)} lists={lists} />;
  if (view === "activities") return <ActivitiesView />;
  if (view === "notes")      return <NotesView />;
  if (view === "list_detail") {
    const list = lists.find(l => l.id === id);
    if (!list) return null;
    return <ListView key={id} list={list} onBack={() => go("contacts")} onDuplicate={onDuplicateList} onDelete={onDeleteList}
      onNavigateContact={id => go("contact_detail", id)} onNavigateCompany={id => go("company_detail", id)} onNavigateDeal={id => go("deal_detail", id)} />;
  }
  if (view === "settings")   return <SettingsView />;
  return null;
}

function AppSidebar({ user, logout, nav, go, lists, onCreateList }: {
  user: any; logout: () => void; nav: NavState; go: (v: View, id?: string) => void;
  lists: List[]; onCreateList: () => void;
}) {
  const { data: favorites } = useAppCollection<Favorite>(APP_ID, "favorites", { orderBy: "position", order: "asc" });
  const { theme, setTheme } = useTheme();

  const active = (v: View, id?: string) =>
    (nav.view === v && (!id || nav.id === id)) ||
    (v === "contacts"  && nav.view === "contact_detail")  ||
    (v === "companies" && nav.view === "company_detail")   ||
    (v === "deals"     && nav.view === "deal_detail");

  return (
    <Sidebar
      header={
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">C</div>
          <span className="font-semibold text-sm">CRM</span>
        </div>
      }
      footer={
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center justify-between rounded-md px-1 py-1 text-sm hover:bg-accent transition-colors">
              <span className="truncate font-medium">{user.email}</span>
              <IconChevronUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuItem onClick={() => go("settings")}><IconSettings className="h-4 w-4 mr-2" /> Settings</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? <IconSun className="h-4 w-4 mr-2" /> : <IconMoon className="h-4 w-4 mr-2" />}
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </DropdownMenuItem>
            <Separator className="my-1" />
            <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive"><IconLogout className="h-4 w-4 mr-2" /> Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
    >
      <SidebarSection title="Sales">
        <SidebarItem icon={<IconUsers className="h-4 w-4" />}          label="Contacts"   active={active("contacts")}   onClick={() => go("contacts")} />
        <SidebarItem icon={<IconBuilding className="h-4 w-4" />}       label="Companies"  active={active("companies")}  onClick={() => go("companies")} />
        <SidebarItem icon={<IconCurrencyDollar className="h-4 w-4" />} label="Deals"      active={active("deals")}      onClick={() => go("deals")} />
        <SidebarItem icon={<IconChecklist className="h-4 w-4" />}      label="Activities" active={active("activities")} onClick={() => go("activities")} />
        <SidebarItem icon={<IconNotes className="h-4 w-4" />}          label="Notes"      active={active("notes")}      onClick={() => go("notes")} />
      </SidebarSection>

      <div className="py-1">
        <div className="flex w-full items-center px-2 py-1.5">
          <span className="flex-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lists</span>
          <button onClick={onCreateList} className="p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
            <IconPlus className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="space-y-0.5">
          {lists.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">No lists yet</p>
          ) : (
            lists.map(list => (
              <SidebarItem
                key={list.id}
                icon={LIST_ENTITY_ICON[list.entity_type] ?? <IconList className="h-4 w-4" />}
                label={list.name}
                active={active("list_detail", list.id)}
                onClick={() => go("list_detail", list.id)}
              />
            ))
          )}
        </div>
      </div>

      {favorites.length > 0 && (
        <SidebarSection title="Favorites" collapsible defaultOpen>
          {favorites.map(fav => (
            <SidebarItem
              key={fav.id}
              icon={FAV_ICON[fav.entity_type]}
              label={fav.label ?? fav.entity_id.slice(0, 8)}
              onClick={() => go(`${fav.entity_type}_detail` as View, fav.entity_id)}
            />
          ))}
        </SidebarSection>
      )}
    </Sidebar>
  );
}

function SettingsView() {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your CRM configuration and data.</p>
      </div>
      <Tabs defaultValue="demo-data">
        <TabsList>
          <TabsTrigger value="demo-data" className="flex items-center gap-2">
            <IconDatabase className="h-4 w-4" /> Demo data
          </TabsTrigger>
        </TabsList>
        <TabsContent value="demo-data" className="mt-4"><SeedView /></TabsContent>
      </Tabs>
    </div>
  );
}
