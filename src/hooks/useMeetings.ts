import { useMemo } from "react";
import type { TimelineMeeting } from "@/lib/types";
import { getMeetingStartDate, groupBy, startOfDay, startOfMonth, getYear } from "@/lib/meetings";

export interface MeetingsGrouped {
  meetingsByDayTime: Record<number, TimelineMeeting[]>;
  daysByMonthTime: Record<number, number[]>;
  monthTimes: number[];
  monthTimesByYear: Record<number, number[]>;
}

export const useMeetings = (meetings: TimelineMeeting[]): MeetingsGrouped =>
  useMemo(() => {
    const meetingsByDayTime = groupBy(meetings, (m) => startOfDay(getMeetingStartDate(m)).getTime());
    const sortedDayTimes = Object.keys(meetingsByDayTime).map(Number).sort((a, b) => b - a);
    const daysByMonthTime = groupBy(sortedDayTimes, (t) => startOfMonth(new Date(t)).getTime());
    const sortedMonthTimes = Object.keys(daysByMonthTime).map(Number).sort((a, b) => b - a);
    const monthTimesByYear = groupBy(sortedMonthTimes, getYear);
    return { meetingsByDayTime, daysByMonthTime, monthTimes: sortedMonthTimes, monthTimesByYear };
  }, [meetings]);
