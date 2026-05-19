export interface Note {
  id: string;
  title?: string;
  body?: string;
  contact_id?: string;
  company_id?: string;
  deal_id?: string;
  pinned?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  job_title?: string;
  city?: string;
  avatar_url?: string;
  linkedin_url?: string;
  twitter_handle?: string;
  company_id?: string;
  status?: string;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  name: string;
  domain_name?: string;
  industry?: string;
  employees?: number;
  annual_recurring_revenue?: number;
  ideal_customer_profile?: boolean;
  description?: string;
  website?: string;
  phone?: string;
  address?: string;
  linkedin_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Deal {
  id: string;
  title: string;
  value?: number;
  currency?: string;
  probability?: number;
  stage: string;
  source?: string;
  contact_id?: string;
  company_id?: string;
  close_date?: string;
  position?: number;
  created_at: string;
  updated_at: string;
}

export interface DealContact {
  id: string;
  deal_id: string;
  contact_id: string;
  created_at: string;
}

export interface Activity {
  id: string;
  type: string;
  subject: string;
  body?: string;
  contact_id?: string;
  company_id?: string;
  deal_id?: string;
  due_date?: string;
  done?: boolean;
  created_at: string;
  updated_at: string;
}

export interface StoredEmail {
  id: string;
  header_message_id?: string;
  thread_id?: string;
  subject?: string;
  body?: string;
  received_at?: string;
  created_at: string;
}

export interface EmailParticipant {
  id: string;
  email_id: string;
  address: string;
  name?: string;
  role: "from" | "to" | "cc" | "bcc";
  contact_id?: string;
}

export interface List {
  id: string;
  name: string;
  entity_type: "contacts" | "companies" | "deals";
  icon?: string;
  position?: number;
  created_at: string;
  updated_at: string;
}

export interface ListRecord {
  id: string;
  list_id: string;
  contact_id?: string;
  company_id?: string;
  deal_id?: string;
  position?: number;
  created_at: string;
}

export interface Attachment {
  id: string;
  file_id: string;
  filename: string;
  content_type?: string;
  size?: number;
  note_id?: string;
  contact_id?: string;
  company_id?: string;
  deal_id?: string;
  created_at: string;
  updated_at: string;
}

export type MeetingResponseStatus = "needs_action" | "declined" | "tentative" | "accepted";
export type MeetingVisibility = "share_everything" | "metadata";

export interface TimelineMeetingParticipant {
  contactId: string | null;
  firstName: string;
  lastName: string;
  displayName: string;
  avatarUrl: string;
  handle: string;
  responseStatus: MeetingResponseStatus;
  isOrganizer: boolean;
}

export interface TimelineMeeting {
  id: string;
  title: string;
  isFullDay: boolean;
  startsAt: string;
  endsAt: string;
  description: string;
  location: string;
  conferenceSolution: string;
  conferenceLink: { primaryLinkLabel: string; primaryLinkUrl: string };
  participants: TimelineMeetingParticipant[];
  visibility: MeetingVisibility;
  externalCreatedAt: string;
  htmlLink: string;
}

export interface TimelineMeetingsResponse {
  totalNumberOfMeetings: number;
  timelineMeetings: TimelineMeeting[];
}

export interface Favorite {
  id: string;
  entity_type: "contact" | "company" | "deal";
  entity_id: string;
  label?: string;
  position?: number;
  created_at: string;
}
