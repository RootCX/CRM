import { useState } from "react";
import { AuthGate, useAppCollection } from "@rootcx/sdk";
import {
  AppShell, AppShellSidebar, AppShellMain,
  Sidebar, SidebarItem, SidebarSection,
  Tabs, TabsList, TabsTrigger, TabsContent,
  Toaster, DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, Separator,
} from "@rootcx/ui";
import {
  IconLogout, IconUsers, IconBuilding, IconCurrencyDollar, IconChecklist,
  IconSettings, IconChevronUp, IconNotes, IconUser, IconBuildingSkyscraper,
  IconDatabase,
} from "@tabler/icons-react";
import ContactsView   from "./views/ContactsView";
import ContactDetail  from "./views/ContactDetail";
import CompaniesView  from "./views/CompaniesView";
import DealsView      from "./views/DealsView";
import ActivitiesView from "./views/ActivitiesView";
import NotesView      from "./views/NotesView";
import SeedView       from "./views/SeedView";
import type { Favorite } from "./lib/types";
import { APP_ID } from "./lib/constants";

type View =
  | "contacts" | "contact_detail"
  | "companies" | "company_detail"
  | "deals" | "deal_detail"
  | "activities" | "notes" | "settings";

// Encodes both view + selected id to avoid three separate state vars
type NavState = { view: View; id?: string };

const FAV_ICON: Record<Favorite["entity_type"], React.ReactNode> = {
  contact: <IconUser className="h-4 w-4" />,
  company: <IconBuildingSkyscraper className="h-4 w-4" />,
  deal:    <IconCurrencyDollar className="h-4 w-4" />,
};

export default function App() {
  const [nav, setNav] = useState<NavState>({ view: "contacts" });

  const go = (view: View, id?: string) => setNav({ view, id });

  return (
    <AuthGate appTitle="CRM">
      {({ user, logout }) => (
        <AppShell>
          <AppShellSidebar>
            <AppSidebar user={user} logout={logout} nav={nav} go={go} />
          </AppShellSidebar>
          <AppShellMain>
            <MainContent nav={nav} go={go} />
          </AppShellMain>
          <Toaster />
        </AppShell>
      )}
    </AuthGate>
  );
}

function MainContent({ nav, go }: { nav: NavState; go: (v: View, id?: string) => void }) {
  const { view, id } = nav;
  if (view === "contacts")       return <ContactsView onSelectContact={id => go("contact_detail", id)} />;
  if (view === "contact_detail") return <ContactDetail contactId={id!} onBack={() => go("contacts")} onNavigateCompany={id => go("company_detail", id)} onNavigateDeal={id => go("deal_detail", id)} />;
  if (view === "companies" || view === "company_detail") return <CompaniesView key={id ?? "list"} initialSelectedId={view === "company_detail" ? id : null} onNavigateContact={id => go("contact_detail", id)} onNavigateDeal={id => go("deal_detail", id)} />;
  if (view === "deals"    || view === "deal_detail")    return <DealsView    key={id ?? "list"} initialSelectedId={view === "deal_detail" ? id : null} onNavigateContact={id => go("contact_detail", id)} onNavigateCompany={id => go("company_detail", id)} />;
  if (view === "activities") return <ActivitiesView />;
  if (view === "notes")      return <NotesView />;
  if (view === "settings")   return <SettingsView />;
  return null;
}

function AppSidebar({ user, logout, nav, go }: { user: any; logout: () => void; nav: NavState; go: (v: View, id?: string) => void }) {
  const { data: favorites } = useAppCollection<Favorite>(APP_ID, "favorites", { orderBy: "position", order: "asc" });

  // A view is "active" if it matches, including its detail sub-view
  const active = (v: View) =>
    nav.view === v ||
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
