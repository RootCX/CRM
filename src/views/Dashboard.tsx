import { useAppCollection } from "@rootcx/sdk";
import { KPICard, PageHeader, Card, CardContent, CardHeader, CardTitle, Badge, LoadingState } from "@rootcx/ui";
import {
  IconUsers, IconBuilding, IconCurrencyDollar, IconChecklist,
  IconTrendingUp,
} from "@tabler/icons-react";

const APP_ID = "crm";

type View = "dashboard" | "contacts" | "companies" | "deals" | "activities";

interface Contact { id: string; first_name: string; last_name: string; status: string; }
interface Company { id: string; name: string; }
interface Deal { id: string; title: string; value: number; stage: string; }
interface Activity { id: string; subject: string; type: string; done: boolean; due_date: string; }

const STAGE_COLORS: Record<string, string> = {
  "Lead": "bg-slate-100 text-slate-700",
  "Qualified": "bg-blue-100 text-blue-700",
  "Proposal": "bg-purple-100 text-purple-700",
  "Negotiation": "bg-yellow-100 text-yellow-700",
  "Closed Won": "bg-green-100 text-green-700",
  "Closed Lost": "bg-red-100 text-red-700",
};

export default function Dashboard({ onNavigate }: { onNavigate: (v: View) => void }) {
  const { data: contacts, loading: lc } = useAppCollection<Contact>(APP_ID, "contacts");
  const { data: companies, loading: lco } = useAppCollection<Company>(APP_ID, "companies");
  const { data: deals, loading: ld } = useAppCollection<Deal>(APP_ID, "deals");
  const { data: activities, loading: la } = useAppCollection<Activity>(APP_ID, "activities");

  const totalRevenue = deals
    .filter(d => d.stage === "Closed Won")
    .reduce((sum, d) => sum + (d.value ?? 0), 0);

  const openDeals = deals.filter(d => !["Closed Won", "Closed Lost"].includes(d.stage));
  const pendingActivities = activities.filter(a => !a.done);
  const recentDeals = [...deals].sort((a, b) => 0).slice(0, 5);
  const recentActivities = [...activities].sort((a, b) => 0).slice(0, 5);

  const loading = lc || lco || ld || la;

  if (loading) return <LoadingState variant="skeleton" />;

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Dashboard" description="Overview of your CRM activity" />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div onClick={() => onNavigate("contacts")} className="cursor-pointer">
          <KPICard
            label="Total Contacts"
            value={contacts.length}
            icon={<IconUsers className="h-5 w-5 text-blue-500" />}
          />
        </div>
        <div onClick={() => onNavigate("companies")} className="cursor-pointer">
          <KPICard
            label="Companies"
            value={companies.length}
            icon={<IconBuilding className="h-5 w-5 text-violet-500" />}
          />
        </div>
        <div onClick={() => onNavigate("deals")} className="cursor-pointer">
          <KPICard
            label="Open Deals"
            value={openDeals.length}
            icon={<IconCurrencyDollar className="h-5 w-5 text-emerald-500" />}
          />
        </div>
        <div onClick={() => onNavigate("deals")} className="cursor-pointer">
          <KPICard
            label="Revenue Won"
            value={`$${totalRevenue.toLocaleString()}`}
            icon={<IconTrendingUp className="h-5 w-5 text-orange-500" />}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Pipeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <IconCurrencyDollar className="h-4 w-4" /> Recent Deals
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentDeals.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No deals yet</p>
            ) : (
              <div className="space-y-3">
                {recentDeals.map(deal => (
                  <div key={deal.id} className="flex items-center justify-between">
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium truncate">{deal.title}</span>
                      {deal.value != null && (
                        <span className="text-xs text-muted-foreground">${deal.value.toLocaleString()}</span>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STAGE_COLORS[deal.stage] ?? "bg-gray-100 text-gray-700"}`}>
                      {deal.stage}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activities */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <IconChecklist className="h-4 w-4" /> Pending Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">All caught up!</p>
            ) : (
              <div className="space-y-3">
                {pendingActivities.slice(0, 5).map(a => (
                  <div key={a.id} className="flex items-center justify-between">
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium truncate">{a.subject}</span>
                      {a.due_date && (
                        <span className="text-xs text-muted-foreground">{a.due_date}</span>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs">{a.type}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
