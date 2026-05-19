import type { TimelineMeeting } from "@/lib/types";

export const getMeetingStartDate = (m: Pick<TimelineMeeting, "startsAt">): Date =>
  new Date(m.startsAt);

export const getMeetingEndDate = (m: Pick<TimelineMeeting, "endsAt" | "startsAt">): Date =>
  m.endsAt ? new Date(m.endsAt) : endOfDay(new Date(m.startsAt));

export const hasMeetingEnded = (m: Pick<TimelineMeeting, "endsAt" | "startsAt">): boolean =>
  getMeetingEndDate(m).getTime() < Date.now();

export const isMeetingShared = (m: Pick<TimelineMeeting, "visibility">): boolean =>
  m.visibility === "share_everything";

export const hhmm = (d: Date): string =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

export const startOfDay = (d: Date): Date => {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
};

export const startOfMonth = (d: Date): Date => {
  const r = new Date(d.getFullYear(), d.getMonth(), 1);
  r.setHours(0, 0, 0, 0);
  return r;
};

export const endOfDay = (d: Date): Date => {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
};

export const getYear = (d: Date | number): number => new Date(d).getFullYear();

export function groupBy<T, K extends string | number>(items: T[], key: (item: T) => K): Record<K, T[]> {
  const acc = {} as Record<K, T[]>;
  for (const item of items) {
    const k = key(item);
    (acc[k] ??= []).push(item);
  }
  return acc;
}

export const initials = (firstName: string, lastName: string, fallback: string): string => {
  const fn = (firstName ?? "").trim();
  const ln = (lastName ?? "").trim();
  if (fn || ln) return `${fn.charAt(0)}${ln.charAt(0)}`.toUpperCase();
  return (fallback ?? "?").trim().charAt(0).toUpperCase() || "?";
};

const PALETTE = [
  "bg-rose-200 text-rose-900",
  "bg-orange-200 text-orange-900",
  "bg-amber-200 text-amber-900",
  "bg-emerald-200 text-emerald-900",
  "bg-teal-200 text-teal-900",
  "bg-sky-200 text-sky-900",
  "bg-indigo-200 text-indigo-900",
  "bg-violet-200 text-violet-900",
  "bg-pink-200 text-pink-900",
];

export const avatarColor = (seed: string): string => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
};
