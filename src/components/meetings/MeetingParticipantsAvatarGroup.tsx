import type { TimelineMeetingParticipant } from "@/lib/types";
import { Avatar } from "./Avatar";

const MAX_VISIBLE = 3;

export function MeetingParticipantsAvatarGroup({ participants }: { participants: TimelineMeetingParticipant[] }) {
  const visible = participants.slice(0, MAX_VISIBLE);
  const overflow = participants.length - visible.length;

  return (
    <div className="flex -space-x-1.5">
      {visible.map((p, i) => (
        <Avatar
          key={`${p.handle}-${i}`}
          firstName={p.firstName}
          lastName={p.lastName}
          displayName={p.displayName}
          avatarUrl={p.avatarUrl}
          seed={p.contactId ?? p.handle}
          size="sm"
        />
      ))}
      {overflow > 0 && (
        <div className="flex h-5 w-5 items-center justify-center rounded-md bg-muted text-[10px] font-semibold ring-1 ring-background text-muted-foreground">
          +{overflow}
        </div>
      )}
    </div>
  );
}
