import { useState } from "react";
import { Routes, Route, Navigate, NavLink, useLocation, useNavigate, useParams } from "react-router-dom";
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
  const [createListOpen, setCreateListOpen] = useState(false);
  const [deleteListTarget, setDeleteListTarget] = useState<List | null>(null);
  const navigate = useNavigate();

  const { data: lists, create: createList, remove: removeList } = useAppCollection<List>(APP_ID, "lists", { orderBy: "position", order: "asc" });

  const handleCreateList = async (values: Record<string, unknown>) => {
    try {
      const created = await createList({ ...values, position: lists.length });
      toast.success("List created");
      setCreateListOpen(false);
      if (created?.id) navigate(`/lists/${created.id}`);
    } catch { toast.error("Failed to create list"); }
  };

  const handleDuplicateList = async (list: List) => {
    try {
      const created = await createList({ name: `${list.name} (copy)`, entity_type: list.entity_type, position: lists.length });
      toast.success("List duplicated");
      if (created?.id) navigate(`/lists/${created.id}`);
    } catch { toast.error("Failed to duplicate list"); }
  };

  const handleDeleteList = async () => {
    if (!deleteListTarget) return;
    try {
      await removeList(deleteListTarget.id);
      toast.success("List deleted");
      navigate("/contacts");
      setDeleteListTarget(null);
    } catch { toast.error("Failed to delete list"); }
  };

  return (
    <AuthGate appTitle="CRM">
      {({ user, logout }) => (
        <AppShell>
          <AppShellSidebar>
            <AppSidebar user={user} logout={logout} lists={lists} onCreateList={() => setCreateListOpen(true)} />
          </AppShellSidebar>
          <AppShellMain>
            <Routes>
              <Route path="/"                 element={<Navigate to="/contacts" replace />} />
              <Route path="/contacts"         element={<ContactsView lists={lists} />} />
              <Route path="/contacts/:id"     element={<ContactDetail />} />
              <Route path="/companies/:id?"   element={<CompaniesView lists={lists} />} />
              <Route path="/deals/:id?"       element={<DealsView lists={lists} />} />
              <Route path="/activities"       element={<ActivitiesView />} />
              <Route path="/notes"            element={<NotesView />} />
              <Route path="/lists/:id"        element={<ListViewRoute lists={lists} onDuplicate={handleDuplicateList} onDelete={l => setDeleteListTarget(l)} />} />
              <Route path="/settings"         element={<SettingsView />} />
              <Route path="*"                 element={<Navigate to="/contacts" replace />} />
            </Routes>
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

function ListViewRoute({ lists, onDuplicate, onDelete }: { lists: List[]; onDuplicate: (l: List) => void; onDelete: (l: List) => void }) {
  const { id } = useParams<{ id: string }>();
  const list = lists.find(l => l.id === id);
  if (!list) return null;
  return <ListView list={list} onDuplicate={onDuplicate} onDelete={onDelete} />;
}

function AppSidebar({ user, logout, lists, onCreateList }: {
  user: any; logout: () => void;
  lists: List[]; onCreateList: () => void;
}) {
  const { data: favorites } = useAppCollection<Favorite>(APP_ID, "favorites", { orderBy: "position", order: "asc" });
  const { theme, setTheme } = useTheme();
  const { pathname } = useLocation();
  const navigate = useNavigate();

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
            <DropdownMenuItem onClick={() => navigate("/settings")}><IconSettings className="h-4 w-4 mr-2" /> Settings</DropdownMenuItem>
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
        <SidebarItem asChild isActive={pathname.startsWith("/contacts")}>
          <NavLink to="/contacts"><IconUsers className="h-4 w-4" /><span>Contacts</span></NavLink>
        </SidebarItem>
        <SidebarItem asChild isActive={pathname.startsWith("/companies")}>
          <NavLink to="/companies"><IconBuilding className="h-4 w-4" /><span>Companies</span></NavLink>
        </SidebarItem>
        <SidebarItem asChild isActive={pathname.startsWith("/deals")}>
          <NavLink to="/deals"><IconCurrencyDollar className="h-4 w-4" /><span>Deals</span></NavLink>
        </SidebarItem>
        <SidebarItem asChild isActive={pathname.startsWith("/activities")}>
          <NavLink to="/activities"><IconChecklist className="h-4 w-4" /><span>Activities</span></NavLink>
        </SidebarItem>
        <SidebarItem asChild isActive={pathname.startsWith("/notes")}>
          <NavLink to="/notes"><IconNotes className="h-4 w-4" /><span>Notes</span></NavLink>
        </SidebarItem>
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
                asChild
                isActive={pathname === `/lists/${list.id}`}
              >
                <NavLink to={`/lists/${list.id}`}>
                  {LIST_ENTITY_ICON[list.entity_type] ?? <IconList className="h-4 w-4" />}
                  <span>{list.name}</span>
                </NavLink>
              </SidebarItem>
            ))
          )}
        </div>
      </div>

      {favorites.length > 0 && (
        <SidebarSection title="Favorites" collapsible defaultOpen>
          {favorites.map(fav => (
            <SidebarItem
              key={fav.id}
              asChild
              isActive={pathname === `/${fav.entity_type}s/${fav.entity_id}`}
            >
              <NavLink to={`/${fav.entity_type}s/${fav.entity_id}`}>
                {FAV_ICON[fav.entity_type]}
                <span>{fav.label ?? fav.entity_id.slice(0, 8)}</span>
              </NavLink>
            </SidebarItem>
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
