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
  company_id?: string;
  status?: string;
}

export interface Company {
  id: string;
  name: string;
  industry?: string;
  website?: string;
  phone?: string;
  address?: string;
}

export interface Deal {
  id: string;
  title: string;
  value?: number;
  stage: string;
  contact_id?: string;
  company_id?: string;
  close_date?: string;
}

export interface Activity {
  id: string;
  type: string;
  subject: string;
  body?: string;
  contact_id?: string;
  deal_id?: string;
  due_date?: string;
  done?: boolean;
}

export interface StoredEmail {
  id: string;
  gmail_id: string;
  contact_id: string;
  subject?: string;
  from?: string;
  to?: string;
  date?: string;
  snippet?: string;
  body?: string;
  created_at: string;
}
