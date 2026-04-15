const APP_ID = "crm";
const GMAIL = "/api/v1/integrations/gmail/actions";
const COL = `/api/v1/apps/${APP_ID}/collections/contact_emails`;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let runtimeUrl = "";

serve({
  onStart(ctx: any) {
    runtimeUrl = ctx.runtimeUrl;
  },
  rpc: {
    sync_emails: (params: any, caller: any) => syncEmails(params, caller),
    add_filtered_to_list: (params: any, caller: any) => addFilteredToList(params, caller),
  },
  onJob: fetchBodies,
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

// ─── sync_emails ─────────────────────────────────────────────────────────────

async function syncEmails({ contact_id, contact_email }: { contact_id: string; contact_email: string }, caller: any) {
  const token: string = caller?.authToken;
  if (!token) throw new Error("Not authenticated");

  const [{ messages: stubs = [] }, existingRes] = await Promise.all([
    api("POST", `${GMAIL}/list_emails`, token, { query: `from:${contact_email} OR to:${contact_email}`, maxResults: 50 }),
    api("GET", `${COL}?contact_id=${contact_id}&limit=1000`, token),
  ]);

  const existingIds = new Set<string>((existingRes?.data ?? []).map((e: any) => e.gmail_id));
  const newStubs = stubs.filter((s: any) => !existingIds.has(s.id));

  if (!newStubs.length) return { synced: 0, emails: existingRes?.data ?? [] };

  const emails: any[] = [];
  for (const { id } of newStubs) {
    try { emails.push(await api("POST", `${GMAIL}/get_email`, token, { messageId: id })); }
    catch (e: any) { log.warn(`get_email ${id}: ${e.message}`); }
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

  const { job_id } = await api("POST", `/api/v1/apps/${APP_ID}/jobs`, token, {
    payload: { type: "fetch_bodies", emails: inserted.map((r: any) => ({ record_id: r.id, gmail_id: r.gmail_id })) },
  });

  const allRes = await api("GET", `${COL}?contact_id=${contact_id}&sort=date&order=desc&limit=100`, token);
  return { synced: inserted.length, job_id, emails: allRes?.data ?? [] };
}

// ─── add_filtered_to_list ────────────────────────────────────────────────────

const ENTITY_LINK_FIELD: Record<string, string> = {
  contacts: "contact_id", companies: "company_id", deals: "deal_id",
};

async function addFilteredToList(
  { list_id, entity_type, where }: { list_id: string; entity_type: string; where?: any },
  caller: any,
) {
  const token: string = caller?.authToken;
  if (!token) throw new Error("Not authenticated");

  const linkField = ENTITY_LINK_FIELD[entity_type];
  if (!linkField) throw new Error(`Invalid entity_type: ${entity_type}`);

  const batchSize = 500;
  const existingIds = new Set<string>();
  let existingOffset = 0;
  while (true) {
    const batch = await api("POST", `/api/v1/apps/${APP_ID}/collections/list_records/query`, token, {
      where: { list_id: { $eq: list_id } },
      limit: batchSize,
      offset: existingOffset,
    });
    const rows: any[] = batch?.data ?? [];
    rows.forEach((r: any) => { const v = r[linkField]; if (v) existingIds.add(v); });
    if (rows.length < batchSize) break;
    existingOffset += batchSize;
  }

  let offset = 0;
  let added = 0;

  while (true) {
    const batch = await api("POST", `/api/v1/apps/${APP_ID}/collections/${entity_type}/query`, token, {
      ...(where ? { where } : {}),
      limit: batchSize,
      offset,
    });

    const records: any[] = batch?.data ?? [];
    if (records.length === 0) break;

    const newRecords = records.filter((r: any) => !existingIds.has(r.id));
    if (newRecords.length > 0) {
      await api("POST", `/api/v1/apps/${APP_ID}/collections/list_records/bulk`, token,
        newRecords.map((r: any) => ({ list_id, [linkField]: r.id })),
      );
      added += newRecords.length;
      newRecords.forEach((r: any) => existingIds.add(r.id));
    }

    if (records.length < batchSize) break;
    offset += batchSize;
  }

  return { added };
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
      log.warn(`body ${gmail_id}: ${e.message}`);
      failed++;
    }
    await sleep(200);
  }
  return { done, failed };
}
