import { useRef, useState } from "react";
import { useAuth, useIntegration, useAppCollection, useRuntimeClient, useCrons } from "@rootcx/sdk";
import { Button, Card, CardContent, CardHeader, CardTitle, CardDescription, Badge, Separator, toast, ConfirmDialog, Input, Label } from "@rootcx/ui";
import { IconBrandGmail, IconBrandWindows, IconMail, IconCheck, IconX, IconRefresh, IconTrash, IconLoader2 } from "@tabler/icons-react";
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
  cron_id?: string;
}

export default function EmailSettingsTab() {
  const { user } = useAuth();
  const client = useRuntimeClient();
  const { connected: gmailConnected, loading: gmailLoading, connect: connectGmail, disconnect: disconnectGmail } = useIntegration("gmail");
  const { connected: outlookConnected, loading: outlookLoading, connect: connectOutlook, disconnect: disconnectOutlook } = useIntegration("outlook");
  const { connected: imapConnected, loading: imapLoading, connect: connectImap, submitCredentials: submitImapCredentials, disconnect: disconnectImap } = useIntegration("imap_smtp");
  const { data: syncStates, loading: syncLoading, refetch } = useAppCollection<SyncState>(APP_ID, "sync_state");
  const { create: createCron, remove: removeCron, trigger: triggerCron } = useCrons(APP_ID);

  const { total: emailCount } = useAppCollection<{ id: string }>(APP_ID, "emails", { limit: 1 });
  const { total: queueCount } = useAppCollection<{ id: string }>(APP_ID, "email_import_queue", { limit: 1 });

  const [flushConfirmOpen, setFlushConfirmOpen] = useState(false);
  const [flushing, setFlushing] = useState(false);

  const runFlush = async () => {
    setFlushing(true);
    try {
      const res = await client.rpc(APP_ID, "flush_email_data", {}) as { deleted: { emails: number; queue: number; sync_state: number } };
      const { emails, queue, sync_state } = res.deleted;
      await refetch();
      toast.success(`Flushed ${emails} emails, ${queue} queued items, ${sync_state} sync states.`);
    } catch (e: any) {
      toast.error("Flush failed: " + (e?.message ?? "Unknown error"));
    } finally {
      setFlushing(false);
    }
  };

  const hasEmailData = emailCount > 0 || queueCount > 0 || syncStates.length > 0;

  const userId = user?.id;
  const gmailSync = syncStates.find((s) => s.user_id === userId && s.provider === "gmail");
  const outlookSync = syncStates.find((s) => s.user_id === userId && s.provider === "outlook");
  const imapSync = syncStates.find((s) => s.user_id === userId && s.provider === "imap_smtp");
  const creatingRef = useRef(false);
  const [imapForm, setImapForm] = useState<Record<string, any> | null>(null);
  const [imapFormValues, setImapFormValues] = useState<Record<string, string>>({});

  const ensureSyncState = async (provider: string) => {
    if (!userId || creatingRef.current) return;
    creatingRef.current = true;
    try {
      const cron = await createCron({
        name: `sync_${provider}_${userId}`,
        schedule: "*/5 * * * *",
        payload: { user_id: userId, provider },
        overlapPolicy: "skip",
      });
      await client.createRecord(APP_ID, "sync_state", {
        user_id: userId,
        provider,
        enabled: true,
        status: "idle",
        error_count: 0,
        cron_id: cron.id,
      });
      await refetch();
    } catch {}
    finally { creatingRef.current = false; }
  };

  const disableSyncState = async (syncState: SyncState) => {
    try {
      await Promise.all([
        syncState.cron_id ? removeCron(syncState.cron_id).catch(() => {}) : Promise.resolve(),
        client.updateRecord(APP_ID, "sync_state", syncState.id, { enabled: false, cron_id: null }),
      ]);
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

  const handleConnectImap = async () => {
    const result = await connectImap();
    if (result?.type === "credentials" && result.schema) {
      const defaults: Record<string, string> = {};
      for (const [key, def] of Object.entries((result.schema as any).properties ?? {})) {
        if ((def as any).default != null) defaults[key] = String((def as any).default);
      }
      setImapFormValues(defaults);
      setImapForm(result.schema as Record<string, any>);
    }
  };

  const handleSubmitImap = async () => {
    try {
      await submitImapCredentials(imapFormValues);
      setImapForm(null);
      setImapFormValues({});
      await ensureSyncState("imap_smtp");
      toast.success("IMAP/SMTP connected and sync enabled");
    } catch (e: any) {
      toast.error(e?.message ?? "Connection failed");
    }
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
    if (imapConnected && !imapSync) await ensureSyncState("imap_smtp");
    const fresh = (await refetch()) ?? syncStates;
    await Promise.all(
      fresh
        .filter((s: SyncState) => s.user_id === userId && s.cron_id)
        .map((s: SyncState) => triggerCron(s.cron_id!)),
    );
  };

  if (gmailLoading || outlookLoading || imapLoading || syncLoading) {
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
        <EmailProviderCard
          name="IMAP / SMTP"
          icon={<IconMail className="h-5 w-5" />}
          description="Any mail server (Gmail app password, Yahoo, Fastmail, self-hosted...)"
          connected={imapConnected}
          syncState={imapSync}
          onConnect={handleConnectImap}
          onDisconnect={disconnectImap}
          onDisableSync={() => imapSync && disableSyncState(imapSync)}
          onSyncNow={triggerSyncNow}
          credentialsForm={imapForm}
          formValues={imapFormValues}
          onFormChange={setImapFormValues}
          onFormSubmit={handleSubmitImap}
          onFormCancel={() => setImapForm(null)}
        />
      </div>

      {hasEmailData && <Separator />}

      {hasEmailData && (
        <Card className="border-destructive/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <IconTrash className="h-4 w-4" />
              Flush email data
            </CardTitle>
            <CardDescription>
              Delete all synced data and start fresh. This cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="text-sm text-muted-foreground space-y-1">
              {emailCount > 0 && <p>{emailCount.toLocaleString()} emails (+ associations & participants)</p>}
              {queueCount > 0 && <p>{queueCount.toLocaleString()} queued imports</p>}
              {syncStates.length > 0 && <p>{syncStates.length} sync state{syncStates.length > 1 ? "s" : ""}</p>}
            </div>
            <Button variant="destructive" className="w-full" onClick={() => setFlushConfirmOpen(true)} disabled={flushing}>
              {flushing ? (
                <><IconLoader2 className="h-4 w-4 mr-2 animate-spin" /> Flushing…</>
              ) : (
                <><IconTrash className="h-4 w-4 mr-2" /> Flush all email data</>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={flushConfirmOpen}
        onOpenChange={setFlushConfirmOpen}
        title="Flush all email data?"
        description="This will permanently delete all synced emails, queued imports, and sync state. You'll need to reconnect and re-sync from scratch."
        confirmLabel="Yes, flush everything"
        onConfirm={runFlush}
        destructive
      />
    </div>
  );
}

function EmailProviderCard({
  name, icon, description, connected, syncState, onConnect, onDisconnect, onDisableSync, onSyncNow,
  credentialsForm, formValues, onFormChange, onFormSubmit, onFormCancel,
}: {
  name: string;
  icon: React.ReactNode;
  description?: string;
  connected: boolean;
  syncState?: SyncState;
  onConnect: () => void;
  onDisconnect: () => Promise<void>;
  onDisableSync: () => void;
  onSyncNow: () => Promise<void>;
  credentialsForm?: Record<string, any> | null;
  formValues?: Record<string, string>;
  onFormChange?: (values: Record<string, string>) => void;
  onFormSubmit?: () => void;
  onFormCancel?: () => void;
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
    const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
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
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {connected && !credentialsForm ? (
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
        ) : credentialsForm && formValues && onFormChange ? (
          <div className="space-y-3">
            {Object.entries((credentialsForm.properties ?? {}) as Record<string, any>).map(([key, def]) => (
              <div key={key} className="space-y-1">
                <Label className="text-xs">{def.label || key}</Label>
                <Input
                  type={def.secret || /password/i.test(key) ? "password" : "text"}
                  placeholder={def.placeholder || ""}
                  value={formValues[key] ?? ""}
                  onChange={(e) => onFormChange({ ...formValues, [key]: e.target.value })}
                />
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <Button onClick={onFormSubmit}>Connect</Button>
              <Button variant="outline" onClick={onFormCancel}>Cancel</Button>
            </div>
          </div>
        ) : (
          <Button onClick={onConnect}>Connect {name}</Button>
        )}
      </CardContent>
    </Card>
  );
}
