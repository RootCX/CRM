import { useState } from "react";
import { AuthGate } from "@rootcx/sdk";
import {
  AppShell, AppShellSidebar, AppShellMain,
  Sidebar, SidebarItem, SidebarSection,
  Button, Toaster,
} from "@rootcx/ui";
import {
  IconLogout, IconUsers, IconBuilding, IconCurrencyDollar,
  IconChecklist, IconLayoutDashboard,
} from "@tabler/icons-react";

import Dashboard from "./views/Dashboard";
import ContactsView from "./views/ContactsView";
import ContactDetail from "./views/ContactDetail";
import CompaniesView from "./views/CompaniesView";
import DealsView from "./views/DealsView";
import ActivitiesView from "./views/ActivitiesView";

type View = "dashboard" | "contacts" | "contact_detail" | "companies" | "deals" | "activities";

export default function App() {
  const [view, setView] = useState<View>("dashboard");
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
                  <div className="flex flex-col min-w-0">
                    <span className="truncate text-sm font-medium">{user.email}</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => logout()}>
                    <IconLogout className="h-4 w-4" />
                  </Button>
                </div>
              }
            >
              <SidebarSection>
                <SidebarItem
                  icon={<IconLayoutDashboard className="h-4 w-4" />}
                  label="Dashboard"
                  active={view === "dashboard"}
                  onClick={() => setView("dashboard")}
                />
              </SidebarSection>
              <SidebarSection title="Sales">
                <SidebarItem
                  icon={<IconUsers className="h-4 w-4" />}
                  label="Contacts"
                  active={view === "contacts" || view === "contact_detail"}
                  onClick={() => setView("contacts")}
                />
                <SidebarItem
                  icon={<IconBuilding className="h-4 w-4" />}
                  label="Companies"
                  active={view === "companies"}
                  onClick={() => setView("companies")}
                />
                <SidebarItem
                  icon={<IconCurrencyDollar className="h-4 w-4" />}
                  label="Deals"
                  active={view === "deals"}
                  onClick={() => setView("deals")}
                />
                <SidebarItem
                  icon={<IconChecklist className="h-4 w-4" />}
                  label="Activities"
                  active={view === "activities"}
                  onClick={() => setView("activities")}
                />
              </SidebarSection>
            </Sidebar>
          </AppShellSidebar>

          <AppShellMain>
            {view === "dashboard" && <Dashboard onNavigate={setView} />}
            {view === "contacts" && <ContactsView onSelectContact={navigateToContact} />}
            {view === "contact_detail" && selectedContactId && (
              <ContactDetail
                contactId={selectedContactId}
                onBack={() => setView("contacts")}
              />
            )}
            {view === "companies" && <CompaniesView />}
            {view === "deals" && <DealsView />}
            {view === "activities" && <ActivitiesView />}
          </AppShellMain>

          <Toaster />
        </AppShell>
      )}
    </AuthGate>
  );
}
