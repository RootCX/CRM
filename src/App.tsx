import { useState } from "react";
import { AuthGate } from "@rootcx/sdk";
import {
  AppShell, AppShellSidebar, AppShellMain,
  Sidebar, SidebarItem, SidebarSection,
  Button, Toaster,
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  Separator,
} from "@rootcx/ui";
import {
  IconLogout, IconUsers, IconBuilding, IconCurrencyDollar,
  IconChecklist, IconNotes, IconSettings, IconChevronUp,
} from "@tabler/icons-react";

import ContactsView   from "./views/ContactsView";
import ContactDetail  from "./views/ContactDetail";
import CompaniesView  from "./views/CompaniesView";
import DealsView      from "./views/DealsView";
import ActivitiesView from "./views/ActivitiesView";
import NotesView      from "./views/NotesView";
import SeedView       from "./views/SeedView";

type View = "contacts" | "contact_detail" | "companies" | "deals" | "activities" | "notes" | "settings";

export default function App() {
  const [view, setView]                           = useState<View>("contacts");
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);

  const navigateToContact = (id: string) => {
    setSelectedContactId(id);
    setView("contact_detail");
  };

  return (
    <AuthGate appTitle="CRM">
      {({ user, logout }) => (
        <AppShell>
          <AppShellSidebar>
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
                    <DropdownMenuItem onClick={() => setView("settings")}>
                      <IconSettings className="h-4 w-4 mr-2" />
                      Settings
                    </DropdownMenuItem>
                    <Separator className="my-1" />
                    <DropdownMenuItem onClick={() => logout()} className="text-destructive focus:text-destructive">
                      <IconLogout className="h-4 w-4 mr-2" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              }
            >
              <SidebarSection title="Sales">
                <SidebarItem icon={<IconUsers className="h-4 w-4" />}          label="Contacts"   active={view === "contacts" || view === "contact_detail"} onClick={() => setView("contacts")} />
                <SidebarItem icon={<IconBuilding className="h-4 w-4" />}       label="Companies"  active={view === "companies"}  onClick={() => setView("companies")} />
                <SidebarItem icon={<IconCurrencyDollar className="h-4 w-4" />} label="Deals"      active={view === "deals"}      onClick={() => setView("deals")} />
                <SidebarItem icon={<IconChecklist className="h-4 w-4" />}      label="Activities" active={view === "activities"} onClick={() => setView("activities")} />
                <SidebarItem icon={<IconNotes className="h-4 w-4" />}          label="Notes"      active={view === "notes"}      onClick={() => setView("notes")} />
              </SidebarSection>
            </Sidebar>
          </AppShellSidebar>

          <AppShellMain>
            {view === "contacts"       && <ContactsView onSelectContact={navigateToContact} />}
            {view === "contact_detail" && selectedContactId && <ContactDetail contactId={selectedContactId} onBack={() => setView("contacts")} />}
            {view === "companies"      && <CompaniesView />}
            {view === "deals"          && <DealsView />}
            {view === "activities"     && <ActivitiesView />}
            {view === "notes"          && <NotesView />}
            {view === "settings"       && <SettingsView />}
          </AppShellMain>

          <Toaster />
        </AppShell>
      )}
    </AuthGate>
  );
}

// ─── Settings view ────────────────────────────────────────────────────────────

import { IconDatabase } from "@tabler/icons-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@rootcx/ui";

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
            <IconDatabase className="h-4 w-4" />
            Demo data
          </TabsTrigger>
        </TabsList>
        <TabsContent value="demo-data" className="mt-4">
          <SeedView />
        </TabsContent>
      </Tabs>
    </div>
  );
}

