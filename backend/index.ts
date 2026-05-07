const APP_ID = "crm";
const PROVIDERS: Record<string, string> = {
  gmail: "/api/v1/integrations/gmail/actions",
  outlook: "/api/v1/integrations/outlook/actions",
  "imap_smtp": "/api/v1/integrations/imap_smtp/actions",
};
const COL_SYNC = `/api/v1/apps/${APP_ID}/collections/sync_state`;
const GMAIL_EXCLUDE = "-in:spam -in:trash -in:drafts -category:promotions -category:social";
const BATCH_SIZE = 50;
const MAX_BATCHES_PER_JOB = 6;
const JOB_TIMEOUT_MS = 4 * 60 * 1000;

let runtimeUrl = "";
let db: any = null;

serve({
  async onStart(ctx: any) {
    runtimeUrl = ctx.runtimeUrl;
    const postgres = (await import("postgres")).default;
    db = postgres(ctx.databaseUrl, { max: 3, idle_timeout: 30 });
    ensureIndexes().catch((e) => log.error(`indexes: ${e.message}`));
  },
  rpc: {
    trigger_sync: (_p: any, caller: any) => dispatchSync(caller),
    get_contact_emails: (p: any, caller: any) => getContactEmails(p, caller),
    send_email: (p: any, caller: any) => sendEmail(p, caller),
    add_filtered_to_list: (p: any, caller: any) => addFilteredToList(p, caller),
    flush_email_data: (_p: any, _caller: any) => flushEmailData(),
  },
  onJob: handleJob,
});

// ─── HTTP helper ────────────────────────────────────────────────────────────

const api = async (method: string, path: string, token: string, body?: unknown) => {
  const res = await fetch(`${runtimeUrl}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}`);
  return res.json();
};

// ─── Boot: create UNIQUE indexes if missing ─────────────────────────────────

async function ensureIndexes() {
  if (!db) return;
  await db`DROP INDEX IF EXISTS crm.idx_emails_header_msg_id`;
  await db`CREATE UNIQUE INDEX IF NOT EXISTS idx_emails_header_msg_id ON crm.emails (header_message_id)`;
  await db`CREATE UNIQUE INDEX IF NOT EXISTS idx_assoc_uniq ON crm.email_channel_associations (user_id, provider, external_id)`;
  await db`CREATE UNIQUE INDEX IF NOT EXISTS idx_part_uniq ON crm.email_participants (email_id, address, role)`;
  await db`CREATE INDEX IF NOT EXISTS idx_queue_user_provider ON crm.email_import_queue (user_id, provider, created_at)`;
}

// ─── Flush all email data ───────────────────────────────────────────────────

async function flushEmailData() {
  if (!db) throw new Error("database not available");
  const [[{ count: emails }], [{ count: queue }], [{ count: sync }]] = await Promise.all([
    db`SELECT COUNT(*)::int AS count FROM crm.emails`,
    db`SELECT COUNT(*)::int AS count FROM crm.email_import_queue`,
    db`SELECT COUNT(*)::int AS count FROM crm.sync_state`,
  ]);
  await db`TRUNCATE crm.emails, crm.email_channel_associations, crm.email_participants, crm.email_import_queue, crm.sync_state`;
  return { deleted: { emails, queue, sync_state: sync } };
}

// ─── Job dispatcher ─────────────────────────────────────────────────────────

async function handleJob(payload: any, caller: any) {
  const type = payload?.type;
  if (type === "sync_emails" || !type) return dispatchSync(caller);
  if (type === "sync_account") return syncAccount(payload, caller);
  return { skipped: true, reason: `unknown: ${type}` };
}

// ─── Dispatch: enqueue 1 job per enabled account ────────────────────────────

async function dispatchSync(caller: any) {
  const token: string = caller?.authToken;
  if (!token) throw new Error("Not authenticated");

  const res = await api("POST", `${COL_SYNC}/query`, token, { where: { enabled: { $eq: true } }, limit: 100 });
  const accounts: any[] = res?.data ?? [];
  if (!accounts.length) return { dispatched: 0 };

  let dispatched = 0;
  for (const account of accounts) {
    if (account.status === "syncing") continue;
    await api("PATCH", `${COL_SYNC}/${account.id}`, token, { status: "syncing" });
    await api("POST", `/api/v1/apps/${APP_ID}/jobs`, token, {
      payload: { type: "sync_account", account_id: account.id, user_id: account.user_id, provider: account.provider },
    });
    dispatched++;
  }
  return { dispatched };
}

// ─── Sync one account (pgmq job) ───────────────────────────────────────────

async function syncAccount(payload: any, caller: any) {
  const token: string = caller?.authToken;
  if (!token) throw new Error("Not authenticated");
  const { account_id, user_id, provider } = payload;

  try {
    const syncState = await api("POST", `${COL_SYNC}/query`, token, {
      where: { id: { $eq: account_id } }, limit: 1,
    });
    const account = syncState?.data?.[0];
    if (!account) return { error: "account not found" };

    const start = Date.now();
    let totalImported = 0;
    let totalQueued = 0;

    const hasQueue = await hasQueueItems(user_id, provider);
    if (!hasQueue && account.sync_stage !== "messages_import") {
      const queued = await listFetch(account, token);
      totalQueued = queued;
    }

    let batchCount = 0;
    while (Date.now() - start < JOB_TIMEOUT_MS && batchCount < MAX_BATCHES_PER_JOB) {
      const imported = await importBatch(user_id, provider, token);
      if (imported === 0) break;
      totalImported += imported;
      batchCount++;
    }

    const moreInQueue = await hasQueueItems(user_id, provider);

    await api("PATCH", `${COL_SYNC}/${account_id}`, token, {
      status: "idle",
      sync_stage: moreInQueue ? "messages_import" : "list_fetch",
      last_synced_at: new Date().toISOString(),
      error_count: 0,
    });

    await rematchParticipants();

    if (moreInQueue) {
      await api("POST", `/api/v1/apps/${APP_ID}/jobs`, token, {
        payload: { type: "sync_account", account_id, user_id, provider },
      });
    }

    return { imported: totalImported, queued: totalQueued, remaining: moreInQueue };
  } catch (e: any) {
    log.error(`sync ${user_id}/${provider}: ${e.message}`);
    await api("PATCH", `${COL_SYNC}/${account_id}`, token, {
      status: e.message?.includes("401") || e.message?.includes("403") ? "needs_reauth" : "failed",
      error_count: (payload.error_count ?? 0) + 1,
    }).catch(() => {});
    return { error: e.message };
  }
}

// ─── List Fetch ─────────────────────────────────────────────────────────────

async function listFetch(account: any, token: string): Promise<number> {
  const provider = account.provider;
  if (!PROVIDERS[provider]) throw new Error(`unsupported: ${provider}`);

  let newIds: string[];
  let newCursor: string;

  if (provider === "gmail") {
    if (!account.cursor) {
      const r = await gmailFullList(account, token);
      newIds = r.newIds; newCursor = r.cursor;
    } else {
      const r = await gmailIncrementalList(account, token);
      newIds = r.newIds; newCursor = r.cursor;
    }
  } else if (provider === "outlook") {
    const r = await outlookDeltaList(account, token);
    newIds = r.newIds; newCursor = r.cursor;
  } else if (provider === "imap_smtp") {
    const r = await imapIncrementalList(account, token);
    newIds = r.newIds; newCursor = r.cursor;
  } else {
    throw new Error(`unsupported provider: ${provider}`);
  }

  if (newIds.length > 0) {
    const now = new Date().toISOString();
    for (let i = 0; i < newIds.length; i += 500) {
      const chunk = newIds.slice(i, i + 500);
      await db`
        INSERT INTO crm.email_import_queue (user_id, provider, external_id, created_at)
        SELECT * FROM unnest(
          ${db.array(chunk.map(() => account.user_id))}::text[],
          ${db.array(chunk.map(() => account.provider))}::text[],
          ${db.array(chunk)}::text[],
          ${db.array(chunk.map(() => now))}::timestamptz[]
        )
      `;
    }
  }

  const patch: any = { sync_stage: newIds.length > 0 ? "messages_import" : "list_fetch" };
  if (newCursor) patch.cursor = newCursor;
  await api("PATCH", `${COL_SYNC}/${account.id}`, token, patch);

  return newIds.length;
}

async function filterNewIds(userId: string, provider: string, candidateIds: string[]): Promise<string[]> {
  if (candidateIds.length === 0) return [];
  const existing = await db`
    SELECT external_id FROM crm.email_channel_associations
    WHERE user_id = ${userId} AND provider = ${provider}
  `;
  const existingSet = new Set(existing.map((r: any) => r.external_id));
  return candidateIds.filter((id) => !existingSet.has(id));
}

// ─── Gmail list fetch ───────────────────────────────────────────────────────

async function gmailFullList(account: any, token: string): Promise<{ newIds: string[]; cursor: string }> {
  const allIds: string[] = [];
  let pageToken: string | undefined;

  do {
    const result = await api("POST", `${PROVIDERS.gmail}/list_emails`, token, {
      query: GMAIL_EXCLUDE,
      maxResults: 500,
      ...(pageToken ? { pageToken } : {}),
      labelIds: [],
    });
    for (const m of result.messages ?? []) allIds.push(m.id);
    pageToken = result.nextPageToken ?? undefined;
  } while (pageToken);

  let cursor = "";
  if (allIds.length > 0) {
    const first = await api("POST", `${PROVIDERS.gmail}/get_email`, token, { messageId: allIds[0] });
    cursor = first.historyId ?? "";
  }

  const newIds = await filterNewIds(account.user_id, account.provider, allIds);
  return { newIds, cursor };
}

async function gmailIncrementalList(account: any, token: string): Promise<{ newIds: string[]; cursor: string }> {
  const added: string[] = [];
  let pageToken: string | undefined;
  let latestHistoryId: string | null = null;

  try {
    do {
      const result = await api("POST", `${PROVIDERS.gmail}/history_list`, token, {
        startHistoryId: account.cursor,
        maxResults: 500,
        ...(pageToken ? { pageToken } : {}),
      });
      for (const id of result.messagesAdded ?? []) added.push(id);
      latestHistoryId = result.historyId ?? latestHistoryId;
      pageToken = result.nextPageToken ?? undefined;
    } while (pageToken);
  } catch (e: any) {
    if (e.message?.includes("404")) {
      log.warn(`historyId expired for ${account.user_id}, full resync`);
      return gmailFullList({ ...account, cursor: null }, token);
    }
    throw e;
  }

  const newIds = await filterNewIds(account.user_id, account.provider, added);
  return { newIds, cursor: latestHistoryId ?? account.cursor };
}

// ─── Outlook delta list ─────────────────────────────────────────────────────

async function outlookDeltaList(account: any, token: string): Promise<{ newIds: string[]; cursor: string }> {
  const allAdded: string[] = [];
  let nextLink: string | null = null;
  let deltaLink: string | null = null;

  // First page: use stored cursor (deltaLink) or start fresh
  const input: any = account.cursor ? { deltaLink: account.cursor } : { folder: "Inbox", top: 200 };

  do {
    const result = await api("POST", `${PROVIDERS.outlook}/delta_list`, token, nextLink ? { deltaLink: nextLink } : input);
    for (const id of result.messagesAdded ?? []) allAdded.push(id);
    nextLink = result.nextLink ?? null;
    deltaLink = result.deltaLink ?? deltaLink;
  } while (nextLink);

  // Also sync SentItems on first sync (no cursor yet)
  if (!account.cursor) {
    let sentNext: string | null = null;
    const sentInput = { folder: "SentItems", top: 200 };
    do {
      const result = await api("POST", `${PROVIDERS.outlook}/delta_list`, token, sentNext ? { deltaLink: sentNext } : sentInput);
      for (const id of result.messagesAdded ?? []) allAdded.push(id);
      sentNext = result.nextLink ?? null;
      // We only keep the Inbox deltaLink as cursor (SentItems tracked separately if needed later)
    } while (sentNext);
  }

  const newIds = await filterNewIds(account.user_id, account.provider, allAdded);
  return { newIds, cursor: deltaLink ?? account.cursor ?? "" };
}

// ─── IMAP incremental list ─────────────────────────────────────────────────

async function imapIncrementalList(account: any, token: string): Promise<{ newIds: string[]; cursor: string }> {
  const cursor: Record<string, { uidValidity: number; highestUid: number }> | null =
    account.cursor ? JSON.parse(account.cursor) : null;

  // Discover all folders (skip Junk/Trash/Drafts)
  const foldersResult = await api("POST", `${PROVIDERS["imap_smtp"]}/get_folders`, token, {});
  const skipUses = new Set(["\\Junk", "\\Trash", "\\Drafts"]);
  const folders: Array<{ path: string }> = (foldersResult.folders ?? []).filter(
    (f: any) => !skipUses.has(f.specialUse) && !f.flags?.includes("\\Noselect")
  );

  const allExternalIds: string[] = [];
  const newCursors: Record<string, { uidValidity: number; highestUid: number }> = {};

  for (const folder of folders) {
    const prev = cursor?.[folder.path];
    const sinceUid = prev?.highestUid ?? undefined;
    const prevUidValidity = prev?.uidValidity ?? undefined;

    const result = await api("POST", `${PROVIDERS["imap_smtp"]}/list_emails`, token, {
      folder: folder.path,
      sinceUid,
    });

    // Skip if uidValidity matches and no new UIDs
    if (prevUidValidity && result.uidValidity === prevUidValidity && result.highestUid <= (sinceUid ?? 0)) {
      newCursors[folder.path] = prev!;
      continue;
    }

    let data = result;
    if (prevUidValidity && result.uidValidity !== prevUidValidity) {
      log.warn(`IMAP uidValidity changed for ${account.user_id} folder ${folder.path}, full resync`);
      data = await api("POST", `${PROVIDERS["imap_smtp"]}/list_emails`, token, { folder: folder.path });
    }
    for (const uid of data.messageUids ?? []) {
      allExternalIds.push(encodeImapExternalId(folder.path, uid));
    }
    newCursors[folder.path] = { uidValidity: data.uidValidity, highestUid: data.highestUid };
  }

  // Dedup by chunks to avoid loading all associations in memory
  const newIds: string[] = [];
  for (let i = 0; i < allExternalIds.length; i += 200) {
    const chunk = allExternalIds.slice(i, i + 200);
    const existing = await db`
      SELECT external_id FROM crm.email_channel_associations
      WHERE user_id = ${account.user_id} AND provider = ${account.provider}
        AND external_id = ANY(${chunk})
    `;
    const existingSet = new Set(existing.map((r: any) => r.external_id));
    for (const id of chunk) {
      if (!existingSet.has(id)) newIds.push(id);
    }
  }

  return { newIds, cursor: JSON.stringify(newCursors) };
}

// ─── Import Batch (bulk SQL) ────────────────────────────────────────────────

async function importBatch(userId: string, provider: string, token: string): Promise<number> {
  // Claim items from queue atomically — DELETE returns them, no re-queue risk from concurrent workers
  const queueItems = await db`
    DELETE FROM crm.email_import_queue
    WHERE id IN (
      SELECT id FROM crm.email_import_queue
      WHERE user_id = ${userId} AND provider = ${provider}
      ORDER BY created_at ASC
      LIMIT ${BATCH_SIZE}
    )
    RETURNING id, external_id
  `;

  if (queueItems.length === 0) return 0;

  const externalIds: string[] = queueItems.map((r: any) => r.external_id);

  try {

  const endpoint = PROVIDERS[provider];
  if (!endpoint) throw new Error(`unsupported provider: ${provider}`);

  let messages: any[];
  if (provider === "imap_smtp") {
    const byFolder = new Map<string, number[]>();
    for (const eid of externalIds) {
      const { folder, uid } = decodeImapExternalId(eid);
      const list = byFolder.get(folder) ?? [];
      list.push(uid);
      byFolder.set(folder, list);
    }
    messages = [];
    for (const [folder, uids] of byFolder) {
      const result = await api("POST", `${endpoint}/batch_get_emails`, token, { uids, folder });
      for (const m of result.messages ?? []) {
        messages.push({ ...m, id: encodeImapExternalId(folder, m.uid) });
      }
    }
    if (!messages.length) return 0;
  } else {
    const result = await api("POST", `${endpoint}/batch_get_emails`, token, { messageIds: externalIds });
    messages = result.messages ?? [];
    if (!messages.length) return 0;
  }

  await db.begin(async (tx: any) => {
    const emailRows = messages.map((msg: any) => ({
      header_message_id: extractHeaderMessageId(msg) ?? `fallback-${userId}-${msg.id}`,
      thread_id: msg.threadId ?? "",
      subject: (msg.subject ?? "").slice(0, 1000),
      body: truncateBody(msg.body ?? ""),
      received_at: parseDate(msg.date),
    }));

    for (const row of emailRows) {
      await tx`
        INSERT INTO crm.emails (header_message_id, thread_id, subject, body, received_at)
        VALUES (${row.header_message_id}, ${row.thread_id}, ${row.subject}, ${row.body}, ${row.received_at})
        ON CONFLICT (header_message_id) DO NOTHING
      `;
    }

    const headerIds = emailRows.map((r: any) => r.header_message_id);
    const emailIdRows = await tx`
      SELECT id, header_message_id FROM crm.emails WHERE header_message_id = ANY(${headerIds})
    `;
    const headerToId = new Map(emailIdRows.map((r: any) => [r.header_message_id, r.id]));

    const assocRows = messages
      .map((msg: any, i: number) => {
        const emailId = headerToId.get(emailRows[i].header_message_id);
        return emailId ? { email_id: emailId, user_id: userId, provider, external_id: msg.id, direction: detectDirection(msg) } : null;
      })
      .filter(Boolean) as any[];

    if (assocRows.length > 0) {
      await tx`
        INSERT INTO crm.email_channel_associations ${tx(assocRows)}
        ON CONFLICT (user_id, provider, external_id) DO NOTHING
      `;
    }

    const allParticipants: Array<{ email_id: string; address: string; name: string; role: string }> = [];
    for (let i = 0; i < messages.length; i++) {
      const emailId = headerToId.get(emailRows[i].header_message_id);
      if (!emailId) continue;
      for (const p of extractParticipants(messages[i])) {
        allParticipants.push({ email_id: emailId, ...p });
      }
    }

    const uniqueAddresses = [...new Set(allParticipants.map((p) => p.address))];
    const contactRows = uniqueAddresses.length > 0
      ? await tx`SELECT id, lower(email) as email FROM crm.contacts WHERE lower(email) = ANY(${uniqueAddresses})`
      : [];
    const contactMap = new Map(contactRows.map((r: any) => [r.email, r.id]));

    if (allParticipants.length > 0) {
      const partRows = allParticipants.map((p) => ({
        email_id: p.email_id,
        address: p.address,
        name: p.name,
        role: p.role,
        contact_id: contactMap.get(p.address) ?? null,
      }));
      await tx`
        INSERT INTO crm.email_participants ${tx(partRows)}
        ON CONFLICT (email_id, address, role) DO NOTHING
      `;
    }
  });

  return messages.length;
  } catch (e: any) {
    // Re-insert into queue for retry (like Twenty's setAdd on error)
    if (externalIds.length > 0) {
      const now = new Date().toISOString();
      await db`
        INSERT INTO crm.email_import_queue (user_id, provider, external_id, created_at)
        SELECT * FROM unnest(
          ${db.array(externalIds.map(() => userId))}::text[],
          ${db.array(externalIds.map(() => provider))}::text[],
          ${db.array(externalIds)}::text[],
          ${db.array(externalIds.map(() => now))}::timestamptz[]
        )
      `.catch(() => {});
    }
    log.error(`importBatch failed, ${externalIds.length} items re-queued: ${e.message}`);
    throw e;
  }
}

// ─── Rematch orphan participants ────────────────────────────────────────────

async function rematchParticipants() {
  await db`
    UPDATE crm.email_participants ep
    SET contact_id = c.id
    FROM crm.contacts c
    WHERE lower(ep.address) = lower(c.email)
    AND ep.contact_id IS NULL
    AND c.email IS NOT NULL
  `;
}

// ─── Queue helpers ──────────────────────────────────────────────────────────

async function hasQueueItems(userId: string, provider: string): Promise<boolean> {
  const res = await db`
    SELECT 1 FROM crm.email_import_queue
    WHERE user_id = ${userId} AND provider = ${provider}
    LIMIT 1
  `;
  return res.length > 0;
}

// ─── Get emails for a contact (RPC) ────────────────────────────────────────

async function getContactEmails(params: { contact_id: string; limit?: number; offset?: number }, caller: any) {
  const token: string = caller?.authToken;
  if (!token) throw new Error("Not authenticated");
  if (!db) throw new Error("No database");

  const { contact_id, limit = 50, offset = 0 } = params;

  const emails = await db`
    SELECT e.id, e.header_message_id, e.thread_id, e.subject, e.body, e.received_at, e.created_at
    FROM crm.emails e
    JOIN crm.email_participants ep ON ep.email_id = e.id
    JOIN crm.contacts c ON lower(ep.address) = lower(c.email)
    WHERE c.id = ${contact_id}
    GROUP BY e.id
    ORDER BY e.received_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const emailIds = emails.map((e: any) => e.id);
  const participants = emailIds.length > 0
    ? await db`SELECT * FROM crm.email_participants WHERE email_id = ANY(${emailIds})`
    : [];

  const partsByEmail = new Map<string, any[]>();
  for (const p of participants) {
    const list = partsByEmail.get(p.email_id) ?? [];
    list.push(p);
    partsByEmail.set(p.email_id, list);
  }

  return {
    emails: emails.map((e: any) => ({ ...e, participants: partsByEmail.get(e.id) ?? [] })),
    total: emails.length,
  };
}

// ─── Send email (RPC) ───────────────────────────────────────────────────────

async function sendEmail(params: { provider: string; to: string; subject: string; body: string; cc?: string }, caller: any) {
  const token: string = caller?.authToken;
  if (!token) throw new Error("Not authenticated");

  const { provider, to, subject, body, cc } = params;
  const endpoint = PROVIDERS[provider];
  if (!endpoint) throw new Error(`unsupported provider: ${provider}`);

  return api("POST", `${endpoint}/send_email`, token, { to, subject, body, cc });
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function encodeImapExternalId(folder: string, uid: number): string {
  return folder === "INBOX" ? String(uid) : `${folder}:${uid}`;
}

function decodeImapExternalId(externalId: string): { folder: string; uid: number } {
  const colonIdx = externalId.lastIndexOf(":");
  if (colonIdx > 0 && !externalId.startsWith("INBOX")) {
    return { folder: externalId.slice(0, colonIdx), uid: parseInt(externalId.slice(colonIdx + 1), 10) };
  }
  return { folder: "INBOX", uid: parseInt(externalId, 10) };
}

function extractHeaderMessageId(msg: any): string | null {
  return msg.headerMessageId || null;
}

function detectDirection(msg: any): string {
  if ((msg.labelIds ?? []).includes("SENT")) return "outgoing";
  const { folder } = typeof msg.id === "string" && msg.id.includes(":") ? decodeImapExternalId(msg.id) : { folder: "" };
  if (/^(sent|sent items|sent mail)$/i.test(folder)) return "outgoing";
  return "incoming";
}

function extractParticipants(msg: any): Array<{ address: string; name: string; role: string }> {
  const participants: Array<{ address: string; name: string; role: string }> = [];
  if (msg.from) {
    const { address, name } = parseEmailAddress(msg.from);
    if (address) participants.push({ address, name, role: "from" });
  }
  for (const addr of splitAddresses(msg.to)) {
    const { address, name } = parseEmailAddress(addr);
    if (address) participants.push({ address, name, role: "to" });
  }
  for (const addr of splitAddresses(msg.cc)) {
    const { address, name } = parseEmailAddress(addr);
    if (address) participants.push({ address, name, role: "cc" });
  }
  return participants;
}

function parseEmailAddress(raw: string): { address: string; name: string } {
  if (!raw) return { address: "", name: "" };
  const match = raw.match(/^(.+?)\s*<([^>]+)>$/);
  if (match) return { address: match[2].trim().toLowerCase(), name: match[1].trim() };
  return { address: raw.trim().toLowerCase(), name: "" };
}

function splitAddresses(field: string | undefined): string[] {
  if (!field) return [];
  return field.split(",").map((s) => s.trim()).filter(Boolean);
}

function truncateBody(body: string): string {
  const MAX = 2 * 1024 * 1024;
  return body.length > MAX ? body.slice(0, MAX) : body;
}

function parseDate(raw: string | undefined): string {
  if (!raw) return new Date().toISOString();
  const d = new Date(raw);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

// ─── add_filtered_to_list (unchanged) ───────────────────────────────────────

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
