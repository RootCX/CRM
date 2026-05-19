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
    get_timeline_meetings_from_contact_id: (p: any, caller: any) => timelineMeetingsFromContactIds(p, caller),
    get_timeline_meetings_from_company_id: (p: any, caller: any) => timelineMeetingsFromCompanyId(p, caller),
    get_timeline_meetings_from_deal_id: (p: any, caller: any) => timelineMeetingsFromDealId(p, caller),
    get_calendar_sync_state: (_p: any, caller: any) => calendarSyncState(caller),
    get_meetings_count: (_p: any, caller: any) => meetingsCount(caller),
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

interface TimelineMeetingParticipant {
  contactId: string | null;
  firstName: string;
  lastName: string;
  displayName: string;
  avatarUrl: string;
  handle: string;
  responseStatus: "needs_action" | "declined" | "tentative" | "accepted";
  isOrganizer: boolean;
}

interface TimelineMeeting {
  id: string;
  title: string;
  isFullDay: boolean;
  startsAt: string;
  endsAt: string;
  description: string;
  location: string;
  conferenceSolution: string;
  conferenceLink: { primaryLinkLabel: string; primaryLinkUrl: string };
  participants: TimelineMeetingParticipant[];
  visibility: "share_everything" | "metadata";
  externalCreatedAt: string;
  htmlLink: string;
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

function groupByField<T>(rows: T[], key: keyof T): Map<any, T[]> {
  const out = new Map<any, T[]>();
  for (const r of rows) {
    const k = r[key];
    const list = out.get(k);
    if (list) list.push(r);
    else out.set(k, [r]);
  }
  return out;
}

async function timelineForContactIds(
  ids: string[],
  page: number,
  pageSize: number,
  caller: any,
): Promise<{ totalNumberOfMeetings: number; timelineMeetings: TimelineMeeting[] }> {
  if (!caller?.authToken) throw new Error("Not authenticated");
  if (!ids.length) return { totalNumberOfMeetings: 0, timelineMeetings: [] };

  const userId: string | undefined = caller?.userId;
  const offset = (page - 1) * pageSize;

  const eventRows = await db`
    WITH addresses AS (
      SELECT DISTINCT lower(email) AS addr FROM crm.contacts
      WHERE id = ANY(${ids}) AND email IS NOT NULL AND email <> ''
    )
    SELECT e.id, e.starts_at, COUNT(*) OVER() AS total
    FROM google_calendar.events e
    WHERE EXISTS (
      SELECT 1 FROM google_calendar.attendees a
      JOIN addresses ON addresses.addr = lower(a.address)
      WHERE a.event_id = e.id
    )
    ORDER BY e.starts_at DESC NULLS LAST
    LIMIT ${pageSize} OFFSET ${offset}
  `;

  const total = eventRows.length ? Number(eventRows[0].total) : 0;
  if (!eventRows.length) return { totalNumberOfMeetings: total, timelineMeetings: [] };
  const eventIds = eventRows.map((r: any) => r.id);

  const [events, attendees, associations] = await Promise.all([
    db`SELECT * FROM google_calendar.events WHERE id = ANY(${eventIds})`,
    db`SELECT * FROM google_calendar.attendees WHERE event_id = ANY(${eventIds})`,
    db`SELECT * FROM google_calendar.channel_event_associations WHERE event_id = ANY(${eventIds})`,
  ]);

  const calendarIds = [...new Set(associations.map((a: any) => a.calendar_external_id))];
  const calendars = calendarIds.length
    ? await db`
        SELECT external_id, user_id, visibility
        FROM google_calendar.calendars
        WHERE external_id = ANY(${calendarIds}) AND (visibility = 'share_everything' OR user_id = ${userId ?? null})
      `
    : [];
  const calVisibility = new Map<string, { visibility: string; userId: string }>(
    calendars.map((c: any) => [c.external_id, { visibility: c.visibility ?? "share_everything", userId: c.user_id }]),
  );

  const attendeeAddresses = [...new Set(attendees.map((a: any) => a.address.toLowerCase()))];
  const matchingContacts = attendeeAddresses.length
    ? await db`SELECT id, lower(email) AS email, first_name, last_name, avatar_url FROM crm.contacts WHERE lower(email) = ANY(${attendeeAddresses})`
    : [];
  const contactByEmail = new Map<string, any>(matchingContacts.map((c: any) => [c.email, c]));

  const attendeesByEvent = groupByField<any>(attendees, "event_id");
  const assocsByEvent = groupByField<any>(associations, "event_id");
  const eventById = new Map<string, any>(events.map((e: any) => [e.id, e]));

  const timelineMeetings: TimelineMeeting[] = eventRows.map((row: any) => {
    const e = eventById.get(row.id);
    const evAssocs = assocsByEvent.get(row.id) ?? [];

    const hasFullAccess = evAssocs.some((assoc: any) => {
      const cal = calVisibility.get(assoc.calendar_external_id);
      if (!cal) return false;
      return cal.visibility === "share_everything" || (!!userId && cal.userId === userId);
    });
    const visibility: "share_everything" | "metadata" = hasFullAccess ? "share_everything" : "metadata";

    const participants: TimelineMeetingParticipant[] = (attendeesByEvent.get(row.id) ?? []).map((a: any) => {
      const contact = contactByEmail.get(a.address.toLowerCase());
      return {
        contactId: contact?.id ?? null,
        firstName: contact?.first_name ?? "",
        lastName: contact?.last_name ?? "",
        displayName:
          contact?.first_name || contact?.last_name
            ? [contact.first_name, contact.last_name].filter(Boolean).join(" ")
            : a.display_name || a.address,
        avatarUrl: contact?.avatar_url ?? "",
        handle: a.address ?? "",
        responseStatus: a.response_status ?? "needs_action",
        isOrganizer: !!a.is_organizer,
      };
    });

    return {
      id: e.id,
      title: e.title ?? "",
      isFullDay: !!e.is_full_day,
      startsAt: e.starts_at,
      endsAt: e.ends_at,
      description: e.description ?? "",
      location: e.location ?? "",
      conferenceSolution: e.conference_solution ?? "",
      conferenceLink: {
        primaryLinkLabel: e.conference_link ?? "",
        primaryLinkUrl: e.conference_link ?? "",
      },
      participants,
      visibility,
      externalCreatedAt: e.external_created_at,
      htmlLink: e.html_link ?? "",
    };
  });

  return { totalNumberOfMeetings: total, timelineMeetings };
}

const pageArgs = (p: any): { page: number; pageSize: number } => ({
  page: Math.max(1, p?.page ?? 1),
  pageSize: Math.min(MAX_PAGE_SIZE, Math.max(1, p?.pageSize ?? DEFAULT_PAGE_SIZE)),
});

async function timelineMeetingsFromContactIds(
  params: { contact_id: string; page?: number; pageSize?: number },
  caller: any,
) {
  const { page, pageSize } = pageArgs(params);
  const ids = params.contact_id ? [params.contact_id] : [];
  return timelineForContactIds(ids, page, pageSize, caller);
}

async function timelineMeetingsFromCompanyId(
  params: { company_id: string; page?: number; pageSize?: number },
  caller: any,
) {
  if (!params.company_id) throw new Error("company_id required");
  const { page, pageSize } = pageArgs(params);
  const rows = await db`SELECT id FROM crm.contacts WHERE company_id = ${params.company_id}`;
  return timelineForContactIds(rows.map((r: any) => r.id), page, pageSize, caller);
}

async function calendarSyncState(caller: any) {
  const userId: string | undefined = caller?.userId;
  if (!userId) return { cursors: [] };
  const rows = await db`
    SELECT id, calendar_external_id, status, last_synced_at, throttle_count,
           throttle_after, cron_id, sync_token IS NOT NULL AS has_token, enabled
    FROM google_calendar.sync_cursors
    WHERE user_id = ${userId}
    ORDER BY calendar_external_id
  `;
  const cals = rows.length
    ? await db`
        SELECT external_id, summary, "primary", visibility
        FROM google_calendar.calendars
        WHERE user_id = ${userId} AND external_id = ANY(${rows.map((r: any) => r.calendar_external_id)})
      `
    : [];
  const calInfo = new Map<string, { summary: string; primary: boolean; visibility: string }>(
    cals.map((c: any) => [c.external_id, { summary: c.summary, primary: c.primary, visibility: c.visibility ?? "share_everything" }]),
  );
  return {
    cursors: rows.map((r: any) => {
      const info = calInfo.get(r.calendar_external_id);
      return {
        id: r.id,
        calendarExternalId: r.calendar_external_id,
        calendarSummary: info?.summary ?? r.calendar_external_id,
        isPrimary: info?.primary ?? false,
        visibility: info?.visibility ?? "share_everything",
        status: r.status ?? "idle",
        lastSyncedAt: r.last_synced_at,
        throttleCount: r.throttle_count ?? 0,
        throttleAfter: r.throttle_after,
        hasCron: !!r.cron_id,
        hasToken: !!r.has_token,
        enabled: !!r.enabled,
      };
    }),
  };
}

async function meetingsCount(caller: any) {
  const userId: string | undefined = caller?.userId;
  if (!userId) return { count: 0 };
  const rows = await db`
    SELECT COUNT(DISTINCT e.id)::int AS count
    FROM google_calendar.events e
    JOIN google_calendar.channel_event_associations a ON a.event_id = e.id
    WHERE a.user_id = ${userId}
  `;
  return { count: rows[0]?.count ?? 0 };
}

async function timelineMeetingsFromDealId(
  params: { deal_id: string; page?: number; pageSize?: number },
  caller: any,
) {
  if (!params.deal_id) throw new Error("deal_id required");
  const { page, pageSize } = pageArgs(params);
  const rows = await db`
    SELECT DISTINCT id FROM crm.contacts c
    WHERE c.id IN (SELECT contact_id FROM crm.deals WHERE id = ${params.deal_id})
       OR c.id IN (SELECT contact_id FROM crm.deal_contacts WHERE deal_id = ${params.deal_id})
       OR c.company_id = (SELECT company_id FROM crm.deals WHERE id = ${params.deal_id})
  `;
  return timelineForContactIds(rows.map((r: any) => r.id), page, pageSize, caller);
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
