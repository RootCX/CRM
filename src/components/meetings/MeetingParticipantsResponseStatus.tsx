import type { MeetingResponseStatus, TimelineMeetingParticipant } from "@/lib/types";
import { MeetingParticipantsResponseStatusField } from "./MeetingParticipantsResponseStatusField";

type Label = "Yes" | "Maybe" | "No";

const ORDER: Label[] = ["Yes", "Maybe", "No"];

const LABEL_OF: Record<MeetingResponseStatus, Label> = {
  accepted:     "Yes",
  declined:     "No",
  tentative:    "Maybe",
  needs_action: "Maybe",
};

export function MeetingParticipantsResponseStatus({
  participants,
}: {
  participants: TimelineMeetingParticipant[];
}) {
  const grouped: Record<Label, TimelineMeetingParticipant[]> = { Yes: [], Maybe: [], No: [] };
  for (const p of participants) grouped[LABEL_OF[p.responseStatus]].push(p);

  return (
    <div className="flex flex-col gap-1">
      {ORDER.map((label) => (
        <MeetingParticipantsResponseStatusField
          key={label}
          responseStatus={label}
          participants={grouped[label]}
        />
      ))}
    </div>
  );
}
