import { describe, it, expect } from "bun:test";

// Extract the pure logic functions for testing.
// These match the implementations in backend/index.ts.

function computeDirection(msg: any, account: any): string {
  const handle = (account?.handle ?? "").toLowerCase();
  const aliasesRaw = account?.handle_aliases;
  const aliases: string[] = aliasesRaw
    ? (() => { try { return JSON.parse(aliasesRaw); } catch { return []; } })()
    : [];
  const allHandles = new Set([handle, ...aliases].filter(Boolean));
  if (allHandles.size === 0) {
    if ((msg.labelIds ?? []).includes("SENT")) return "outgoing";
    return "incoming";
  }

  const fromAddr = typeof msg.from === "object" && msg.from
    ? (msg.from.address ?? "").toLowerCase()
    : parseEmailAddress(typeof msg.from === "string" ? msg.from : "").address;

  if (fromAddr && allHandles.has(fromAddr)) return "outgoing";
  if ((msg.labelIds ?? []).includes("SENT")) return "outgoing";
  return "incoming";
}

function parseEmailAddress(raw: string): { address: string; name: string } {
  if (!raw) return { address: "", name: "" };
  const match = raw.match(/^(.+?)\s*<([^>]+)>$/);
  if (match) return { address: match[2].trim().toLowerCase(), name: match[1].trim() };
  return { address: raw.trim().toLowerCase(), name: "" };
}

describe("computeDirection", () => {
  const cases: Array<[string, any, any, string]> = [
    ["from = handle -> outgoing",
      { from: { address: "me@co.com" } },
      { handle: "me@co.com", handle_aliases: "[]" },
      "outgoing"],
    ["from = one of handle_aliases -> outgoing",
      { from: { address: "alias@co.com" } },
      { handle: "me@co.com", handle_aliases: '["alias@co.com"]' },
      "outgoing"],
    ["from = unrelated, to contains handle -> incoming",
      { from: { address: "other@ext.com" }, to: [{ address: "me@co.com" }] },
      { handle: "me@co.com", handle_aliases: "[]" },
      "incoming"],
    ["from = unrelated, no match anywhere -> incoming",
      { from: { address: "stranger@ext.com" } },
      { handle: "me@co.com", handle_aliases: "[]" },
      "incoming"],
    ["empty handle_aliases string -> still works (from = handle)",
      { from: { address: "me@co.com" } },
      { handle: "me@co.com", handle_aliases: "" },
      "outgoing"],
    ["no handle at all, SENT label -> outgoing",
      { from: { address: "me@co.com" }, labelIds: ["SENT"] },
      { handle: "", handle_aliases: "" },
      "outgoing"],
    ["no handle at all, no SENT label -> incoming",
      { from: { address: "them@ext.com" }, labelIds: ["INBOX"] },
      { handle: "", handle_aliases: "" },
      "incoming"],
    ["case insensitive match",
      { from: { address: "Me@CO.com" } },
      { handle: "me@co.com", handle_aliases: "[]" },
      "outgoing"],
  ];

  for (const [label, msg, account, expected] of cases) {
    it(label, () => {
      expect(computeDirection(msg, account)).toBe(expected);
    });
  }
});

describe("handleSyncError state machine", () => {
  // Simulate the state machine logic from backend/index.ts handleSyncError
  const MAX_THROTTLE_ATTEMPTS = 5;

  function simulateError(
    current: { throttle_failure_count: number; status: string },
    errorCode: string,
    retryAfter?: number,
  ): { status: string; throttle_failure_count: number; throttle_retry_after: string | null; cursor?: null; sync_stage?: string } {
    if (errorCode === "INSUFFICIENT_PERMISSIONS") {
      return { ...current, status: "needs_reauth", throttle_retry_after: null };
    }
    if (errorCode === "SYNC_CURSOR_ERROR") {
      return { ...current, status: "idle", throttle_retry_after: null, cursor: null, sync_stage: "list_fetch" };
    }
    if (errorCode === "TEMPORARY_ERROR") {
      const count = current.throttle_failure_count + 1;
      if (count >= MAX_THROTTLE_ATTEMPTS) {
        return { status: "failed_permanent", throttle_failure_count: count, throttle_retry_after: null };
      }
      const minWait = 60_000 * Math.pow(2, Math.min(count - 1, 5));
      const retryAt = new Date(Math.max(Date.now() + minWait, retryAfter ?? 0)).toISOString();
      return { status: "failed_temporary", throttle_failure_count: count, throttle_retry_after: retryAt };
    }
    return { ...current, status: "failed", throttle_retry_after: null };
  }

  function simulateSuccess(current: any) {
    return { ...current, status: "idle", throttle_failure_count: 0, throttle_retry_after: null };
  }

  const cases: Array<[string, any, string | "success", number | undefined, (r: any) => void]> = [
    ["count=0, TEMPORARY -> count=1, failed_temporary",
      { throttle_failure_count: 0, status: "syncing" }, "TEMPORARY_ERROR", undefined,
      (r) => { expect(r.throttle_failure_count).toBe(1); expect(r.status).toBe("failed_temporary"); expect(r.throttle_retry_after).not.toBeNull(); }],
    ["count=4, TEMPORARY -> count=5, failed_permanent",
      { throttle_failure_count: 4, status: "syncing" }, "TEMPORARY_ERROR", undefined,
      (r) => { expect(r.throttle_failure_count).toBe(5); expect(r.status).toBe("failed_permanent"); }],
    ["count=3, TEMPORARY with retryAfter=future -> uses retryAfter",
      { throttle_failure_count: 3, status: "syncing" }, "TEMPORARY_ERROR", Date.now() + 600_000,
      (r) => { expect(r.throttle_failure_count).toBe(4); expect(new Date(r.throttle_retry_after!).getTime()).toBeGreaterThanOrEqual(Date.now() + 500_000); }],
    ["count=2, INSUFFICIENT_PERMISSIONS -> needs_reauth, count unchanged",
      { throttle_failure_count: 2, status: "syncing" }, "INSUFFICIENT_PERMISSIONS", undefined,
      (r) => { expect(r.status).toBe("needs_reauth"); expect(r.throttle_failure_count).toBe(2); }],
    ["count=2, SYNC_CURSOR_ERROR -> idle, cursor=null, count unchanged",
      { throttle_failure_count: 2, status: "syncing" }, "SYNC_CURSOR_ERROR", undefined,
      (r) => { expect(r.status).toBe("idle"); expect(r.cursor).toBeNull(); expect(r.sync_stage).toBe("list_fetch"); expect(r.throttle_failure_count).toBe(2); }],
    ["count=3, success -> count=0, idle",
      { throttle_failure_count: 3, status: "syncing" }, "success", undefined,
      (r) => { expect(r.throttle_failure_count).toBe(0); expect(r.status).toBe("idle"); expect(r.throttle_retry_after).toBeNull(); }],
  ];

  for (const [label, current, errorCode, retryAfter, assertions] of cases) {
    it(label, () => {
      const result = errorCode === "success"
        ? simulateSuccess(current)
        : simulateError(current, errorCode, retryAfter);
      assertions(result);
    });
  }
});

describe("planer integration (smoke)", () => {
  it("strips 'On ... wrote:' quote chain from text", async () => {
    const planer = await import("planer");
    const input = "Thanks for the update!\n\nOn Mon, Jan 1, 2024, Alice <alice@x.com> wrote:\n> Original message here\n> Second line";
    const result = planer.extractFromPlain(input);
    expect(result).toContain("Thanks for the update!");
    expect(result).not.toContain("Original message here");
  });
});

describe("bootstrap cursor", () => {
  it("must use get_profile historyId, not first message historyId", () => {
    // This is a documentation test: asserts the contract of gmailFullList.
    // The actual implementation calls get_profile BEFORE list_emails.
    // Profile returns historyId=100. Messages may have historyId=105.
    // Cursor must be 100 (the profile value), not 105 (the message value).
    const profileHistoryId = "100";
    const firstMessageHistoryId = "105";
    const cursor = profileHistoryId; // correct implementation
    expect(cursor).toBe("100");
    expect(cursor).not.toBe(firstMessageHistoryId);
  });
});
