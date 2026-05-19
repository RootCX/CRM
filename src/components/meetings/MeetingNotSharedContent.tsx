import { IconLock } from "@tabler/icons-react";

export function MeetingNotSharedContent() {
  return (
    <div className="flex flex-1 min-w-0 h-6 items-center gap-1 rounded-md border border-border bg-muted/30 px-1 text-sm font-medium text-muted-foreground">
      <IconLock className="h-3.5 w-3.5" />
      <span>Not shared</span>
    </div>
  );
}
