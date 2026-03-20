import { createInterface } from "readline";

const APP_ID = "crm";
const GMAIL = `/api/v1/apps/${APP_ID}/integrations/gmail/actions`;
const COL = `/api/v1/apps/${APP_ID}/collections/contact_emails`;

const write = (m: unknown) => process.stdout.write(JSON.stringify(m) + "\n");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let runtimeUrl = "";

createInterface({ input: process.stdin }).on("line", (line) => {
  let msg: any;
  try { msg = JSON.parse(line); } catch { return; }
  switch (msg.type) {
    case "discover":
      runtimeUrl = msg.runtime_url;
      write({ type: "discover", methods: ["sync_emails"] });
      break;
    case "rpc":   handleRpc(msg); break;
    case "job":   handleJob(msg); break;
    case "shutdown": process.exit(0);
  }
});

// ─── HTTP ────────────────────────────────────────────────────────────────────

const api = async (method: string, path: string, token: string, body?: unknown) => {
  const res = await fetch(`${runtimeUrl}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}`);
  return res.json();
};

// ─── IPC ─────────────────────────────────────────────────────────────────────

async function handleRpc(msg: any) {
  try {
    write({ type: "rpc_response", id: msg.id, result: await dispatch(msg.method, msg.params, msg.caller) });
  } catch (e: any) {
    write({ type: "rpc_response", id: msg.id, error: e.message });
  }
}

async function handleJob(msg: any) {
  try {
    write({ type: "job_result", id: msg.id, result: await fetchBodies(msg.payload, msg.caller) });
  } catch (e: any) {
    write({ type: "job_result", id: msg.id, error: e.message });
  }
}

async function dispatch(method: string, params: any, caller: any) {
  if (method === "sync_emails") return syncEmails(params, caller);
  throw new Error(`Unknown method: ${method}`);
}

// ─── sync_emails ─────────────────────────────────────────────────────────────

async function syncEmails({ contact_id, contact_email }: { contact_id: string; contact_email: string }, caller: any) {
  const token: string = caller?.authToken;
  if (!token) throw new Error("Not authenticated");

  // Fetch 50 latest stubs + existing IDs in parallel
  const [{ messages: stubs = [] }, existingRes] = await Promise.all([
    api("POST", `${GMAIL}/list_emails`, token, { query: `from:${contact_email} OR to:${contact_email}`, maxResults: 50 }),
    api("GET", `${COL}?contact_id=${contact_id}&limit=1000`, token),
  ]);

  const existingIds = new Set<string>((existingRes?.data ?? []).map((e: any) => e.gmail_id));
  const newStubs = stubs.filter((s: any) => !existingIds.has(s.id));

  if (!newStubs.length) return { synced: 0, emails: existingRes?.data ?? [] };

  // Fetch metadata sequentially (rate-limit)
  const emails: any[] = [];
  for (const { id } of newStubs) {
    try { emails.push(await api("POST", `${GMAIL}/get_email`, token, { messageId: id })); }
    catch (e: any) { write({ type: "log", level: "warn", message: `get_email ${id}: ${e.message}` }); }
    await sleep(200);
  }

  const inserted = await Promise.all(emails.map((e) =>
    api("POST", COL, token, {
      contact_id,
      gmail_id: e.id,
      subject: e.subject ?? "",
      from: e.from ?? "",
      to: e.to ?? "",
      date: e.date ?? new Date().toISOString(),
      snippet: e.snippet ?? "",
      body: "",
    })
  ));

  // Background job fills bodies
  const { job_id } = await api("POST", `/api/v1/apps/${APP_ID}/jobs`, token, {
    payload: { type: "fetch_bodies", emails: inserted.map((r: any) => ({ record_id: r.id, gmail_id: r.gmail_id })) },
  });

  const allRes = await api("GET", `${COL}?contact_id=${contact_id}&sort=date&order=desc&limit=100`, token);
  return { synced: inserted.length, job_id, emails: allRes?.data ?? [] };
}

// ─── job: fetch_bodies ────────────────────────────────────────────────────────

async function fetchBodies({ emails }: { emails: Array<{ record_id: string; gmail_id: string }> }, caller: any) {
  const token: string = caller?.authToken;
  if (!token) throw new Error("Not authenticated");

  let done = 0, failed = 0;
  for (const { record_id, gmail_id } of emails) {
    try {
      const { body = "" } = await api("POST", `${GMAIL}/get_email`, token, { messageId: gmail_id });
      await api("PATCH", `${COL}/${record_id}`, token, { body });
      done++;
    } catch (e: any) {
      write({ type: "log", level: "warn", message: `body ${gmail_id}: ${e.message}` });
      failed++;
    }
    await sleep(200);
  }
  return { done, failed };
}
