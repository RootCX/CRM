import { useEffect, useState } from "react";
import { useIntegration, useRuntimeClient } from "@rootcx/sdk";
import {
  Button, Card, CardContent, CardHeader, CardTitle, CardDescription,
  Badge, Separator, Switch, Tooltip, TooltipTrigger, TooltipContent, TooltipProvider, toast,
} from "@rootcx/ui";
import {
  IconCalendarEvent, IconCheck, IconX, IconRefresh, IconLoader2, IconLock, IconUsers,
} from "@tabler/icons-react";
import { APP_ID } from "@/lib/constants";
import { formatRelative } from "@/lib/utils";

type Visibility = "share_everything" | "metadata";

interface SyncCursor {
  id: string;
  calendarExternalId: string;
  calendarSummary: string;
  isPrimary: boolean;
  visibility: Visibility;
  status: "idle" | "syncing" | "needs_reauth" | "failed_temporary" | "failed_permanent";
  lastSyncedAt?: string | null;
  throttleCount: number;
  throttleAfter?: string | null;
  hasCron: boolean;
  hasToken: boolean;
  enabled: boolean;
}

export default function CalendarSettingsTab() {
  const client = useRuntimeClient();
  const { connected, loading: integLoading, connect, disconnect, call } = useIntegration("google_calendar");

  const [cursors, setCursors] = useState<SyncCursor[]>([]);
  const [meetingsCount, setMeetingsCount] = useState(0);
  const [stateLoading, setStateLoading] = useState(true);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const refresh = async () => {
    try {
      const [state, count] = await Promise.all([
        client.rpc(APP_ID, "get_calendar_sync_state", {}) as Promise<{ cursors: SyncCursor[] }>,
        client.rpc(APP_ID, "get_meetings_count", {}) as Promise<{ count: number }>,
      ]);
      setCursors(state.cursors ?? []);
      setMeetingsCount(count.count ?? 0);
    } catch {
      setCursors([]);
      setMeetingsCount(0);
    } finally {
      setStateLoading(false);
    }
  };

  useEffect(() => {
    if (!integLoading) refresh();
  }, [integLoading, connected]);

  const callAction = async <T,>(action: string, input: Record<string, unknown> = {}): Promise<T> => {
    const res = await call(action, input) as { ok?: boolean; data?: T; error?: { code: string; message: string } } | null;
    if (!res || res.ok !== true) {
      const err: Error & { code?: string } = new Error(res?.error?.message ?? `${action} failed`);
      err.code = res?.error?.code;
      throw err;
    }
    return res.data as T;
  };

  const runBootstrap = async () => {
    setBootstrapping(true);
    try {
      await callAction("sync_connect");
      await refresh();
    } catch (e: any) {
      toast.error(`Bootstrap failed: ${e?.message ?? "unknown"}`);
    } finally {
      setBootstrapping(false);
    }
  };

  useEffect(() => {
    if (stateLoading || !connected || cursors.length > 0 || bootstrapping) return;
    runBootstrap();
  }, [stateLoading, connected, cursors.length]);

  const handleConnect = async () => {
    try { await connect(); }
    catch (e: any) { toast.error(e?.message ?? "Failed to start OAuth"); }
  };

  const handleSyncNow = async () => {
    if (!cursors.length) return runBootstrap();
    setSyncing(true);
    try {
      const r = await callAction<{ triggered?: boolean }>("sync_now");
      toast.success(r?.triggered === false ? "Sync already in progress" : "Sync triggered");
      setTimeout(refresh, 1500);
    } catch (e: any) {
      toast.error(e?.message ?? "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const handleVisibilityChange = async (calendarExternalId: string, share: boolean) => {
    const visibility: Visibility = share ? "share_everything" : "metadata";
    setCursors(prev => prev.map(c => c.calendarExternalId === calendarExternalId ? { ...c, visibility } : c));
    try {
      await callAction("update_calendar_visibility", { calendarExternalId, visibility });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update visibility");
      await refresh();
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await callAction("sync_disconnect").catch(() => {});
      await disconnect();
      await refresh();
      toast.success("Calendar disconnected");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to disconnect");
    } finally {
      setDisconnecting(false);
    }
  };

  if (integLoading || stateLoading) {
    return <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>;
  }

  const hasData = meetingsCount > 0 || cursors.length > 0;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Connect your Google Calendar to see meetings linked to your contacts. Events sync every 5 minutes in the background.
      </p>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <IconCalendarEvent className="h-5 w-5" />
              <CardTitle className="text-base">Google Calendar</CardTitle>
            </div>
            {connected ? (
              <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">
                <IconCheck className="h-3 w-3 mr-1" /> Connected
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                <IconX className="h-3 w-3 mr-1" /> Not connected
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!connected ? (
            <Button onClick={handleConnect}>Connect Google Calendar</Button>
          ) : bootstrapping ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <IconLoader2 className="h-4 w-4 animate-spin" /> Initializing sync, this may take a few seconds…
            </p>
          ) : (
            <div className="space-y-3">
              <CursorList cursors={cursors} onVisibilityChange={handleVisibilityChange} />
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={handleSyncNow} disabled={syncing}>
                  <IconRefresh className={`h-4 w-4 mr-1 ${syncing ? "animate-spin" : ""}`} />
                  {syncing ? "Syncing..." : "Sync now"}
                </Button>
                <Button variant="outline" size="sm" onClick={handleDisconnect} disabled={disconnecting}>
                  {disconnecting ? "..." : "Disconnect"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {hasData && <Separator />}

      {hasData && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Synced data</CardTitle>
            <CardDescription>
              {meetingsCount.toLocaleString()} event{meetingsCount === 1 ? "" : "s"} across {cursors.length} calendar{cursors.length === 1 ? "" : "s"}.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}

function CursorList({
  cursors,
  onVisibilityChange,
}: {
  cursors: SyncCursor[];
  onVisibilityChange: (calendarExternalId: string, share: boolean) => void;
}) {
  if (!cursors.length) return <p className="text-sm text-muted-foreground">No calendars synced yet.</p>;

  return (
    <TooltipProvider>
      <div className="divide-y rounded-md border">
        {cursors.map((c) => {
          const shared = c.visibility === "share_everything";
          return (
            <div key={c.id} className="flex items-center justify-between px-3 py-2 gap-3">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-sm font-medium truncate">{c.calendarSummary}</span>
                {c.isPrimary && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">primary</Badge>}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <CursorStatus cursor={c} />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5">
                      {shared ? <IconUsers className="h-3.5 w-3.5 text-muted-foreground" /> : <IconLock className="h-3.5 w-3.5 text-muted-foreground" />}
                      <Switch
                        checked={shared}
                        onCheckedChange={(v) => onVisibilityChange(c.calendarExternalId, v)}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {shared
                      ? "Event titles and details visible to all workspace users"
                      : "Only times shown to others; titles hidden as 'Not shared'"}
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

function CursorStatus({ cursor }: { cursor: SyncCursor }) {
  if (!cursor.enabled) {
    return <span className="text-xs text-muted-foreground">Disabled</span>;
  }
  if (cursor.status === "syncing") {
    return (
      <span className="text-xs text-blue-600 flex items-center gap-1">
        <IconLoader2 className="h-3 w-3 animate-spin" /> Syncing…
      </span>
    );
  }
  if (cursor.status === "needs_reauth") {
    return <span className="text-xs font-medium text-destructive">Reconnect required</span>;
  }
  if (cursor.status === "failed_temporary") {
    const retryIn = cursor.throttleAfter
      ? Math.max(0, Math.ceil((new Date(cursor.throttleAfter).getTime() - Date.now()) / 60000))
      : 0;
    return (
      <span className="text-xs text-orange-600">
        Throttled{retryIn > 0 ? ` (retry ~${retryIn}m)` : ""}
      </span>
    );
  }
  if (cursor.status === "failed_permanent") {
    return <span className="text-xs font-medium text-destructive">Failed permanently</span>;
  }
  return (
    <span className="text-xs text-muted-foreground">
      {cursor.lastSyncedAt ? `Synced ${formatRelative(cursor.lastSyncedAt)}` : "Pending first sync"}
    </span>
  );
}
