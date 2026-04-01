import { useState } from "react";
import { AuthGate } from "@rootcx/sdk";
import {
  AppShell, AppShellSidebar, AppShellMain,
  Sidebar, SidebarItem, SidebarSection,
  Button, Toaster,
} from "@rootcx/ui";
import {
  IconLogout, IconUsers, IconBuilding, IconCurrencyDollar,
  IconChecklist, IconNotes, IconDatabase,
} from "@tabler/icons-react";

import ContactsView   from "./views/ContactsView";
import ContactDetail  from "./views/ContactDetail";
import CompaniesView  from "./views/CompaniesView";
import DealsView      from "./views/DealsView";
import ActivitiesView from "./views/ActivitiesView";
import NotesView      from "./views/NotesView";
import SeedView       from "./views/SeedView";

type View = "contacts" | "contact_detail" | "companies" | "deals" | "activities" | "notes" | "seed";

export default function App() {
  const [view, setView]                         = useState<View>("contacts");
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
                <div className="flex items-center justify-between">
                  <span className="truncate text-sm font-medium">{user.email}</span>
                  <Button variant="ghost" size="icon" onClick={() => logout()}>
                    <IconLogout className="h-4 w-4" />
                  </Button>
                </div>
              }
            >
              <SidebarSection title="Sales">
                <SidebarItem icon={<IconUsers className="h-4 w-4" />}          label="Contacts"   active={view === "contacts" || view === "contact_detail"} onClick={() => setView("contacts")} />
                <SidebarItem icon={<IconBuilding className="h-4 w-4" />}       label="Companies"  active={view === "companies"}  onClick={() => setView("companies")} />
                <SidebarItem icon={<IconCurrencyDollar className="h-4 w-4" />} label="Deals"      active={view === "deals"}      onClick={() => setView("deals")} />
                <SidebarItem icon={<IconChecklist className="h-4 w-4" />}      label="Activities" active={view === "activities"} onClick={() => setView("activities")} />
                <SidebarItem icon={<IconNotes className="h-4 w-4" />}          label="Notes"      active={view === "notes"}      onClick={() => setView("notes")} />
              </SidebarSection>
              <SidebarSection title="Dev">
                <SidebarItem icon={<IconDatabase className="h-4 w-4" />} label="Seed Data" active={view === "seed"} onClick={() => setView("seed")} />
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
            {view === "seed"           && <SeedView />}
          </AppShellMain>

          <Toaster />
        </AppShell>
      )}
    </AuthGate>
  );
}
