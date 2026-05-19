import { useEffect, useRef, useState } from "react";
import { useRuntimeClient } from "@rootcx/sdk";
import { Button, EmptyState, LoadingState } from "@rootcx/ui";
import { IconCalendarEvent } from "@tabler/icons-react";
import { APP_ID } from "@/lib/constants";
import type { TimelineMeeting, TimelineMeetingsResponse } from "@/lib/types";
import { useMeetings } from "@/hooks/useMeetings";
import { getYear } from "@/lib/meetings";
import { MeetingMonthCard } from "./MeetingMonthCard";
import { MeetingDetailsDialog } from "./MeetingDetailsDialog";

const PAGE_SIZE = 20;
const MONTH_LABELS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

type SourceKind = "contact" | "company" | "deal";
type Source = { kind: SourceKind; id: string };

const SOURCE: Record<SourceKind, { rpc: string; param: string }> = {
  contact: { rpc: "get_timeline_meetings_from_contact_id", param: "contact_id" },
  company: { rpc: "get_timeline_meetings_from_company_id", param: "company_id" },
  deal:    { rpc: "get_timeline_meetings_from_deal_id",    param: "deal_id" },
};

export function MeetingsCard({ source }: { source: Source }) {
  const client = useRuntimeClient();
  const [meetings, setMeetings] = useState<TimelineMeeting[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selected, setSelected] = useState<TimelineMeeting | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchPage = async (nextPage: number, replace: boolean) => {
    const setBusy = replace ? setLoading : setLoadingMore;
    setBusy(true);
    try {
      const cfg = SOURCE[source.kind];
      const res = await client.rpc(APP_ID, cfg.rpc, {
        [cfg.param]: source.id,
        page: nextPage,
        pageSize: PAGE_SIZE,
      }) as TimelineMeetingsResponse;
      setTotal(res.totalNumberOfMeetings ?? 0);
      setMeetings(prev => replace ? (res.timelineMeetings ?? []) : [...prev, ...(res.timelineMeetings ?? [])]);
      setPage(nextPage);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    setMeetings([]);
    setPage(1);
    fetchPage(1, true);
  }, [source.kind, source.id]);

  const hasMore = meetings.length < total;

  useEffect(() => {
    if (!hasMore || loading || loadingMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) fetchPage(page + 1, false); },
      { threshold: 0.1 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loading, loadingMore, page]);

  const { meetingsByDayTime, daysByMonthTime, monthTimes, monthTimesByYear } = useMeetings(meetings);

  if (loading) return <LoadingState variant="skeleton" />;
  if (!meetings.length) {
    return (
      <EmptyState
        icon={<IconCalendarEvent className="h-8 w-8" />}
        title="No Events"
        description={`No events have been scheduled with this ${source.kind} yet.`}
      />
    );
  }

  return (
    <>
      <div className="flex flex-col gap-6 overflow-auto p-2">
        {monthTimes.map((monthTime) => {
          const monthDayTimes = daysByMonthTime[monthTime] ?? [];
          const year = getYear(monthTime);
          const yearMonths = monthTimesByYear[year] ?? [];
          const isLastMonthOfYear = yearMonths[0] === monthTime;
          const date = new Date(monthTime);
          const monthLabel = MONTH_LABELS[date.getMonth()];

          return (
            <section key={monthTime}>
              <h3 className="mb-2 text-sm font-semibold">
                {monthLabel}
                {isLastMonthOfYear && <span className="text-muted-foreground"> {year}</span>}
              </h3>
              <MeetingMonthCard
                dayTimes={monthDayTimes}
                meetingsByDayTime={meetingsByDayTime}
                onOpen={setSelected}
              />
            </section>
          );
        })}

        {hasMore && (
          <div ref={sentinelRef} className="flex justify-center py-3">
            {loadingMore ? (
              <span className="text-xs text-muted-foreground">Loading…</span>
            ) : (
              <Button variant="outline" size="sm" onClick={() => fetchPage(page + 1, false)}>
                Load more
              </Button>
            )}
          </div>
        )}
      </div>

      <MeetingDetailsDialog
        meeting={selected}
        open={!!selected}
        onOpenChange={(o) => { if (!o) setSelected(null); }}
      />
    </>
  );
}
