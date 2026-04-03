// Shared display constants — single source of truth
export const APP_ID = "crm";

export const STAGE_STYLES: Record<string, string> = {
  Lead:         "bg-slate-100 text-slate-700 border-slate-200",
  Qualified:    "bg-blue-100 text-blue-700 border-blue-200",
  Proposal:     "bg-purple-100 text-purple-700 border-purple-200",
  Negotiation:  "bg-yellow-100 text-yellow-700 border-yellow-200",
  "Closed Won": "bg-green-100 text-green-700 border-green-200",
  "Closed Lost":"bg-red-100 text-red-700 border-red-200",
};

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", CHF: "Fr", CAD: "C$", AUD: "A$", JPY: "¥",
};

export const STATUS_MAP: Record<string, string> = {
  Lead: "pending", Prospect: "active", Customer: "active", Churned: "error",
};

export const TYPE_STYLES: Record<string, string> = {
  Call: "bg-blue-100 text-blue-700", Email: "bg-violet-100 text-violet-700",
  Meeting: "bg-emerald-100 text-emerald-700", Task: "bg-orange-100 text-orange-700",
};

export const INDUSTRY_COLORS: Record<string, string> = {
  Technology:    "bg-blue-100 text-blue-700",
  Finance:       "bg-emerald-100 text-emerald-700",
  Healthcare:    "bg-red-100 text-red-700",
  Retail:        "bg-orange-100 text-orange-700",
  Manufacturing: "bg-gray-100 text-gray-700",
  "Real Estate": "bg-yellow-100 text-yellow-700",
  Education:     "bg-purple-100 text-purple-700",
  Other:         "bg-slate-100 text-slate-700",
};

export const PIPELINE_STAGES = ["Lead", "Qualified", "Proposal", "Negotiation"];

export const STAGE_DEFAULT_PROBABILITY: Record<string, number> = {
  Lead: 10, Qualified: 30, Proposal: 50, Negotiation: 70,
  "Closed Won": 100, "Closed Lost": 0,
};

export const CONTACT_STATUSES = ["Lead", "Prospect", "Customer", "Churned"] as const;

export const STAGE_OPTIONS    = ["Lead","Qualified","Proposal","Negotiation","Closed Won","Closed Lost"].map(s => ({ label: s, value: s }));
export const SOURCE_OPTIONS   = ["Inbound","Outbound","Referral","Partner","Event","Other"].map(s => ({ label: s, value: s }));
export const CURRENCY_OPTIONS = ["USD","EUR","GBP","CHF","CAD","AUD","JPY"].map(c => ({ label: c, value: c }));
export const INDUSTRIES       = Object.keys(INDUSTRY_COLORS);
