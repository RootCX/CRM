/**
 * SeedView — Demo data seeder
 *
 * Scenario: "Meridian CRM" — a B2B SaaS company selling a project management,
 * analytics & workflow automation platform to mid-market and enterprise companies
 * across North America and Europe.
 *
 * Sales team: 8 reps, $2.4M pipeline, 12 companies, 36 contacts, 20 deals,
 * 50+ notes, 65+ activities — all coherent and hyper-realistic.
 */

import { useState } from "react";
import { useAppCollection } from "@rootcx/sdk";
import {
  Button, Card, CardContent, CardHeader, CardTitle, CardDescription,
  Badge, Separator, toast, ConfirmDialog,
} from "@rootcx/ui";
import { IconDatabase, IconCheck, IconX, IconLoader2, IconPlayerPlay, IconBuildingSkyscraper, IconTrash } from "@tabler/icons-react";

const APP_ID = "crm";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SeedStep {
  id: string;
  label: string;
  status: "pending" | "running" | "done" | "error";
  count?: number;
  error?: string;
}

type DeleteStep = SeedStep;

// ─── Companies ────────────────────────────────────────────────────────────────

const COMPANIES_DATA = [
  {
    name: "Apex Capital Group",
    industry: "Finance",
    website: "https://apexcapitalgroup.com",
    phone: "+1 212-555-0100",
    address: "375 Park Avenue, 30th Floor, New York, NY 10152",
  },
  {
    name: "Vantage Health Systems",
    industry: "Healthcare",
    website: "https://vantagehealthsystems.com",
    phone: "+1 617-555-0182",
    address: "800 Boylston Street, Suite 1600, Boston, MA 02199",
  },
  {
    name: "Crestline Retail Group",
    industry: "Retail",
    website: "https://crestlineretail.com",
    phone: "+1 312-555-0247",
    address: "233 S. Wacker Drive, Suite 4400, Chicago, IL 60606",
  },
  {
    name: "Ironclad Manufacturing",
    industry: "Manufacturing",
    website: "https://ironcladmfg.com",
    phone: "+1 313-555-0193",
    address: "1 Ford Place, Dearborn, MI 48126",
  },
  {
    name: "Skyline Properties",
    industry: "Real Estate",
    website: "https://skylineproperties.com",
    phone: "+1 310-555-0161",
    address: "2000 Avenue of the Stars, Suite 500, Los Angeles, CA 90067",
  },
  {
    name: "Beacon Learning Institute",
    industry: "Education",
    website: "https://beaconlearning.edu",
    phone: "+1 202-555-0134",
    address: "1600 K Street NW, Suite 300, Washington, DC 20006",
  },
  {
    name: "Nexus Data Technologies",
    industry: "Technology",
    website: "https://nexusdatatech.io",
    phone: "+1 415-555-0178",
    address: "101 Mission Street, 12th Floor, San Francisco, CA 94105",
  },
  {
    name: "PrimeWave Biotech",
    industry: "Healthcare",
    website: "https://primewavebiotech.com",
    phone: "+1 858-555-0209",
    address: "3525 John Hopkins Court, San Diego, CA 92121",
  },
  {
    name: "CloudBridge Solutions",
    industry: "Technology",
    website: "https://cloudbridgesolutions.com",
    phone: "+1 206-555-0155",
    address: "920 Fifth Avenue, Suite 3300, Seattle, WA 98104",
  },
  {
    name: "Harborview Real Estate",
    industry: "Real Estate",
    website: "https://harborviewre.com",
    phone: "+1 305-555-0127",
    address: "701 Brickell Avenue, Suite 1550, Miami, FL 33131",
  },
  {
    name: "Titan Precision Parts",
    industry: "Manufacturing",
    website: "https://titanprecision.com",
    phone: "+1 216-555-0144",
    address: "6300 Oak Tree Blvd, Independence, OH 44131",
  },
  {
    name: "Summit EdTech",
    industry: "Education",
    website: "https://summitedtech.com",
    phone: "+1 512-555-0188",
    address: "500 W 2nd Street, Suite 1900, Austin, TX 78701",
  },
];

// ─── Contacts ─────────────────────────────────────────────────────────────────

const CONTACTS_BY_COMPANY: Array<Array<{
  first_name: string; last_name: string; email: string;
  phone: string; job_title: string; status: string;
}>> = [
  // 0 - Apex Capital Group
  [
    { first_name: "Margaret", last_name: "Holloway",  email: "m.holloway@apexcapitalgroup.com",  phone: "+1 212-555-0101", job_title: "CFO",                     status: "Customer"  },
    { first_name: "James",    last_name: "Whitfield",  email: "j.whitfield@apexcapitalgroup.com",  phone: "+1 212-555-0102", job_title: "CTO",                     status: "Customer"  },
    { first_name: "Diana",    last_name: "Reyes",      email: "d.reyes@apexcapitalgroup.com",       phone: "+1 212-555-0103", job_title: "VP of Operations",        status: "Customer"  },
  ],
  // 1 - Vantage Health Systems
  [
    { first_name: "Robert",   last_name: "Caldwell",   email: "r.caldwell@vantagehealthsystems.com", phone: "+1 617-555-0183", job_title: "CEO",                     status: "Customer"  },
    { first_name: "Susan",    last_name: "Park",        email: "s.park@vantagehealthsystems.com",     phone: "+1 617-555-0184", job_title: "Chief Digital Officer",   status: "Prospect"  },
    { first_name: "Kevin",    last_name: "Marsh",       email: "k.marsh@vantagehealthsystems.com",    phone: "+1 617-555-0185", job_title: "Director of IT",          status: "Lead"      },
  ],
  // 2 - Crestline Retail Group
  [
    { first_name: "Patricia", last_name: "Nguyen",     email: "p.nguyen@crestlineretail.com",       phone: "+1 312-555-0248", job_title: "SVP of Digital Commerce", status: "Customer"  },
    { first_name: "Brian",    last_name: "Foster",      email: "b.foster@crestlineretail.com",        phone: "+1 312-555-0249", job_title: "IT Director",             status: "Customer"  },
    { first_name: "Laura",    last_name: "Chen",        email: "l.chen@crestlineretail.com",          phone: "+1 312-555-0250", job_title: "E-commerce Manager",      status: "Prospect"  },
  ],
  // 3 - Ironclad Manufacturing
  [
    { first_name: "Thomas",   last_name: "Garrett",    email: "t.garrett@ironcladmfg.com",          phone: "+1 313-555-0194", job_title: "COO",                     status: "Prospect"  },
    { first_name: "Angela",   last_name: "Morris",     email: "a.morris@ironcladmfg.com",           phone: "+1 313-555-0195", job_title: "ERP Program Manager",     status: "Lead"      },
    { first_name: "Derek",    last_name: "Shaw",        email: "d.shaw@ironcladmfg.com",             phone: "+1 313-555-0196", job_title: "VP of Information Systems",status: "Prospect"  },
  ],
  // 4 - Skyline Properties
  [
    { first_name: "Catherine",last_name: "Voss",       email: "c.voss@skylineproperties.com",       phone: "+1 310-555-0162", job_title: "CEO",                     status: "Customer"  },
    { first_name: "Marcus",   last_name: "Jennings",   email: "m.jennings@skylineproperties.com",   phone: "+1 310-555-0163", job_title: "CTO",                     status: "Customer"  },
    { first_name: "Natalie",  last_name: "Quinn",      email: "n.quinn@skylineproperties.com",      phone: "+1 310-555-0164", job_title: "Head of Data Analytics",  status: "Lead"      },
  ],
  // 5 - Beacon Learning Institute
  [
    { first_name: "Gregory",  last_name: "Barnes",     email: "g.barnes@beaconlearning.edu",        phone: "+1 202-555-0135", job_title: "President",               status: "Lead"      },
    { first_name: "Michelle", last_name: "Torres",     email: "m.torres@beaconlearning.edu",        phone: "+1 202-555-0136", job_title: "VP of Learning Design",   status: "Lead"      },
    { first_name: "Andrew",   last_name: "Kim",        email: "a.kim@beaconlearning.edu",           phone: "+1 202-555-0137", job_title: "Director of Technology",  status: "Prospect"  },
  ],
  // 6 - Nexus Data Technologies
  [
    { first_name: "Stephanie",last_name: "Crawford",  email: "s.crawford@nexusdatatech.io",        phone: "+1 415-555-0179", job_title: "VP of Engineering",       status: "Customer"  },
    { first_name: "Daniel",   last_name: "Hoffman",   email: "d.hoffman@nexusdatatech.io",         phone: "+1 415-555-0180", job_title: "CTO",                     status: "Customer"  },
    { first_name: "Rachel",   last_name: "Simmons",   email: "r.simmons@nexusdatatech.io",         phone: "+1 415-555-0181", job_title: "Head of Product",         status: "Prospect"  },
  ],
  // 7 - PrimeWave Biotech
  [
    { first_name: "Edward",   last_name: "Lawson",    email: "e.lawson@primewavebiotech.com",      phone: "+1 858-555-0210", job_title: "VP of R&D",               status: "Lead"      },
    { first_name: "Jennifer", last_name: "Walsh",     email: "j.walsh@primewavebiotech.com",       phone: "+1 858-555-0211", job_title: "Director of Operations",  status: "Lead"      },
    { first_name: "Nathan",   last_name: "Brooks",    email: "n.brooks@primewavebiotech.com",      phone: "+1 858-555-0212", job_title: "CEO",                     status: "Prospect"  },
  ],
  // 8 - CloudBridge Solutions
  [
    { first_name: "Christopher",last_name:"Holt",     email: "c.holt@cloudbridgesolutions.com",    phone: "+1 206-555-0156", job_title: "CTO",                     status: "Customer"  },
    { first_name: "Amanda",   last_name: "Pierce",    email: "a.pierce@cloudbridgesolutions.com",  phone: "+1 206-555-0157", job_title: "Director of Cloud Arch.", status: "Customer"  },
    { first_name: "Scott",    last_name: "Vargas",    email: "s.vargas@cloudbridgesolutions.com",  phone: "+1 206-555-0158", job_title: "Senior Sales Engineer",   status: "Prospect"  },
  ],
  // 9 - Harborview Real Estate
  [
    { first_name: "Victoria", last_name: "Spencer",  email: "v.spencer@harborviewre.com",         phone: "+1 305-555-0128", job_title: "CEO",                     status: "Prospect"  },
    { first_name: "Michael",  last_name: "Dunn",     email: "m.dunn@harborviewre.com",            phone: "+1 305-555-0129", job_title: "Head of IT",              status: "Lead"      },
    { first_name: "Olivia",   last_name: "Grant",    email: "o.grant@harborviewre.com",           phone: "+1 305-555-0130", job_title: "Data Operations Manager", status: "Lead"      },
  ],
  // 10 - Titan Precision Parts
  [
    { first_name: "Ronald",   last_name: "Fletcher",  email: "r.fletcher@titanprecision.com",     phone: "+1 216-555-0145", job_title: "CIO",                     status: "Prospect"  },
    { first_name: "Sandra",   last_name: "Owens",    email: "s.owens@titanprecision.com",         phone: "+1 216-555-0146", job_title: "ERP Systems Manager",     status: "Lead"      },
    { first_name: "Tyler",    last_name: "McCoy",    email: "t.mccoy@titanprecision.com",         phone: "+1 216-555-0147", job_title: "Manufacturing IT Lead",   status: "Lead"      },
  ],
  // 11 - Summit EdTech
  [
    { first_name: "Christine",last_name: "Patel",    email: "c.patel@summitedtech.com",           phone: "+1 512-555-0189", job_title: "Chief Product Officer",   status: "Prospect"  },
    { first_name: "Brandon",  last_name: "Mills",    email: "b.mills@summitedtech.com",           phone: "+1 512-555-0190", job_title: "VP of Partnerships",      status: "Lead"      },
    { first_name: "Heather",  last_name: "Coleman",  email: "h.coleman@summitedtech.com",         phone: "+1 512-555-0191", job_title: "Director of Engineering", status: "Lead"      },
  ],
];

// ─── Deals blueprint ──────────────────────────────────────────────────────────

interface DealBlueprint {
  coIdx: number; ctIdx: number; title: string; value: number; stage: string; close_date: string;
}

const DEALS_BLUEPRINT: DealBlueprint[] = [
  // Apex Capital Group
  { coIdx: 0, ctIdx: 0, title: "Apex Capital — Enterprise License Renewal",         value: 96000,  stage: "Closed Won",  close_date: "2024-11-30" },
  { coIdx: 0, ctIdx: 1, title: "Apex Capital — Advanced Analytics Module",          value: 34500,  stage: "Proposal",    close_date: "2025-03-15" },
  // Vantage Health Systems
  { coIdx: 1, ctIdx: 0, title: "Vantage Health — Starter Platform Rollout",         value: 28000,  stage: "Closed Won",  close_date: "2024-10-15" },
  { coIdx: 1, ctIdx: 1, title: "Vantage Health — Upgrade to Professional Suite",    value: 52000,  stage: "Negotiation", close_date: "2025-02-28" },
  // Crestline Retail Group
  { coIdx: 2, ctIdx: 0, title: "Crestline Retail — Omnichannel Integration",        value: 67000,  stage: "Closed Won",  close_date: "2024-09-20" },
  { coIdx: 2, ctIdx: 2, title: "Crestline — Multi-Store Expansion (12 locations)",  value: 41000,  stage: "Qualified",   close_date: "2025-04-30" },
  // Ironclad Manufacturing
  { coIdx: 3, ctIdx: 0, title: "Ironclad Mfg — Pilot Program (75 users)",           value: 18000,  stage: "Proposal",    close_date: "2025-03-31" },
  { coIdx: 3, ctIdx: 2, title: "Ironclad — Full Enterprise Deployment (400 users)", value: 144000, stage: "Qualified",   close_date: "2025-07-31" },
  // Skyline Properties
  { coIdx: 4, ctIdx: 0, title: "Skyline Properties — Annual Platform License",      value: 44000,  stage: "Closed Won",  close_date: "2024-08-01" },
  { coIdx: 4, ctIdx: 2, title: "Skyline — BI & Portfolio Reporting Add-on",         value: 22000,  stage: "Lead",        close_date: "2025-05-15" },
  // Beacon Learning
  { coIdx: 5, ctIdx: 0, title: "Beacon Learning — Pilot (40 instructors)",          value: 11000,  stage: "Lead",        close_date: "2025-04-30" },
  { coIdx: 5, ctIdx: 2, title: "Beacon Learning — Institution-Wide Deployment",     value: 58000,  stage: "Qualified",   close_date: "2025-08-01" },
  // Nexus Data Technologies
  { coIdx: 6, ctIdx: 0, title: "Nexus Data — Data Lake Integration Platform",       value: 110000, stage: "Negotiation", close_date: "2025-02-28" },
  { coIdx: 6, ctIdx: 1, title: "Nexus Data — Premium Support SLA (Annual)",         value: 18000,  stage: "Proposal",    close_date: "2025-03-31" },
  // PrimeWave Biotech
  { coIdx: 7, ctIdx: 2, title: "PrimeWave Biotech — Discovery POC",                 value: 9500,   stage: "Lead",        close_date: "2025-05-30" },
  // CloudBridge Solutions
  { coIdx: 8, ctIdx: 0, title: "CloudBridge — OEM Partnership Agreement",           value: 180000, stage: "Closed Won",  close_date: "2024-07-01" },
  { coIdx: 8, ctIdx: 2, title: "CloudBridge — SaaS License Expansion",              value: 88000,  stage: "Negotiation", close_date: "2025-03-15" },
  // Harborview Real Estate
  { coIdx: 9, ctIdx: 0, title: "Harborview RE — Initial Discovery & Scoping",       value: 6500,   stage: "Lead",        close_date: "2025-06-15" },
  // Titan Precision Parts
  { coIdx: 10, ctIdx: 0, title: "Titan Precision — Feasibility Assessment",         value: 12000,  stage: "Proposal",    close_date: "2025-05-15" },
  // Summit EdTech
  { coIdx: 11, ctIdx: 0, title: "Summit EdTech — LMS Platform Demo & Trial",        value: 15000,  stage: "Lead",        close_date: "2025-06-01" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function SeedView() {
  const [steps, setSteps] = useState<SeedStep[]>([
    { id: "companies",  label: "12 companies",   status: "pending" },
    { id: "contacts",   label: "36 contacts",    status: "pending" },
    { id: "deals",      label: "20 deals",       status: "pending" },
    { id: "notes",      label: "50+ notes",      status: "pending" },
    { id: "activities", label: "65+ activities", status: "pending" },
  ]);
  const [running, setRunning]           = useState(false);
  const [done, setDone]                 = useState(false);

  const [deleteSteps, setDeleteSteps]   = useState<DeleteStep[]>([
    { id: "activities", label: "Activities", status: "pending" },
    { id: "notes",      label: "Notes",      status: "pending" },
    { id: "deals",      label: "Deals",      status: "pending" },
    { id: "contacts",   label: "Contacts",   status: "pending" },
    { id: "companies",  label: "Companies",  status: "pending" },
  ]);
  const [deleting, setDeleting]         = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteDone, setDeleteDone]     = useState(false);

  const { create: createCompany,   data: allCompanies  } = useAppCollection<{ id: string }>(APP_ID, "companies");
  const { create: createContact,   data: allContacts   } = useAppCollection<{ id: string }>(APP_ID, "contacts");
  const { create: createDeal,      data: allDeals      } = useAppCollection<{ id: string }>(APP_ID, "deals");
  const { create: createNote,      data: allNotes      } = useAppCollection<{ id: string }>(APP_ID, "notes");
  const { create: createActivity,  data: allActivities } = useAppCollection<{ id: string }>(APP_ID, "activities");

  // Need remove from separate hook calls
  const { remove: removeCompany }  = useAppCollection(APP_ID, "companies");
  const { remove: removeContact }  = useAppCollection(APP_ID, "contacts");
  const { remove: removeDeal }     = useAppCollection(APP_ID, "deals");
  const { remove: removeNote }     = useAppCollection(APP_ID, "notes");
  const { remove: removeActivity } = useAppCollection(APP_ID, "activities");

  const setStep = (id: string, patch: Partial<SeedStep>) =>
    setSteps(s => s.map(step => step.id === id ? { ...step, ...patch } : step));

  const setDelStep = (id: string, patch: Partial<DeleteStep>) =>
    setDeleteSteps(s => s.map(step => step.id === id ? { ...step, ...patch } : step));

  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

  async function runSeed() {
    setRunning(true);
    try {
      // ── 1. COMPANIES ─────────────────────────────────────────────────────────
      setStep("companies", { status: "running" });
      const companyIds: string[] = [];
      for (const co of COMPANIES_DATA) {
        const rec = await createCompany(co) as { id: string };
        companyIds.push(rec.id);
        await sleep(70);
      }
      setStep("companies", { status: "done", count: companyIds.length });

      // ── 2. CONTACTS ──────────────────────────────────────────────────────────
      setStep("contacts", { status: "running" });
      const contactIds: string[][] = [];
      for (let ci = 0; ci < CONTACTS_BY_COMPANY.length; ci++) {
        const group: string[] = [];
        for (const c of CONTACTS_BY_COMPANY[ci]) {
          const rec = await createContact({ ...c, company_id: companyIds[ci] }) as { id: string };
          group.push(rec.id);
          await sleep(70);
        }
        contactIds.push(group);
      }
      setStep("contacts", { status: "done", count: contactIds.flat().length });

      // ── 3. DEALS ─────────────────────────────────────────────────────────────
      setStep("deals", { status: "running" });
      const dealIds: string[] = [];
      for (const bp of DEALS_BLUEPRINT) {
        const rec = await createDeal({
          title:      bp.title,
          value:      bp.value,
          stage:      bp.stage,
          close_date: bp.close_date,
          company_id: companyIds[bp.coIdx],
          contact_id: contactIds[bp.coIdx][bp.ctIdx],
        }) as { id: string };
        dealIds.push(rec.id);
        await sleep(70);
      }
      setStep("deals", { status: "done", count: dealIds.length });

      // ── 4. NOTES ─────────────────────────────────────────────────────────────
      setStep("notes", { status: "running" });
      const notesData = buildNotes(companyIds, contactIds, dealIds);
      let noteCount = 0;
      for (const n of notesData) {
        await createNote(n);
        noteCount++;
        await sleep(50);
      }
      setStep("notes", { status: "done", count: noteCount });

      // ── 5. ACTIVITIES ─────────────────────────────────────────────────────────
      setStep("activities", { status: "running" });
      const activitiesData = buildActivities(contactIds, dealIds);
      let actCount = 0;
      for (const a of activitiesData) {
        await createActivity(a);
        actCount++;
        await sleep(50);
      }
      setStep("activities", { status: "done", count: actCount });

      toast.success("Seed complete! All demo records have been created successfully.");
      setDone(true);
    } catch (e: any) {
      toast.error("Seed failed: " + e.message);
    } finally {
      setRunning(false);
    }
  }

  async function runDelete() {
    setDeleting(true);
    setDeleteDone(false);
    // Reset delete steps
    setDeleteSteps(s => s.map(step => ({ ...step, status: "pending", count: undefined })));

    const entities: Array<{
      id: string;
      label: string;
      records: { id: string }[];
      remover: (id: string) => Promise<void>;
    }> = [
      { id: "activities", label: "Activities", records: allActivities, remover: removeActivity },
      { id: "notes",      label: "Notes",      records: allNotes,      remover: removeNote      },
      { id: "deals",      label: "Deals",      records: allDeals,      remover: removeDeal      },
      { id: "contacts",   label: "Contacts",   records: allContacts,   remover: removeContact   },
      { id: "companies",  label: "Companies",  records: allCompanies,  remover: removeCompany   },
    ];

    try {
      let totalDeleted = 0;
      for (const entity of entities) {
        setDelStep(entity.id, { status: "running" });
        let count = 0;
        for (const rec of entity.records) {
          await entity.remover(rec.id);
          count++;
          await sleep(40);
        }
        setDelStep(entity.id, { status: "done", count });
        totalDeleted += count;
      }
      // Reset seed UI so user can re-seed
      setSteps(s => s.map(step => ({ ...step, status: "pending", count: undefined })));
      setDone(false);
      setDeleteDone(true);
      toast.success(`All demo data deleted — ${totalDeleted} records removed.`);
    } catch (e: any) {
      toast.error("Delete failed: " + e.message);
    } finally {
      setDeleting(false);
    }
  }

  // ─── Notes builder ────────────────────────────────────────────────────────────

  function buildNotes(coIds: string[], ctIds: string[][], dlIds: string[]) {
    return [
      // ── Apex Capital Group ─────────────────────────────────────────────────
      {
        title: "Initial Discovery Call — Margaret Holloway",
        body: "Had a 60-minute discovery call with Margaret (CFO) and James Whitfield (CTO) from Apex Capital. Margaret opened the conversation by describing their current reporting infrastructure: a patchwork of Excel models maintained by a team of 4 analysts, feeding into a legacy BI tool that hasn't been updated in 3 years. She mentioned two failed attempts in the past 18 months to modernize — once with a vendor that ran out of funding and once with an internal build that was shelved due to resource constraints. The pain is acute: month-end close takes 12 business days and their board is pushing for real-time dashboards. James was technically engaged and asked detailed questions about our API architecture, specifically around rate limits and our webhook system for event-driven updates. Budget range confirmed: $80K–$120K annually. Timeline: must be live before their Q1 2025 board review. Strong deal — assigning to senior AE. Next step: technical deep-dive with James's team.",
        company_id: coIds[0], contact_id: ctIds[0][0], deal_id: dlIds[0], pinned: true,
      },
      {
        title: "Technical Demo — James Whitfield & Engineering Team",
        body: "Ran a 2.5-hour technical demo for James and 3 members of his infrastructure team. Covered: REST API with full OpenAPI spec, native Azure Active Directory SSO integration, field-level encryption for PII data (critical for their compliance team), and real-time dashboard refresh via WebSocket. The team was particularly impressed by our audit log module — they have SOC 2 Type II requirements and our immutable event stream maps perfectly. One concern raised: our current multi-tenancy model doesn't support their desired network isolation topology. Engineering is scoping a dedicated VPC option we can offer as an add-on. James said he'd send a formal RFP within 10 days. Diana Reyes (VP Ops) joined the last 30 minutes and immediately connected the workflow automation capabilities to her team's quarterly reporting process. She's now a strong internal champion alongside James.",
        company_id: coIds[0], contact_id: ctIds[0][1], deal_id: dlIds[0], pinned: false,
      },
      {
        title: "Contract Signed — $96K Enterprise License",
        body: "Deal closed. Margaret signed the $96,000 annual Enterprise license after a 2-week negotiation cycle. Key concessions made: extended payment terms (net-60 instead of standard net-30), inclusion of 10 admin seats at no extra cost (standard is 5), and a committed SLA of 99.9% uptime with financial penalties for breach. In return, Apex agreed to a 2-year lock-in with 8% uplift on renewal, and they granted us a case study and logo usage right. Onboarding kick-off scheduled for December 9th. Diana Reyes will be the primary implementation lead on their side. We've assigned a dedicated Customer Success Manager from our team. This is our largest financial services client to date — priority white-glove treatment.",
        company_id: coIds[0], contact_id: ctIds[0][2], deal_id: dlIds[0], pinned: true,
      },
      {
        title: "Upsell Opportunity — Advanced Analytics Module",
        body: "During our 30-day onboarding check-in call with Margaret, she mentioned that her data science team has been exploring our standard analytics dashboards and wants more. Specifically: custom KPI formulas, predictive trend overlays, and the ability to push alerts to Slack and Microsoft Teams based on threshold breaches. This maps exactly to our Advanced Analytics Module ($34,500 add-on). I demoed the module briefly during the call and Margaret's reaction was very positive — she said 'this is exactly what we've been building in-house for the last 6 months, and you've already done it.' Scheduled a formal proposal presentation for January 20th with Margaret and her Head of Data. Strong upsell potential — they already love the core product. The internal champion network is solid.",
        company_id: coIds[0], contact_id: ctIds[0][0], deal_id: dlIds[1], pinned: false,
      },

      // ── Vantage Health Systems ─────────────────────────────────────────────
      {
        title: "Inbound Lead via Conference — Robert Caldwell",
        body: "Robert Caldwell (CEO) reached out via LinkedIn after attending our booth at the HealthTech Summit in Boston. He had a 20-minute conversation with our CMO at the conference and was specifically asking about our HIPAA compliance posture and patient data handling capabilities. He confirmed that Vantage currently uses three separate systems for care coordination, staff scheduling, and analytics — and the lack of integration is causing significant operational overhead. Estimated 8 FTE hours per week wasted on manual data reconciliation. Robert wants to move quickly: Vantage is in the middle of a digital transformation initiative with a $2M technology budget approved for FY2025. This is a strategic deal — healthcare is a vertical we're actively targeting. Assigning to our healthtech-specialized AE. First formal discovery call set for September 10th.",
        company_id: coIds[1], contact_id: ctIds[1][0], deal_id: dlIds[2], pinned: true,
      },
      {
        title: "Closed — Starter Platform Rollout ($28K)",
        body: "Robert moved fast once he got internal buy-in. The Starter Platform deal closed in just 5 weeks from initial contact — one of our fastest enterprise cycles. Key to the speed: Robert had already secured budget pre-approval, and our HIPAA BAA (Business Associate Agreement) was ready to sign without modification, which eliminated the typical 3-4 week legal review cycle. The $28K Starter deal covers 50 users across their Boston headquarters. Onboarding completed in 3 weeks. Adoption metrics at 30 days: 87% DAU, NPS score of 9/10 from the initial user survey. Robert is now actively pushing for the Professional Suite upgrade to extend the platform to their 3 satellite clinics. Susan Park (CDO) has been looped in and is driving the upgrade discussion internally.",
        company_id: coIds[1], contact_id: ctIds[1][0], deal_id: dlIds[2], pinned: false,
      },
      {
        title: "Professional Suite Upgrade — Active Negotiation",
        body: "Susan Park (CDO) is now the primary deal driver for the $52K Professional Suite upgrade. She has been incredibly detailed in her requirements: she wants the workflow automation module to handle care pathway triggers (e.g., auto-assign follow-up tasks when a patient record is updated), the advanced reporting suite with HIPAA-compliant export options, and integration with their Epic EHR system via HL7 FHIR API. We've confirmed all three are available in the Professional Suite. The sticking point in negotiation is pricing: Susan is pushing for $42K, arguing that they should get credit for the $28K already invested. Our floor is $48K given the Epic integration involves dedicated engineering time. Kevin Marsh (IT Director) raised a concern about the FHIR integration timeline — he's worried about scope creep. We proposed a phased rollout: core platform Month 1-2, FHIR integration Month 3-4. That seemed to ease his concern. Decision expected by February 28th.",
        company_id: coIds[1], contact_id: ctIds[1][1], deal_id: dlIds[3], pinned: true,
      },
      {
        title: "Kevin Marsh — IT Concerns & Risk Mitigation",
        body: "Had a one-on-one call with Kevin Marsh to address his technical concerns outside of the main negotiation. His primary worry is integration risk with Epic. Vantage went through a painful Epic implementation 2 years ago that ran 8 months over schedule and $400K over budget. He's understandably gun-shy. I walked him through our standard Epic HL7 FHIR integration playbook — we have 7 existing live integrations with Epic environments and our average go-live time is 6 weeks. I offered to connect him with our implementation lead at Stanford Health (a reference customer) for a peer-to-peer call. Kevin appreciated the transparency and said he'd recommend moving forward once he gets the reference check done. He also asked for a detailed security questionnaire response — forwarded to our security team, 5-day turnaround promised.",
        company_id: coIds[1], contact_id: ctIds[1][2], deal_id: dlIds[3], pinned: false,
      },

      // ── Crestline Retail Group ─────────────────────────────────────────────
      {
        title: "Omnichannel Integration — Go-Live Success",
        body: "Crestline Retail's omnichannel integration project is live and performing exceptionally well. The deployment covered their 47-store network across the Midwest, integrating our platform with their Salesforce Commerce Cloud frontend, Manhattan Associates WMS, and custom-built loyalty program database. Patricia Nguyen (SVP Digital Commerce) sent a personal email to our CEO expressing satisfaction with the implementation quality — specifically calling out our Professional Services team's responsiveness. Key metrics 60 days post go-live: inventory sync latency reduced from 4 hours to 8 minutes, order processing accuracy improved from 94.2% to 99.6%, and store managers report saving approximately 2 hours per day on manual stock reconciliation. Crestline is now one of our strongest retail reference accounts. Patricia has agreed to participate in our annual customer summit as a keynote speaker.",
        company_id: coIds[2], contact_id: ctIds[2][0], deal_id: dlIds[4], pinned: true,
      },
      {
        title: "Multi-Store Expansion — 12 New Locations",
        body: "Brian Foster (IT Director) opened the conversation about expanding to their 12 recently acquired store locations in the Southeast. These stores came from a regional retail chain acquisition completed in Q3 2024 and are currently running on completely separate legacy infrastructure. Brian wants a phased migration plan: 4 stores in Phase 1 (Q2 2025), 4 in Phase 2 (Q3 2025), and the final 4 in Phase 3 (Q4 2025). The $41K proposal covers all 12 locations with volume licensing. Key requirements specific to these new stores: POS system integration with NCR Counterpoint (different from the existing Manhattan Associates stack), and a Spanish-language UI option for store staff in Florida and Texas. Our product team confirmed both are achievable within the standard timeline. Brian is also asking about a centralized admin console to manage all 47 + 12 locations from a single dashboard — we'll need to demo our multi-tenant admin features.",
        company_id: coIds[2], contact_id: ctIds[2][1], deal_id: dlIds[5], pinned: false,
      },
      {
        title: "Laura Chen — Power User & Internal Champion",
        body: "Laura Chen (E-commerce Manager) has become one of our most engaged users across the entire customer base. She logs into the platform daily, has completed all available training certifications, and has submitted 7 feature requests through our product portal — 3 of which are already on the roadmap for Q2 2025. She reached out proactively to ask about beta access to the new AI-assisted demand forecasting feature currently in private preview. I've added her to the beta program. Laura mentioned she's been advocating for the platform in internal meetings and even created a deck to present ROI metrics to her CMO. This kind of organic internal champion is extremely valuable — she's helping drive the multi-store expansion conversation at the leadership level. Sending her a thank-you gift and inviting her to our product advisory council.",
        company_id: coIds[2], contact_id: ctIds[2][2], pinned: false,
      },

      // ── Ironclad Manufacturing ─────────────────────────────────────────────
      {
        title: "In-Person Site Visit — Dearborn Plant",
        body: "Flew to Dearborn for a half-day site visit with Thomas Garrett (COO) and Angela Morris (ERP Program Manager). The visit was eye-opening — Ironclad operates 6 production lines running 24/7 with a workforce of 2,400. Their current toolset is a fragmented mix of SAP R/3 (10+ years old), multiple homegrown Access databases, and Excel-based shift reports emailed manually each morning. Thomas's biggest frustration: by the time leadership gets the daily production report, the data is already 14 hours old. He showed me a moment last quarter where a machine calibration issue went undetected for 8 hours because the monitoring system alert went to an email inbox that nobody checked on weekends. That cost them $220K in scrap material. Our real-time operations dashboard, with mobile push notifications and configurable escalation paths, is a direct solution to this specific problem. Angela is technically competent and understood the integration complexity immediately — she asked about our SAP Business Technology Platform (BTP) connector, which we do have. The pilot proposal for 75 users is the right entry point to build trust.",
        company_id: coIds[3], contact_id: ctIds[3][0], deal_id: dlIds[6], pinned: true,
      },
      {
        title: "Pilot Proposal Submitted — 75 Users, 6 Months",
        body: "Submitted the formal pilot proposal to Angela Morris. Scope: 75 user licenses covering the production floor supervisors and line managers at their Dearborn plant, a 6-month pilot with option to extend, SAP R/3 read-only integration via RFC connector, 2 days of on-site training, and a dedicated implementation engineer for the first 8 weeks. Price: $18,000 for the pilot period, fully applicable as credit toward the full enterprise contract. The proposal includes a clear success criteria framework that Angela requested: (1) daily production report delivery by 6am instead of 8pm, (2) incident detection time under 15 minutes, (3) user adoption above 70% by week 8. Angela responded positively and said she'd present to the executive team the following Tuesday. The main risk: Derek Shaw (VP IS) has been vocal about preferring to build internally. We need to address the build-vs-buy argument proactively.",
        company_id: coIds[3], contact_id: ctIds[3][1], deal_id: dlIds[6], pinned: false,
      },
      {
        title: "Derek Shaw — IT Strategy & 400-User Enterprise Vision",
        body: "Had a direct, candid conversation with Derek Shaw. He confirmed that his team of 12 developers explored building a real-time operations dashboard internally last year — they got 60% of the way through before the project was deprioritized due to staffing cuts. He's not against buying, but he needs to justify to the board why purchasing is better than resuming the internal build. I walked through a TCO analysis: resuming their internal build would require ~4,000 engineering hours ($640K at their loaded cost), a 14-month timeline to feature parity, and ongoing maintenance of 0.5 FTE per year. Our full enterprise deal at $144K/year includes all updates, support, and our 200+ person engineering team continuously improving the product. Derek found the TCO argument compelling but wants to see it in writing. Preparing a formal build-vs-buy analysis document. He also shared that Ironclad's 5-year IT roadmap includes decommissioning SAP R/3 in favor of SAP S/4HANA — our S/4HANA connector (currently in beta) is a major differentiator here.",
        company_id: coIds[3], contact_id: ctIds[3][2], deal_id: dlIds[7], pinned: true,
      },

      // ── Skyline Properties ─────────────────────────────────────────────────
      {
        title: "Skyline Properties — Premier Reference Account",
        body: "Catherine Voss (CEO) is our anchor client in the real estate vertical and has been incredibly generous with her time in supporting our go-to-market efforts. She participated as a speaker at our annual user conference, was featured in a Harvard Business Review case study on PropTech digital transformation, and has referred three companies to us over the past 12 months (two have since converted to paying customers). Skyline's usage metrics continue to grow: their team of 85 users averages 6.2 sessions per user per day, portfolio reporting that used to take 3 weeks now completes in 4 hours, and they've automated 14 previously manual workflows. The relationship is in excellent health. Annual renewal (NRR 118%) was processed in July without any negotiation — Catherine simply signed the renewal order form on the same day it was sent.",
        company_id: coIds[4], contact_id: ctIds[4][0], deal_id: dlIds[8], pinned: true,
      },
      {
        title: "Marcus Jennings — API Power User & Ambassador",
        body: "Marcus Jennings (CTO) has built 4 custom internal integrations on top of our API: a Slack bot that posts daily portfolio performance summaries, a Power Automate flow that triggers lease renewal reminders 90 days before expiry, a custom mobile app for their field agents that pulls listing data in real time, and a webhook-driven workflow that auto-generates investor reports from deal close events. He published a detailed technical blog post about building on our API — it went viral in the PropTech developer community and drove 34 inbound leads for us in a single week. Marcus is exactly the kind of customer who validates our platform approach. I've invited him to our Developer Advisory Board and offered early access to our new GraphQL API (currently in alpha). He's also the internal champion for the BI & Portfolio Reporting Add-on that Natalie Quinn is evaluating.",
        company_id: coIds[4], contact_id: ctIds[4][1], deal_id: dlIds[8], pinned: false,
      },
      {
        title: "Natalie Quinn — BI Add-on Evaluation",
        body: "Natalie Quinn (Head of Data Analytics) has been manually exporting data to Power BI using CSV files — a process she describes as 'embarrassingly manual' for a company their size. She heard about our native Power BI connector from Marcus and immediately requested a technical demo. The demo went very well: she was particularly excited about the live DirectQuery connection mode (no scheduled refreshes needed), the pre-built real estate KPI library (cap rate, NOI, vacancy rate, IRR), and the automated investor report templates. Her one hesitation: she wants to validate that the connector handles their data volume (3M+ records in the portfolio database) without performance degradation. I'm scheduling a proof-of-concept test with her team using a sanitized copy of their data. Expected close: Q2 2025.",
        company_id: coIds[4], contact_id: ctIds[4][2], deal_id: dlIds[9], pinned: false,
      },

      // ── Beacon Learning Institute ──────────────────────────────────────────
      {
        title: "Inbound from LinkedIn Ad — Gregory Barnes",
        body: "Gregory Barnes (President) filled out our contact form after seeing a LinkedIn sponsored post targeted to EdTech decision makers. His initial message was brief but high-signal: 'We run a 300-person learning institute across 4 campuses and our LMS is a disaster. Looking for something modern.' Discovery call was scheduled for the following week. During the 45-minute call, Gregory was candid about their current situation: they're running Moodle 3.1 (end-of-life since 2021) self-hosted on aging on-prem servers. Three failed attempts to migrate to cloud LMS vendors, each stalled by data migration complexity. Their primary pain: instructors spend more time fighting the LMS than teaching, and learner completion rates have dropped from 72% to 58% over the past 2 years. Gregory confirmed a budget of $40K–$70K is available pending board approval. He wants to see a pilot succeed before committing to full deployment — exactly the approach we'd recommend.",
        company_id: coIds[5], contact_id: ctIds[5][0], deal_id: dlIds[10], pinned: true,
      },
      {
        title: "Michelle Torres — Learning Design Requirements Deep Dive",
        body: "Conducted a 2-hour requirements workshop with Michelle Torres (VP Learning Design) and her curriculum team. Michelle has very specific pedagogical requirements that go beyond typical LMS functionality: adaptive learning paths that adjust based on learner performance data, collaborative annotation tools for document-based learning, competency mapping linked to national education standards, and a detailed learner analytics dashboard that tracks not just completion but engagement depth (scroll depth, video replay rate, re-attempt patterns). Our platform covers approximately 80% of these requirements natively. The 20% gap: competency mapping against national standards requires a configuration project our Professional Services team would need to scope. Michelle was not deterred — she said 'every vendor has gaps, what matters is whether the roadmap is aligned.' I shared our 2025 product roadmap, which includes native competency framework support in Q3. She flagged FERPA compliance as non-negotiable — confirmed we are FERPA-certified.",
        company_id: coIds[5], contact_id: ctIds[5][1], deal_id: dlIds[10], pinned: false,
      },
      {
        title: "Full Institutional Deployment — Path to $58K",
        body: "If the pilot succeeds, Gregory has given a strong verbal commitment to deploy across all 4 Beacon campuses and their 300-person faculty. The full institutional deal at $58K would cover 300 instructor licenses, unlimited learner seats (critical for their enrollment-based model), white-label branding for the learner portal, and the data migration project from Moodle. Andrew Kim (Director of Technology) has been looped in to lead the technical evaluation and is currently reviewing our security documentation and data residency policies. He confirmed Beacon requires data to be hosted in US-East regions only — confirmed available. The main risk to the full deployment: Gregory's board is conservative and will require a 6-month pilot report with measurable KPI improvements before approving the full budget. We need to ensure the pilot is set up for success with clear, achievable metrics. Proposed KPIs: learner completion rate above 70% (from current 58%), instructor NPS above 8/10, and 90% on-time course delivery.",
        company_id: coIds[5], contact_id: ctIds[5][2], deal_id: dlIds[11], pinned: true,
      },

      // ── Nexus Data Technologies ────────────────────────────────────────────
      {
        title: "Strategic Technology Partnership — Snowflake Data Lake",
        body: "This is our most technically complex and strategically significant deal of the quarter. Stephanie Crawford (VP Engineering) is driving an initiative to unify Nexus Data's entire data infrastructure — currently fragmented across 14 different data sources — into a single Snowflake Data Cloud environment. She wants our platform to serve as the operational layer on top of that data fabric: ingesting events from all business systems, running transformation pipelines, and serving real-time dashboards to 200+ internal analysts and their B2B customers. The integration scope is substantial: bidirectional Snowflake connector (read/write), streaming ingestion via Kafka, custom embedding of our analytics module within their white-labeled product, and API access for 3 separate environments (production, staging, development). Our architecture team spent 3 days with their team designing the solution. The $110K price tag reflects the implementation complexity, not just licensing. This deal, if won, will be our most referenced enterprise case study for the data-tech vertical.",
        company_id: coIds[6], contact_id: ctIds[6][0], deal_id: dlIds[12], pinned: true,
      },
      {
        title: "Daniel Hoffman — Technical Negotiation on Environments",
        body: "Daniel Hoffman (CTO) is a tough but fair negotiator. He came back on the contract with 3 redlines: (1) he wants all 3 environments (prod, staging, dev) included at no extra cost — we countered with prod + staging included, dev at $8K/year; (2) he wants a 30-day mutual termination clause without cause — our standard is 90 days, we offered 60 days as a compromise; (3) he's asking for source code escrow for our core data pipeline components — this is unusual and needs legal review. On item 1, we reached agreement at prod + staging included + dev at $5K/year (token price to maintain the principle). On item 2, accepted 60 days. On item 3, we proposed an alternative: a detailed technical architecture document and the ability to export all data in open formats with no export fees. Daniel said he'd accept the alternative pending legal review. Overall, we're close. Target: contract signed by February 28th.",
        company_id: coIds[6], contact_id: ctIds[6][1], deal_id: dlIds[12], pinned: false,
      },
      {
        title: "Premium Support SLA — Rachel Simmons",
        body: "Rachel Simmons (Head of Product) manages a customer-facing product that embeds our analytics module for Nexus Data's end customers. She's experiencing pressure from her own customers who are asking for faster response times when analytics dashboards have issues. Their current SLA (standard 8-hour business hours response) isn't meeting the needs of enterprise customers on Pacific, Eastern, and European time zones. The Premium Support SLA ($18K/year) offers: 4-hour response, 24/7 coverage, dedicated support Slack channel, monthly support review meetings, and a named support engineer who knows their environment. Rachel confirmed this is a 'when, not if' purchase — she has the budget authority for up to $25K without board approval. The question is timing: she wants to see the Snowflake integration deal finalized first before stacking another commitment. Expect this to close in the same timeframe as the main deal.",
        company_id: coIds[6], contact_id: ctIds[6][2], deal_id: dlIds[13], pinned: false,
      },

      // ── CloudBridge Solutions ──────────────────────────────────────────────
      {
        title: "OEM Partnership Closed — $180K Landmark Deal",
        body: "The CloudBridge OEM partnership is our largest deal in company history. Christopher Holt (CTO) approached us 8 months ago with a vision: embed our analytics engine directly into CloudBridge's cloud management platform, which serves 4,200 enterprise customers. The business case was compelling: CloudBridge's customers were churning at 18%/year partly because the platform lacked native analytics — they were forcing customers to export CSVs into third-party BI tools. Our embedded analytics module would eliminate that pain point and differentiate CloudBridge in a crowded market. The $180K contract covers: OEM licensing for up to 5,000 end-customer seats, a white-label SDK with full UI customization capability, co-development of 3 CloudBridge-specific dashboard templates, joint go-to-market agreement, and quarterly business reviews. Revenue share model: CloudBridge pays us a per-seat fee beyond the 5,000-seat base. At their current growth rate, we project this partnership will generate $300K+ in Year 2 ARR.",
        company_id: coIds[8], contact_id: ctIds[8][0], deal_id: dlIds[15], pinned: true,
      },
      {
        title: "Amanda Pierce — SaaS License Expansion ($88K)",
        body: "Amanda Pierce (Director of Cloud Architecture) is leading the expansion initiative. CloudBridge has grown faster than expected: they crossed 7,200 customer seats last quarter — 44% above the OEM contract base of 5,000 seats. This creates a $88K expansion opportunity: upgrading the OEM license to a 12,000-seat tier with revised per-seat pricing for overage protection. Amanda also wants to add two new capabilities: (1) multi-cloud analytics that spans AWS, Azure, and GCP environments within a single dashboard (CloudBridge is cloud-agnostic, and this is their #1 feature request from enterprise customers), and (2) a self-service analytics builder that lets end-customers create custom reports without engineering involvement. Both are on our roadmap: multi-cloud in Q2 2025, self-service builder in Q4 2025. Amanda is negotiating hard on the timeline — she wants multi-cloud in Q1 2025. We need to align with our CPO on whether we can accelerate.",
        company_id: coIds[8], contact_id: ctIds[8][1], deal_id: dlIds[16], pinned: true,
      },
      {
        title: "Scott Vargas — Commercial Relationship & QBR Coordination",
        body: "Scott Vargas (Senior Sales Engineer) is our day-to-day commercial contact at CloudBridge. He coordinates the quarterly business reviews, manages the internal stakeholder alignment before each renewal, and serves as the first escalation point for any commercial issues. Scott is well-liked within CloudBridge and has excellent relationships with both the product and finance teams. He flagged an important item: CloudBridge's finance team is asking for a multi-year pricing commitment from us by end of Q1 2025 — they want to lock in rates for a 3-year deal to get CFO approval on the expansion. Scott's advice: come with a 3-year proposal that shows modest annual increases (3–4%) rather than market-rate increases — their CFO will be much more receptive. Preparing a 3-year pricing model. Scott also mentioned that CloudBridge will likely exceed 15,000 seats by end of 2025 — the upside potential here is significant.",
        company_id: coIds[8], contact_id: ctIds[8][2], pinned: false,
      },

      // ── PrimeWave Biotech ──────────────────────────────────────────────────
      {
        title: "Initial Outreach — Edward Lawson via LinkedIn",
        body: "Edward Lawson (VP R&D) connected with our VP of Sales on LinkedIn after seeing a post about our scientific research project tracking capabilities. Initial conversation was brief but high-potential: PrimeWave manages 23 active drug discovery programs across sites in San Diego, Cambridge (MA), and Basel (Switzerland). Their current program tracking is done in a combination of Smartsheet, SharePoint, and — seriously — a shared Google Sheets file that 40 people edit simultaneously. Edward described a specific incident where two research teams unknowingly duplicated a 3-month synthesis work stream because they couldn't see each other's program status in real time. That kind of waste in pharma R&D is worth millions. He's interested in a focused POC before any broad commitment. Nathan Brooks (CEO) is the budget holder — Edward will loop him in once the POC design is agreed.",
        company_id: coIds[7], contact_id: ctIds[7][0], deal_id: dlIds[14], pinned: true,
      },
      {
        title: "Jennifer Walsh — Operations Buy-In",
        body: "Jennifer Walsh (Director of Operations) is a key stakeholder because any platform deployment at PrimeWave will touch her team's lab resource scheduling and equipment utilization workflows. She was initially skeptical — PrimeWave went through a painful failed implementation with a workflow tool 18 months ago that cost $180K and was abandoned. She asked pointed questions: What's our implementation failure rate? How do we handle rollback if the deployment goes badly? What's the typical time to first value for a company like PrimeWave? I was direct: our implementation CSAT is 4.7/5, we have a formal rollback plan for every deployment, and our median time to first production dashboard is 11 business days. I offered to share 3 references from biotech companies of comparable size and complexity. Jennifer said references are critical to her recommendation to the board. Sending reference contacts today. The board meeting where this will be discussed is scheduled for May 20th.",
        company_id: coIds[7], contact_id: ctIds[7][1], deal_id: dlIds[14], pinned: false,
      },

      // ── Harborview Real Estate ─────────────────────────────────────────────
      {
        title: "Discovery Call — Victoria Spencer",
        body: "Victoria Spencer (CEO) came inbound through our referral partner network — she was referred by Catherine Voss at Skyline Properties, who is a close personal contact. This is the value of our reference program paying off. Victoria runs a boutique luxury real estate firm in Miami with a $4.2B portfolio under management. Her team of 22 handles acquisitions, asset management, and investor relations — all currently managed through a mix of Yardi Voyager (for accounting), custom Excel models (for investment analysis), and email chains (for investor reporting). She describes the investor reporting process as 'a nightmare that takes my team 2 weeks every quarter and still has errors.' Victoria is open to exploring but wants to see a live demo tailored to luxury real estate use cases, including multi-currency portfolio views and investor portal access. Michael Dunn (IT) and Olivia Grant (Data Ops) will join the next call for the technical evaluation.",
        company_id: coIds[9], contact_id: ctIds[9][0], deal_id: dlIds[17], pinned: true,
      },

      // ── Titan Precision Parts ──────────────────────────────────────────────
      {
        title: "Feasibility Assessment — Ronald Fletcher",
        body: "Ronald Fletcher (CIO) contacted us after a competitor lost the deal due to poor manufacturing-specific functionality. Titan Precision manufactures aerospace-grade components — they operate under AS9100D quality management standards and their process documentation and traceability requirements are stringent. Ronald's challenge: they have 4 disconnected systems (quality management, production tracking, inventory, and maintenance scheduling) that don't talk to each other. Audits are a painful manual exercise — pulling evidence for a single AS9100 audit takes 3 people 5 days. The ideal outcome: a unified platform that consolidates these workflows with full traceability from raw material receipt to finished part shipment. This is a complex, high-stakes requirements. The feasibility assessment ($12K) is designed to produce a detailed gap analysis and implementation roadmap before Titan commits to a full deployment. Sandra Owens (ERP Manager) and Tyler McCoy (IT Lead) will be co-evaluators.",
        company_id: coIds[10], contact_id: ctIds[10][0], deal_id: dlIds[18], pinned: false,
      },

      // ── Summit EdTech ──────────────────────────────────────────────────────
      {
        title: "Summit EdTech — Partnership & LMS Evaluation",
        body: "Christine Patel (CPO) reached out after hearing Brandon Mills (VP Partnerships) mention our platform at a VC portfolio company dinner. Summit EdTech is an interesting prospect: they're a 4-year-old startup that builds white-label online learning platforms for corporate training departments. They currently build on top of an aging open-source LMS stack and are looking to replace their backend with a more scalable, API-first platform they can build on top of. This is both an opportunity and a risk — the deal could be a $15K pilot leading to a $200K+ platform licensing deal if they adopt us as their infrastructure. The risk: they're price-sensitive as a growth-stage startup. Heather Coleman (Engineering Director) will evaluate our API capabilities. Key differentiators to emphasize: our composable API-first architecture, white-label SDK, and developer ecosystem. Sending sandbox credentials and documentation this week.",
        company_id: coIds[11], contact_id: ctIds[11][0], deal_id: dlIds[19], pinned: true,
      },
    ];
  }

  // ─── Activities builder ───────────────────────────────────────────────────────

  function buildActivities(ctIds: string[][], dlIds: string[]) {
    return [
      // ── Apex Capital Group ─────────────────────────────────────────────────
      { type: "Call",    subject: "Discovery call — Margaret Holloway & James Whitfield",      body: "60-min discovery. Confirmed $80K–$120K budget, Q4 deadline for board readiness, and key pain: 12-day manual close cycle. James confirmed Azure environment. Strong opportunity — escalating to enterprise AE.", contact_id: ctIds[0][0], deal_id: dlIds[0], due_date: "2024-09-05", done: true },
      { type: "Meeting", subject: "Technical deep-dive — James Whitfield & infrastructure team", body: "2.5-hour technical demo. Covered API, AAD SSO, field-level encryption, and audit logs for SOC 2. Team very engaged. VPC isolation concern raised — engineering scoping dedicated option. RFP expected in 10 days.", contact_id: ctIds[0][1], deal_id: dlIds[0], due_date: "2024-09-18", done: true },
      { type: "Email",   subject: "RFP response + security documentation package",              body: "Sent complete RFP response (42 pages), SOC 2 Type II report, GDPR addendum, and VPC isolation pricing. Cc'd Diana Reyes as requested. James confirmed receipt and is presenting internally on Thursday.", contact_id: ctIds[0][1], deal_id: dlIds[0], due_date: "2024-09-28", done: true },
      { type: "Call",    subject: "Contract negotiation call — final terms",                    body: "Finalized extended payment terms (net-60), 10 admin seats included, 99.9% SLA with penalties, and 2-year lock-in at 8% annual uplift. Case study and logo rights granted in return. Ready to send for e-signature.", contact_id: ctIds[0][0], deal_id: dlIds[0], due_date: "2024-10-25", done: true },
      { type: "Task",    subject: "Onboarding kick-off prep — assign CSM, configure tenant",   body: "Assign dedicated CSM. Pre-configure Apex Capital tenant with Azure SSO parameters. Schedule 2-day onboarding workshop. Prepare data migration template for their legacy reporting system.", contact_id: ctIds[0][2], deal_id: dlIds[0], due_date: "2024-11-25", done: true },
      { type: "Meeting", subject: "30-day check-in + Advanced Analytics Module demo",          body: "Monthly check-in with Margaret. Platform adoption at 91%. She casually mentioned her data science team wants custom KPI formulas and Slack alerting — mapped directly to Advanced Analytics Module. Mini-demo done, formal proposal presentation set for Jan 20.", contact_id: ctIds[0][0], deal_id: dlIds[1], due_date: "2024-12-18", done: true },
      { type: "Meeting", subject: "Advanced Analytics Module formal proposal presentation",     body: "1.5-hour session with Margaret + Head of Data. Demoed custom KPI builder, predictive overlays, and Slack/Teams alerting. Margaret: 'we've been building this in-house for 6 months.' Strong buying signals. Awaiting VP sign-off.", contact_id: ctIds[0][0], deal_id: dlIds[1], due_date: "2025-01-20", done: true },
      { type: "Task",    subject: "Prepare ROI deck — Analytics Module, Apex-specific metrics", body: "Build a tailored ROI deck: quantify time saved on monthly reporting (est. 120 analyst hours/month), reduction in data errors caught post-close, and forecasting accuracy improvement. Use their own data where possible. Due before Feb 10 follow-up call.", contact_id: ctIds[0][0], deal_id: dlIds[1], due_date: "2025-02-10", done: false },

      // ── Vantage Health Systems ─────────────────────────────────────────────
      { type: "Call",    subject: "Inbound discovery — Robert Caldwell post-HealthTech Summit", body: "45-min call. Robert confirmed $2M tech budget, 3 disconnected systems, and 8 FTE hours/week on manual data reconciliation. HIPAA BAA required. Very fast mover — scheduling technical demo for next week.", contact_id: ctIds[1][0], deal_id: dlIds[2], due_date: "2024-09-10", done: true },
      { type: "Email",   subject: "HIPAA BAA + compliance documentation sent",                 body: "Sent our standard HIPAA BAA (pre-approved by outside counsel), SOC 2 report, and HITRUST CSF questionnaire response. Robert forwarded to their legal team. Expecting 1-week turnaround given pre-approved BAA language.", contact_id: ctIds[1][0], deal_id: dlIds[2], due_date: "2024-09-12", done: true },
      { type: "Meeting", subject: "Closing call — Starter rollout agreed",                     body: "30-min call to close. Robert got board approval. Legal approved BAA without changes (first time that's happened in 18 months). E-signature sent. $28K Starter, 50 users, onboarding starts Oct 28.", contact_id: ctIds[1][0], deal_id: dlIds[2], due_date: "2024-10-14", done: true },
      { type: "Call",    subject: "60-day adoption review — Susan Park joins",                  body: "Monthly review with Robert and Susan Park (CDO). 87% DAU, NPS 9/10. Susan is now driving the Pro upgrade internally. She wants workflow automation for care pathway triggers and Epic FHIR integration. Scheduling a detailed requirements session.", contact_id: ctIds[1][1], deal_id: dlIds[3], due_date: "2024-12-10", done: true },
      { type: "Meeting", subject: "Professional Suite requirements workshop — Susan & Kevin",   body: "3-hour workshop. Mapped care pathway automation workflows, Epic HL7 FHIR integration requirements, and HIPAA-compliant export specifications. Kevin Marsh raised Epic integration risk — offered Stanford Health peer reference. Kevin accepted. Security questionnaire sent.", contact_id: ctIds[1][2], deal_id: dlIds[3], due_date: "2025-01-15", done: true },
      { type: "Call",    subject: "Kevin Marsh — reference call with Stanford Health",          body: "Three-way call: Kevin, our implementation lead at Stanford, and our AE. Stanford confirmed 6-week Epic go-live timeline. Kevin visibly reassured. Said he'd recommend moving forward pending security questionnaire review.", contact_id: ctIds[1][2], deal_id: dlIds[3], due_date: "2025-01-28", done: true },
      { type: "Task",    subject: "Finalize security questionnaire response — Vantage",         body: "Security team to complete Vantage's 180-question security questionnaire. Deadline: 5 business days. Flag questions 47 (network segmentation) and 112 (backup encryption) for senior security architect review.", contact_id: ctIds[1][1], deal_id: dlIds[3], due_date: "2025-02-05", done: false },

      // ── Crestline Retail ───────────────────────────────────────────────────
      { type: "Meeting", subject: "Integration kick-off — Patricia, Brian & technical teams",  body: "Full day kick-off workshop. Defined integration scope: Salesforce CC, Manhattan WMS, loyalty DB. Assigned 3 engineers from both sides. 6-week timeline with weekly checkpoints. Patricia set tone: 'this has to work before holiday season.'", contact_id: ctIds[2][0], deal_id: dlIds[4], due_date: "2024-08-05", done: true },
      { type: "Task",    subject: "Go-live validation — 47 stores, all integration points",    body: "All integrations tested and validated in staging. Load test confirmed 8-minute sync latency (target was <10 min). Patricia signed go-live approval. Order accuracy tracking enabled across all 47 stores.", contact_id: ctIds[2][0], deal_id: dlIds[4], due_date: "2024-09-15", done: true },
      { type: "Call",    subject: "60-day results review + multi-store expansion discussion",   body: "Brian shared the metrics: inventory sync at 8 min, order accuracy 99.6%, 2 hrs/day saved per store manager. Patricia mentioned the 12 acquired Southeast locations. Brian offered to scope the expansion — set up a proposal meeting.", contact_id: ctIds[2][1], deal_id: dlIds[5], due_date: "2024-11-20", done: true },
      { type: "Email",   subject: "Multi-store expansion proposal — 12 locations, $41K",       body: "Sent proposal covering 12-location phased rollout (4+4+4), NCR Counterpoint POS integration, Spanish-language UI option, and centralized admin console. Brian confirmed the 3-phase approach works with their IT capacity. Awaiting budget approval from VP Finance.", contact_id: ctIds[2][1], deal_id: dlIds[5], due_date: "2025-01-12", done: true },
      { type: "Task",    subject: "Invite Laura Chen to beta program — AI demand forecasting",  body: "Laura submitted 7 feature requests, 3 already on roadmap. Add to beta for AI demand forecasting preview. Send personal invitation from CPO. Also nominate for Product Advisory Council — she'd be an excellent voice for retail use cases.", contact_id: ctIds[2][2], due_date: "2025-02-01", done: false },

      // ── Ironclad Manufacturing ─────────────────────────────────────────────
      { type: "Meeting", subject: "Site visit — Dearborn plant, Thomas Garrett & Angela Morris","body": "Half-day on-site. 6 production lines, 2,400 workers, 14-hour data lag on operations reports. Saw real impact: $220K scrap loss from a missed machine alert. Real-time dashboard with mobile push notifications is the exact solution. Strong deal.", contact_id: ctIds[3][0], deal_id: dlIds[6], due_date: "2025-01-08", done: true },
      { type: "Email",   subject: "Pilot proposal — 75 users, SAP R/3 integration, $18K",      body: "Sent formal pilot proposal with success criteria framework: daily reports by 6am, incident detection <15 min, 70% adoption by week 8. Angela responded positively and is presenting to exec team Tuesday. Main risk: Derek Shaw's build-vs-buy position.", contact_id: ctIds[3][1], deal_id: dlIds[6], due_date: "2025-01-20", done: true },
      { type: "Call",    subject: "Call with Derek Shaw — build vs. buy TCO discussion",        body: "Direct conversation. Derek's team got 60% through an internal build before it was shelved. Walked through TCO: 4,000 eng hours = $640K + 14 months vs. $18K pilot today. S/4HANA migration roadmap is a key differentiator. Derek wants TCO analysis in writing.", contact_id: ctIds[3][2], deal_id: dlIds[7], due_date: "2025-01-30", done: true },
      { type: "Task",    subject: "Prepare build-vs-buy TCO analysis + S/4HANA connector brief", body: "Document: internal build cost model, $640K vs. $18K pilot. S/4HANA connector capabilities (beta), timeline to GA in Q3 2025. Engage Solutions Engineering for technical validation. Due to Derek by Feb 14.", contact_id: ctIds[3][2], deal_id: dlIds[7], due_date: "2025-02-14", done: false },

      // ── Skyline Properties ─────────────────────────────────────────────────
      { type: "Meeting", subject: "Annual QBR — Catherine Voss + Marcus Jennings",             body: "Strong QBR. 85 users, 6.2 sessions/day, portfolio reporting from 3 weeks to 4 hours, 14 automated workflows. Catherine signed renewal same day sent (8% uplift, $44K Year 2). Discussed BI add-on for Natalie Quinn's team.", contact_id: ctIds[4][0], deal_id: dlIds[8], due_date: "2025-01-08", done: true },
      { type: "Email",   subject: "Marcus blog post thank-you + Developer Advisory Board invite", body: "Marcus's API blog post drove 34 inbound leads. Sent personal thank-you from our CEO. Invited to Developer Advisory Board with $5K annual honorarium. Early access to GraphQL API alpha included. Marcus accepted immediately.", contact_id: ctIds[4][1], deal_id: dlIds[8], due_date: "2025-01-22", done: true },
      { type: "Meeting", subject: "BI & Portfolio Reporting Add-on demo — Natalie Quinn",       body: "Technical demo: DirectQuery Power BI connector, real estate KPI library (cap rate, NOI, IRR), investor report templates. Natalie loved the live connection mode. Concern: performance at 3M+ records. Scheduling POC test with their data. Expected close Q2 2025.", contact_id: ctIds[4][2], deal_id: dlIds[9], due_date: "2025-02-12", done: false },

      // ── Beacon Learning Institute ──────────────────────────────────────────
      { type: "Call",    subject: "Qualification — Gregory Barnes, inbound from LinkedIn ad",   body: "45-min discovery. Running Moodle 3.1 EOL on aging on-prem. Learner completion dropped 72%→58%. 3 failed LMS migrations. Budget $40K–$70K pending board approval. Pilot-first approach aligned. Scheduling requirements workshop with Michelle Torres.", contact_id: ctIds[5][0], deal_id: dlIds[10], due_date: "2025-01-14", done: true },
      { type: "Meeting", subject: "Learning design requirements workshop — Michelle Torres",    body: "2-hour deep dive. Adaptive learning paths, collaborative annotation, competency mapping, FERPA compliance confirmed. 80% native coverage, 20% gap in competency standards (roadmap Q3 2025). Michelle not deterred. FERPA certification shared.", contact_id: ctIds[5][1], deal_id: dlIds[10], due_date: "2025-01-25", done: true },
      { type: "Email",   subject: "FERPA compliance pack + data residency confirmation",        body: "Sent FERPA certification, data residency confirmation (US-East only), student data handling policy, and DPA template. Andrew Kim confirmed receipt and is reviewing against their security baseline. Expected clearance in 1 week.", contact_id: ctIds[5][2], deal_id: dlIds[11], due_date: "2025-01-30", done: true },
      { type: "Meeting", subject: "Full institutional deployment planning workshop",            body: "3-hour planning session with Gregory, Michelle, and Andrew. Defined pilot KPIs: completion rate >70%, instructor NPS >8, 90% on-time delivery. Andrew confirmed US-East data residency requirement met. Pilot start date: March 1. Full deployment decision: September 1.", contact_id: ctIds[5][2], deal_id: dlIds[11], due_date: "2025-02-18", done: false },

      // ── Nexus Data Technologies ────────────────────────────────────────────
      { type: "Meeting", subject: "Architecture session — Snowflake integration design",        body: "3 days on-site with Stephanie, Daniel, and our architecture team. Designed bidirectional Snowflake connector, Kafka streaming ingestion, and embedded analytics for their white-label product. Architecture document finalized. $110K scope confirmed.", contact_id: ctIds[6][0], deal_id: dlIds[12], due_date: "2025-01-13", done: true },
      { type: "Call",    subject: "Contract redlines — Daniel Hoffman, 3 items",                body: "Negotiated 3 contract redlines: (1) 3 envs→prod+staging+dev at $5K; (2) termination 60 days mutual; (3) source code escrow→open format data export alternative accepted. Legal review needed for item 3. Close target: Feb 28.", contact_id: ctIds[6][1], deal_id: dlIds[12], due_date: "2025-02-05", done: true },
      { type: "Email",   subject: "Premium Support SLA proposal — Rachel Simmons",              body: "Sent Premium SLA proposal: 4-hour response, 24/7 coverage, dedicated Slack channel, named support engineer, monthly reviews. $18K/year. Rachel confirmed budget authority up to $25K. Wants to wait for main Snowflake deal to close first.", contact_id: ctIds[6][2], deal_id: dlIds[13], due_date: "2025-02-10", done: true },
      { type: "Task",    subject: "Legal review — source code escrow alternative clause",       body: "Send revised contract with open-format data export clause to our legal team. Get sign-off within 5 business days. Also have legal review the intellectual property clause on co-developed connectors — Nexus wants joint ownership, we offer perpetual license.", contact_id: ctIds[6][0], deal_id: dlIds[12], due_date: "2025-02-18", done: false },

      // ── CloudBridge Solutions ──────────────────────────────────────────────
      { type: "Meeting", subject: "OEM partnership kick-off — Christopher Holt & product team", body: "Full-day kick-off with Christopher and their product and legal teams. Defined SDK customization scope, co-development of 3 dashboard templates (multi-cloud cost overview, performance benchmarking, security posture). Timeline: SDK delivery in 8 weeks.", contact_id: ctIds[8][0], deal_id: dlIds[15], due_date: "2024-05-20", done: true },
      { type: "Task",    subject: "OEM SDK v1 delivery and integration acceptance",             body: "SDK v1 delivered with full documentation, sandbox environment, and 2-day integration workshop. Christopher confirmed successful embedding in CloudBridge platform. Soft launch to 500 beta customers scheduled for September. $180K contract invoice sent.", contact_id: ctIds[8][0], deal_id: dlIds[15], due_date: "2024-06-28", done: true },
      { type: "Meeting", subject: "Q4 partnership QBR — growth metrics & expansion discussion", body: "QBR with Christopher and Amanda. 7,200 end-customer seats (44% above 5K base), partnership driving 23% reduction in CloudBridge churn. Amanda opened expansion conversation: upgrade to 12K-seat tier + multi-cloud analytics + self-service builder.", contact_id: ctIds[8][1], deal_id: dlIds[16], due_date: "2025-01-10", done: true },
      { type: "Call",    subject: "SaaS License Expansion negotiation — $88K + 3-year terms",   body: "2-hour negotiation. Amanda wants multi-cloud in Q1 (we said Q2). Scott advised 3-year pricing commitment for CFO approval. Preparing 3-year model: $88K Yr1, $91K Yr2, $94K Yr3. Scott expects CFO approval if annual increase stays under 4%.", contact_id: ctIds[8][2], deal_id: dlIds[16], due_date: "2025-02-06", done: true },
      { type: "Task",    subject: "Prepare 3-year pricing model + contract amendment — CloudBridge", body: "Build 3-year pricing deck: $88K/$91K/$94K with volume escalation terms. Consult CPO on multi-cloud Q1 vs Q2 feasibility. Get VP Sales approval on the 3-year discount structure before sending. Amanda needs this by Feb 25.", contact_id: ctIds[8][2], deal_id: dlIds[16], due_date: "2025-02-20", done: false },

      // ── PrimeWave Biotech ──────────────────────────────────────────────────
      { type: "Call",    subject: "Discovery — Edward Lawson, VP R&D",                         body: "30-min intro call. 23 active drug discovery programs, San Diego + Cambridge + Basel. Tracking in Smartsheet + SharePoint + shared Google Sheet. Duplicate work stream incident cost ~$2M in R&D time. POC is the right entry. Nathan Brooks (CEO) to be looped in post-POC design.", contact_id: ctIds[7][0], deal_id: dlIds[14], due_date: "2025-01-22", done: true },
      { type: "Email",   subject: "POC proposal — $9,500, 60 days, 3 reference contacts sent",  body: "Sent POC proposal covering 60-day pilot, 3 biotech reference contacts (Moderna, Recursion Pharma, BioAtla), and implementation plan. Jennifer Walsh (Ops Director) needs to approve the implementation approach. Board meeting May 20 is the key milestone.", contact_id: ctIds[7][1], deal_id: dlIds[14], due_date: "2025-02-03", done: true },
      { type: "Task",    subject: "Follow up with Jennifer Walsh post board meeting — May 21",   body: "Call Jennifer on May 21 morning to get board decision. If approved, schedule POC kick-off for May 26. If budget was cut, explore a reduced $5K POC option covering only San Diego site. Prepare both scenarios.", contact_id: ctIds[7][1], deal_id: dlIds[14], due_date: "2025-05-21", done: false },

      // ── Harborview Real Estate ─────────────────────────────────────────────
      { type: "Call",    subject: "Discovery — Victoria Spencer, Catherine Voss referral",      body: "Victoria confirmed referral from Catherine Voss. $4.2B portfolio, 22-person team, Yardi Voyager + Excel + email. Investor reporting takes 2 weeks each quarter with errors. Wants demo tailored to luxury real estate: multi-currency views, investor portal. Michael Dunn and Olivia Grant to join next call.", contact_id: ctIds[9][0], deal_id: dlIds[17], due_date: "2025-02-06", done: true },
      { type: "Task",    subject: "Prepare luxury real estate demo environment — Harborview",   body: "Configure demo tenant with: multi-currency portfolio dashboard (USD, EUR, GBP), investor portal with read-only access, Yardi Voyager integration mock, and 2-week-vs-4-hour quarterly report comparison. Send Skyline Properties case study as reference.", contact_id: ctIds[9][1], deal_id: dlIds[17], due_date: "2025-02-18", done: false },

      // ── Titan Precision Parts ──────────────────────────────────────────────
      { type: "Email",   subject: "Inbound inquiry — Ronald Fletcher, post-competitor loss",    body: "Ronald's outreach noted their previous vendor couldn't handle AS9100D traceability requirements. Replied with our aerospace manufacturing capabilities overview, including quality management workflows and part traceability from raw material to shipment.", contact_id: ctIds[10][0], deal_id: dlIds[18], due_date: "2025-02-10", done: true },
      { type: "Meeting", subject: "Feasibility assessment scoping — Ronald, Sandra, Tyler",     body: "2-hour scoping call. AS9100D traceability, 4 disconnected systems, 5-day manual audit prep. Proposed $12K feasibility assessment to produce gap analysis and implementation roadmap. Sandra Owens will co-lead the assessment with Tyler McCoy on integration design.", contact_id: ctIds[10][1], deal_id: dlIds[18], due_date: "2025-02-28", done: true },
      { type: "Task",    subject: "Prepare manufacturing demo — AS9100D traceability focus",    body: "Configure demo with aerospace manufacturing templates: part traceability workflow, NCR (non-conformance report) management, AS9100D audit evidence collection. Emphasize the audit preparation time reduction from 5 days to 4 hours. Schedule for March 12.", contact_id: ctIds[10][2], deal_id: dlIds[18], due_date: "2025-03-12", done: false },

      // ── Summit EdTech ──────────────────────────────────────────────────────
      { type: "Call",    subject: "Discovery — Christine Patel, API-first LMS evaluation",      body: "Christine described Summit as building white-label corporate LMS on aging open-source stack. Looking for API-first platform to rebuild on. Deal could be $15K pilot → $200K+ platform licensing. Heather Coleman (Eng Director) to evaluate our API. Sending sandbox + docs.", contact_id: ctIds[11][0], deal_id: dlIds[19], due_date: "2025-02-05", done: true },
      { type: "Email",   subject: "Developer sandbox access + API documentation — Summit EdTech", body: "Sent developer sandbox credentials, full API documentation (OpenAPI 3.1), white-label SDK guide, and 3 EdTech case studies. Heather Coleman already logged in within 4 hours of sending — very engaged. Scheduled API walkthrough call for Feb 20.", contact_id: ctIds[11][2], deal_id: dlIds[19], due_date: "2025-02-10", done: true },
      { type: "Meeting", subject: "API capabilities walkthrough — Heather Coleman & dev team",  body: "90-min technical session with Heather and 2 senior engineers. Covered composable API architecture, white-label SDK customization depth, webhooks and event streaming, multi-tenant data isolation, and rate limits at scale. Dev team highly impressed — one engineer said 'this is what we wish we had built.' Brandon Mills (VP Partnerships) also joined to explore co-marketing potential. Strong technical buy-in.", contact_id: ctIds[11][2], deal_id: dlIds[19], due_date: "2025-02-20", done: false },
    ];
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  const total       = steps.reduce((sum, s) => sum + (s.count ?? 0), 0);
  const totalExisting = allActivities.length + allNotes.length + allDeals.length + allContacts.length + allCompanies.length;
  const hasData     = totalExisting > 0;

  return (
    <div className="flex flex-col items-center justify-center min-h-full p-8">
      <div className="w-full max-w-xl space-y-6">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="p-3 rounded-full bg-primary/10">
              <IconDatabase className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold">Seed Demo Data</h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Populates a complete, coherent B2B SaaS sales scenario —
            <strong> 12 enterprise accounts</strong>, 36 contacts, 20 deals across a
            $700K+ pipeline, with rich notes and activity history for a full sales team.
          </p>
        </div>

        {/* Seed card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <IconBuildingSkyscraper className="h-4 w-4 text-muted-foreground" />
              What will be created
            </CardTitle>
            <CardDescription>
              All records are linked and tell a coherent, industry-authentic story
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {steps.map((step) => (
                <div key={step.id} className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                    {step.status === "pending" && <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />}
                    {step.status === "running" && <IconLoader2 className="h-4 w-4 text-primary animate-spin" />}
                    {step.status === "done"    && <IconCheck className="h-4 w-4 text-green-500" />}
                    {step.status === "error"   && <IconX className="h-4 w-4 text-destructive" />}
                  </div>
                  <span className="flex-1 text-sm">{step.label}</span>
                  {step.status === "done" && step.count !== undefined && (
                    <Badge variant="secondary" className="text-xs">{step.count} created</Badge>
                  )}
                  {step.status === "running" && (
                    <Badge variant="outline" className="text-xs text-primary border-primary">Running…</Badge>
                  )}
                  {step.status === "error" && (
                    <Badge variant="destructive" className="text-xs">{step.error}</Badge>
                  )}
                </div>
              ))}
            </div>

            {done && (
              <>
                <Separator className="my-4" />
                <div className="text-center">
                  <Badge className="bg-green-500 text-white text-sm px-4 py-1">
                    ✓ {total} records created successfully
                  </Badge>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Seed button */}
        {!done && (
          <Button className="w-full" size="lg" onClick={runSeed} disabled={running || deleting}>
            {running ? (
              <>
                <IconLoader2 className="h-5 w-5 mr-2 animate-spin" />
                Creating records…
              </>
            ) : (
              <>
                <IconPlayerPlay className="h-5 w-5 mr-2" />
                Run seed
              </>
            )}
          </Button>
        )}

        {done && (
          <p className="text-center text-sm text-muted-foreground">
            You can now close this panel and explore the CRM with fully populated demo data.
          </p>
        )}

        {/* Divider */}
        {hasData && <Separator />}

        {/* Delete card */}
        {hasData && (
          <Card className="border-destructive/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-destructive">
                <IconTrash className="h-4 w-4" />
                Delete all demo data
              </CardTitle>
              <CardDescription>
                Permanently removes all {totalExisting.toLocaleString()} records from the database.
                This cannot be undone.
              </CardDescription>
            </CardHeader>
            {deleting && (
              <CardContent>
                <div className="space-y-3">
                  {deleteSteps.map((step) => (
                    <div key={step.id} className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                        {step.status === "pending" && <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />}
                        {step.status === "running" && <IconLoader2 className="h-4 w-4 text-destructive animate-spin" />}
                        {step.status === "done"    && <IconCheck className="h-4 w-4 text-green-500" />}
                        {step.status === "error"   && <IconX className="h-4 w-4 text-destructive" />}
                      </div>
                      <span className="flex-1 text-sm">{step.label}</span>
                      {step.status === "done" && step.count !== undefined && (
                        <Badge variant="secondary" className="text-xs">{step.count} deleted</Badge>
                      )}
                      {step.status === "running" && (
                        <Badge variant="outline" className="text-xs text-destructive border-destructive">Deleting…</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
            {!deleting && (
              <CardContent className="pt-0">
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => setDeleteConfirmOpen(true)}
                  disabled={running}
                >
                  <IconTrash className="h-4 w-4 mr-2" />
                  Delete all data
                </Button>
              </CardContent>
            )}
          </Card>
        )}

        {deleteDone && !hasData && (
          <p className="text-center text-sm text-muted-foreground">
            All data has been deleted. You can run the seed again.
          </p>
        )}
      </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete all demo data?"
        description={`This will permanently delete all ${totalExisting.toLocaleString()} records — companies, contacts, deals, notes, and activities. This action cannot be undone.`}
        confirmLabel="Yes, delete everything"
        onConfirm={runDelete}
        destructive
      />
    </div>
  );
}
