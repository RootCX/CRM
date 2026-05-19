import { useNavigate } from "react-router-dom";
import { IconCheck, IconQuestionMark, IconX } from "@tabler/icons-react";
import { Badge } from "@rootcx/ui";
import { Avatar } from "./Avatar";
import type { TimelineMeetingParticipant } from "@/lib/types";

type Label = "Yes" | "Maybe" | "No";
const ICONS: Record<Label, typeof IconCheck> = { Yes: IconCheck, Maybe: IconQuestionMark, No: IconX };

export function MeetingParticipantsResponseStatusField({
  responseStatus,
  participants,
}: {
  responseStatus: Label;
  participants: TimelineMeetingParticipant[];
}) {
  const navigate = useNavigate();
  const Icon = ICONS[responseStatus];

  const ordered = [
    ...participants.filter((p) => p.contactId),
    ...participants.filter((p) => !p.contactId),
  ];

  return (
    <div className="flex items-center gap-2 py-1">
      <div className="flex items-center gap-1 text-muted-foreground w-[88px] shrink-0 text-sm">
        <Icon className="h-4 w-4" />
        <span>{responseStatus}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {ordered.map((p, i) => (
          <Badge
            key={`${p.handle}-${i}`}
            variant="outline"
            className="gap-1.5 px-1.5 py-0.5 cursor-pointer hover:bg-muted"
            onClick={() => p.contactId && navigate(`/contacts/${p.contactId}`)}
          >
            <Avatar
              firstName={p.firstName}
              lastName={p.lastName}
              displayName={p.displayName}
              avatarUrl={p.avatarUrl}
              seed={p.contactId ?? p.handle}
              size="sm"
            />
            <span className="text-xs">{p.displayName || p.handle}</span>
          </Badge>
        ))}
      </div>
    </div>
  );
}
