const APP_ID = "crm";
const GMAIL_ACTIONS = "/api/v1/integrations/gmail/actions";

let runtimeUrl = "";
let db: any = null;

serve({
  async onStart(ctx: any) {
    runtimeUrl = ctx.runtimeUrl;
    const postgres = (await import("postgres")).default;
    db = postgres(ctx.databaseUrl, { max: 3, idle_timeout: 30 });
  },
  rpc: {
    get_contact_emails: (p: any, caller: any) => getContactEmails(p, caller),
    get_thread: (p: any, caller: any) => getThread(p, caller),
    send_email: (p: any, caller: any) => sendEmail(p, caller),
    add_filtered_to_list: (p: any, caller: any) => addFilteredToList(p, caller),
  },
});

const api = async (method: string, path: string, token: string, body?: unknown) => {
  const res = await fetch(`${runtimeUrl}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 200)}`);
  }
  const result = await res.json();
  if (result?.ok === false && result?.error?.code) {
    const e: any = new Error(`[${result.error.code}] ${result.error.message ?? ""}`);
    e.code = result.error.code;
    e.retryAfter = result.error.retryAfter;
    throw e;
  }
  return result?.ok === true && "data" in result ? result.data : result;
};

async function getContactEmails(params: { contact_id: string; limit?: number; offset?: number }, caller: any) {
  const token: string = caller?.authToken;
  if (!token) throw new Error("Not authenticated");
  if (!db) throw new Error("No database");

  const { contact_id, limit = 50, offset = 0 } = params;

  const contact = await db`SELECT email FROM crm.contacts WHERE id = ${contact_id}`;
  if (!contact.length || !contact[0].email) return { emails: [], total: 0 };
  const contactEmail = contact[0].email.toLowerCase();

  const messages = await db`
    SELECT m.id, m.external_id, m.thread_external_id, m.header_message_id,
           m.subject, m.body_text, m.body_html, m.snippet, m.internal_date, m.label_ids
    FROM gmail.messages m
    JOIN gmail.participants p ON p.message_id = m.id
    WHERE lower(p.address) = ${contactEmail}
    GROUP BY m.id
    ORDER BY m.internal_date DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  if (!messages.length) return { emails: [], total: 0 };
  const msgIds = messages.map((m: any) => m.id);

  const [participants, attachments] = await Promise.all([
    db`SELECT * FROM gmail.participants WHERE message_id = ANY(${msgIds})`,
    db`SELECT * FROM gmail.attachments WHERE message_id = ANY(${msgIds})`,
  ]);

  const partsByMsg = new Map<string, any[]>();
  for (const p of participants) {
    const list = partsByMsg.get(p.message_id) ?? [];
    list.push(p);
    partsByMsg.set(p.message_id, list);
  }
  const attsByMsg = new Map<string, any[]>();
  for (const a of attachments) {
    const list = attsByMsg.get(a.message_id) ?? [];
    list.push(a);
    attsByMsg.set(a.message_id, list);
  }

  return {
    emails: messages.map((m: any) => ({
      ...m,
      received_at: m.internal_date,
      participants: partsByMsg.get(m.id) ?? [],
      attachments: attsByMsg.get(m.id) ?? [],
    })),
    total: messages.length,
  };
}

async function getThread(params: { thread_external_id: string }, caller: any) {
  const token: string = caller?.authToken;
  if (!token) throw new Error("Not authenticated");

  const messages = await db`
    SELECT m.*, json_agg(p.*) FILTER (WHERE p.id IS NOT NULL) as participants
    FROM gmail.messages m
    LEFT JOIN gmail.participants p ON p.message_id = m.id
    WHERE m.thread_external_id = ${params.thread_external_id}
    GROUP BY m.id
    ORDER BY m.internal_date ASC
  `;
  return { messages };
}

async function sendEmail(params: any, caller: any) {
  const token: string = caller?.authToken;
  if (!token) throw new Error("Not authenticated");

  const result = await api("POST", `${GMAIL_ACTIONS}/send_email`, token, {
    to: params.to,
    cc: params.cc,
    bcc: params.bcc,
    subject: params.subject,
    text: params.body_text ?? params.body,
    html: params.body_html,
    attachments: params.attachments,
    inReplyTo: params.in_reply_to,
    references: params.references,
    threadId: params.thread_id,
    from: params.from,
  });

  return result;
}

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
      where: { list_id: { $eq: list_id } }, limit: batchSize, offset: existingOffset,
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
      ...(where ? { where } : {}), limit: batchSize, offset,
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
