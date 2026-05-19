import { useAuth } from "@rootcx/sdk";
import { IconArrowRight } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { getMeetingStartDate, getMeetingEndDate, hasMeetingEnded, hhmm, isMeetingShared } from "@/lib/meetings";
import type { TimelineMeeting } from "@/lib/types";
import { MeetingParticipantsAvatarGroup } from "./MeetingParticipantsAvatarGroup";
import { MeetingNotSharedContent } from "./MeetingNotSharedContent";

export function MeetingRow({
  meeting,
  onOpen,
}: {
  meeting: TimelineMeeting;
  onOpen: (m: TimelineMeeting) => void;
}) {
  const { user } = useAuth();
  const ended = hasMeetingEnded(meeting);
  const shared = isMeetingShared(meeting);

  const startLabel = meeting.isFullDay ? "All day" : hhmm(getMeetingStartDate(meeting));
  const endLabel = meeting.isFullDay ? "" : hhmm(getMeetingEndDate(meeting));

  const isUserAttending = meeting.participants.some(
    (p) => user?.email && p.handle.toLowerCase() === user.email.toLowerCase(),
  );

  return (
    <div
      role="button"
      tabIndex={shared ? 0 : -1}
      onClick={shared ? () => onOpen(meeting) : undefined}
      className={cn(
        "flex items-center gap-3 h-6 relative",
        shared ? "cursor-pointer" : "cursor-not-allowed",
      )}
    >
      <div className={cn("h-full w-1 rounded-sm", isUserAttending ? "bg-rose-300" : "bg-muted")} />
      <div className="flex flex-1 items-center gap-2 min-w-0">
        <div className="flex items-center gap-1 text-xs text-muted-foreground w-[104px] shrink-0">
          {startLabel}
          {endLabel && (
            <>
              <IconArrowRight className="h-3 w-3" />
              {endLabel}
            </>
          )}
        </div>
        {shared ? (
          <div className={cn("flex-1 min-w-0 truncate text-sm", !ended && "text-foreground font-medium")}>
            {meeting.title || "(no title)"}
          </div>
        ) : (
          <MeetingNotSharedContent />
        )}
      </div>
      {!!meeting.participants.length && (
        <MeetingParticipantsAvatarGroup participants={meeting.participants} />
      )}
    </div>
  );
}
