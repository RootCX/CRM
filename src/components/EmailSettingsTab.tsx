import { useRef, useState } from "react";
import { useAuth, useIntegration, useAppCollection, useRuntimeClient } from "@rootcx/sdk";
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, toast } from "@rootcx/ui";
import { IconBrandGmail, IconBrandWindows, IconCheck, IconX, IconRefresh } from "@tabler/icons-react";
import { APP_ID } from "@/lib/constants";

interface SyncState {
  id: string;
  user_id: string;
  provider: string;
  cursor?: string;
  status?: string;
  sync_stage?: string;
  last_synced_at?: string;
  error_count?: number;
  enabled?: boolean;
}

export default function EmailSettingsTab() {
  const { user } = useAuth();
  const client = useRuntimeClient();
  const { connected: gmailConnected, loading: gmailLoading, connect: connectGmail, disconnect: disconnectGmail } = useIntegration("gmail");
  const { connected: outlookConnected, loading: outlookLoading, connect: connectOutlook, disconnect: disconnectOutlook } = useIntegration("outlook");
  const { data: syncStates, loading: syncLoading, refetch } = useAppCollection<SyncState>(APP_ID, "sync_state");

  const userId = user?.id;
  const gmailSync = syncStates.find((s) => s.user_id === userId && s.provider === "gmail");
  const outlookSync = syncStates.find((s) => s.user_id === userId && s.provider === "outlook");
  const creatingRef = useRef(false);

  const ensureSyncState = async (provider: string) => {
    if (!userId || creatingRef.current) return;
    creatingRef.current = true;
    try {
      await client.createRecord(APP_ID, "sync_state", {
        user_id: userId,
        provider,
        enabled: true,
        status: "idle",
        error_count: 0,
      });
      await refetch();
    } catch {}
    finally { creatingRef.current = false; }
  };

  const disableSyncState = async (syncState: SyncState) => {
    try {
      await client.updateRecord(APP_ID, "sync_state", syncState.id, { enabled: false });
      await refetch();
      toast.success("Sync disabled");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to disable sync");
    }
  };

  const handleConnectGmail = async () => {
    await connectGmail();
    await waitForConnection("gmail");
  };

  const handleConnectOutlook = async () => {
    await connectOutlook();
    await waitForConnection("outlook");
  };

  const waitForConnection = async (provider: string) => {
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const freshStates = await refetch();
      const states = freshStates ?? syncStates;
      const existing = states.find((s: SyncState) => s.user_id === userId && s.provider === provider);
      if (existing) return;
    }
    await ensureSyncState(provider);
    toast.success(`${provider} connected and sync enabled`);
  };

  const triggerSyncNow = async () => {
    if (gmailConnected && !gmailSync) await ensureSyncState("gmail");
    if (outlookConnected && !outlookSync) await ensureSyncState("outlook");
    await client.rpc(APP_ID, "trigger_sync", {});
    await refetch();
  };

  if (gmailLoading || outlookLoading || syncLoading) {
    return <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Connect your email account to automatically sync emails with your contacts. Emails are synced every 5 minutes in the background.
      </p>

      <div className="grid gap-4">
        <EmailProviderCard
          name="Gmail"
          icon={<IconBrandGmail className="h-5 w-5" />}
          connected={gmailConnected}
          syncState={gmailSync}
          onConnect={handleConnectGmail}
          onDisconnect={disconnectGmail}
          onDisableSync={() => gmailSync && disableSyncState(gmailSync)}
          onSyncNow={triggerSyncNow}
        />
        <EmailProviderCard
          name="Outlook"
          icon={<IconBrandWindows className="h-5 w-5" />}
          connected={outlookConnected}
          syncState={outlookSync}
          onConnect={handleConnectOutlook}
          onDisconnect={disconnectOutlook}
          onDisableSync={() => outlookSync && disableSyncState(outlookSync)}
          onSyncNow={triggerSyncNow}
        />
      </div>
    </div>
  );
}

function EmailProviderCard({
  name, icon, connected, syncState, onConnect, onDisconnect, onDisableSync, onSyncNow,
}: {
  name: string;
  icon: React.ReactNode;
  connected: boolean;
  syncState?: SyncState;
  onConnect: () => void;
  onDisconnect: () => Promise<void>;
  onDisableSync: () => void;
  onSyncNow: () => Promise<void>;
}) {
  const [disconnecting, setDisconnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await onDisconnect();
      onDisableSync();
      toast.success(`${name} disconnected`);
    } catch {
      toast.error("Failed to disconnect");
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      await onSyncNow();
      toast.success("Sync triggered");
    } catch (e: any) {
      toast.error(e?.message ?? "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const formatLastSync = (dateStr?: string) => {
    if (!dateStr) return "Never";
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {icon}
            <CardTitle className="text-base">{name}</CardTitle>
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
        {connected ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Status: <span className="font-medium text-foreground">{syncState?.status ?? "idle"}</span></p>
                <p>Last synced: <span className="font-medium text-foreground">{formatLastSync(syncState?.last_synced_at)}</span></p>
                {(syncState?.error_count ?? 0) > 0 && (
                  <p className="text-destructive">Errors: {syncState?.error_count}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleSyncNow} disabled={syncing}>
                  <IconRefresh className={`h-4 w-4 mr-1 ${syncing ? "animate-spin" : ""}`} />
                  {syncing ? "Syncing..." : "Sync now"}
                </Button>
                <Button variant="outline" size="sm" onClick={handleDisconnect} disabled={disconnecting}>
                  {disconnecting ? "..." : "Disconnect"}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <Button onClick={onConnect}>Connect {name}</Button>
        )}
      </CardContent>
    </Card>
  );
}
