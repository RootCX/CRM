import { Dialog, DialogContent, DialogHeader, DialogTitle, Badge, Separator } from "@rootcx/ui";
import { IconCalendarEvent, IconClock, IconMapPin, IconNotes, IconVideo, IconExternalLink } from "@tabler/icons-react";
import { getMeetingStartDate, getMeetingEndDate, hhmm, isMeetingShared } from "@/lib/meetings";
import type { TimelineMeeting } from "@/lib/types";
import { MeetingParticipantsResponseStatus } from "./MeetingParticipantsResponseStatus";

const relative = (iso: string) => {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / 86_400_000);
  if (days < 1)  return "today";
  if (days < 2)  return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months > 1 ? "s" : ""} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years > 1 ? "s" : ""} ago`;
};

const formatRange = (m: TimelineMeeting) => {
  if (m.isFullDay) return `${m.startsAt.slice(0, 10)} (All day)`;
  const s = getMeetingStartDate(m);
  const e = getMeetingEndDate(m);
  const date = s.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  return `${date} · ${hhmm(s)} → ${hhmm(e)}`;
};

export function MeetingDetailsDialog({
  meeting,
  open,
  onOpenChange,
}: {
  meeting: TimelineMeeting | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  if (!meeting) return null;
  const shared = isMeetingShared(meeting);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <Badge variant="outline" className="w-fit gap-1.5">
            <IconCalendarEvent className="h-3.5 w-3.5" />
            Event
          </Badge>
          <DialogTitle className="text-xl mt-2">
            {shared ? (meeting.title || "(no title)") : "Not shared"}
          </DialogTitle>
          {meeting.externalCreatedAt && (
            <p className="text-xs text-muted-foreground">Created {relative(meeting.externalCreatedAt)}</p>
          )}
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Field icon={<IconClock className="h-4 w-4" />} label="When">
            <span className="text-sm">{formatRange(meeting)}</span>
          </Field>

          {meeting.participants.length > 0 && (
            <>
              <Separator />
              <MeetingParticipantsResponseStatus participants={meeting.participants} />
              <Separator />
            </>
          )}

          {shared && meeting.conferenceLink.primaryLinkUrl && (
            <Field icon={<IconVideo className="h-4 w-4" />} label="Conference">
              <a
                href={meeting.conferenceLink.primaryLinkUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-primary underline truncate"
              >
                {meeting.conferenceLink.primaryLinkLabel || meeting.conferenceLink.primaryLinkUrl}
              </a>
            </Field>
          )}

          {shared && meeting.location && (
            <Field icon={<IconMapPin className="h-4 w-4" />} label="Location">
              <span className="text-sm">{meeting.location}</span>
            </Field>
          )}

          {shared && meeting.description && (
            <Field icon={<IconNotes className="h-4 w-4" />} label="Description">
              <p className="text-sm whitespace-pre-wrap break-words">{meeting.description}</p>
            </Field>
          )}

          {meeting.htmlLink && (
            <div className="flex justify-end pt-2">
              <a
                href={meeting.htmlLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
              >
                <IconExternalLink className="h-3.5 w-3.5" />
                Open in Google Calendar
              </a>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex items-center gap-1.5 w-[88px] shrink-0 text-sm text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
