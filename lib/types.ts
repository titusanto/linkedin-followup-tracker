/**
 * Shared TypeScript types used across the app and API.
 */

export type ContactStatus =
  | "Pending"
  | "Connected"
  | "Messaged"
  | "Replied"
  | "Meeting Booked"
  | "Closed"
  | "Lost";

export const CONTACT_STATUSES: ContactStatus[] = [
  "Pending",
  "Connected",
  "Messaged",
  "Replied",
  "Meeting Booked",
  "Closed",
  "Lost",
];

export const STATUS_COLORS: Record<ContactStatus, string> = {
  Pending:  "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  Connected: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  Messaged: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  Replied:  "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  "Meeting Booked": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  Closed:   "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  Lost:     "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export const STATUS_LABELS: Record<ContactStatus, string> = {
  Pending:  "⏳ Pending",
  Connected: "🤝 Connected",
  Messaged: "💬 Messaged",
  Replied:  "↩️ Replied",
  "Meeting Booked": "📅 Meeting Booked",
  Closed:   "✅ Closed",
  Lost:     "❌ Lost",
};

export interface Contact {
  id: string;
  user_id: string;
  name: string;
  linkedin_url: string;
  company: string | null;
  role: string | null;
  location: string | null;
  profile_image: string | null;
  email: string | null;
  phone: string | null;
  status: ContactStatus;
  connection_sent_at: string | null;
  connected_at: string | null;
  last_messaged_at: string | null;
  last_replied_at: string | null;
  viewed_profile_at: string | null;
  notes: string | null;
  next_followup: string | null;
  auto_followup_days: number;
  created_at: string;
  updated_at: string;
}

export interface SaveContactPayload {
  name: string;
  linkedin_url: string;
  company?: string;
  role?: string;
  location?: string;
  profile_image?: string;
  email?: string;
  phone?: string;
  status?: ContactStatus;
  connection_sent_at?: string;
  last_messaged_at?: string;
  last_replied_at?: string;
}

export interface UpdateContactPayload {
  id: string;
  status?: ContactStatus;
  notes?: string;
  next_followup?: string | null;
  email?: string;
  phone?: string;
  company?: string;
  role?: string;
  connected_at?: string | null;
  last_messaged_at?: string | null;
  last_replied_at?: string | null;
  viewed_profile_at?: string | null;
  auto_followup_days?: number;
}

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
}
