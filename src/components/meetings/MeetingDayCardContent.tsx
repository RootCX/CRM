import { Separator } from "@rootcx/ui";
import { cn } from "@/lib/utils";
import { getMeetingStartDate, hasMeetingEnded } from "@/lib/meetings";
import type { TimelineMeeting } from "@/lib/types";
import { MeetingRow } from "./MeetingRow";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function MeetingDayCardContent({
  meetings,
  divider,
  onOpen,
}: {
  meetings: TimelineMeeting[];
  divider?: boolean;
  onOpen: (m: TimelineMeeting) => void;
}) {
  const first = meetings[0];
  if (!first) return null;
  const day = getMeetingStartDate(first);
  const ended = meetings.every(hasMeetingEnded);

  return (
    <>
      <div
        className={cn(
          "flex items-start gap-3 px-3 py-2 transition-colors",
          ended && "bg-muted/30",
        )}
      >
        <div className="text-center w-6 shrink-0">
          <div className="text-[10px] font-semibold uppercase text-muted-foreground">
            {WEEKDAYS[day.getDay()]}
          </div>
          <div className="text-sm font-medium">{String(day.getDate()).padStart(2, "0")}</div>
        </div>
        <div className="flex flex-1 flex-col gap-3 min-w-0">
          {meetings.map((m) => (
            <MeetingRow key={m.id} meeting={m} onOpen={onOpen} />
          ))}
        </div>
      </div>
      {divider && <Separator />}
    </>
  );
}
