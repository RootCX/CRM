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

export interface Favorite {
  id: string;
  entity_type: "contact" | "company" | "deal";
  entity_id: string;
  label?: string;
  position?: number;
  created_at: string;
}
