import { Card } from "@rootcx/ui";
import type { TimelineMeeting } from "@/lib/types";
import { MeetingDayCardContent } from "./MeetingDayCardContent";

export function MeetingMonthCard({
  dayTimes,
  meetingsByDayTime,
  onOpen,
}: {
  dayTimes: number[];
  meetingsByDayTime: Record<number, TimelineMeeting[]>;
  onOpen: (m: TimelineMeeting) => void;
}) {
  return (
    <Card className="w-full overflow-hidden">
      {dayTimes.map((dayTime, index) => (
        <MeetingDayCardContent
          key={dayTime}
          meetings={meetingsByDayTime[dayTime] ?? []}
          divider={index < dayTimes.length - 1}
          onOpen={onOpen}
        />
      ))}
    </Card>
  );
}
