"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { isOverdue, isDueToday } from "@/lib/utils";
import type { Contact } from "@/lib/types";
import { Users, ExternalLink, Check, AlertCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface ContactsTableProps {
  contacts: Contact[];
  loading?: boolean;
}

// ── Pipeline tick cell ────────────────────────────────────────────────────────
// done   = solid LinkedIn blue circle with white tick
// active = not done (dashed border circle with small dot)
function Tick({ done, label }: { done: boolean; label?: string }) {
  return (
    <div title={label} className="flex items-center justify-center">
      {done ? (
        <div className="w-7 h-7 rounded-full bg-[#0A66C2] flex items-center justify-center">
          <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />
        </div>
      ) : (
        <div className="w-7 h-7 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600" />
        </div>
      )}
    </div>
  );
}

// ── Follow-up countdown ───────────────────────────────────────────────────────
function FollowUpCell({ dateStr }: { dateStr: string | null }) {
  if (!dateStr) {
    return <span className="text-gray-300 dark:text-gray-700 text-xs">—</span>;
  }

  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  const diffMs = date.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / 86400000);

  const overdue = isOverdue(dateStr) && !isDueToday(dateStr);
  const dueToday = isDueToday(dateStr);

  let label: string;
  let colorClass: string;

  if (overdue) {
    label = `${Math.abs(diffDays)}d overdue`;
    colorClass = "text-red-600 dark:text-red-400 font-semibold";
  } else if (dueToday) {
    label = "Today";
    colorClass = "text-yellow-600 dark:text-yellow-400 font-semibold";
  } else if (diffDays === 1) {
    label = "Tomorrow";
    colorClass = "text-amber-600 dark:text-amber-400";
  } else {
    label = `${diffDays}d`;
    colorClass = "text-gray-500 dark:text-gray-400";
  }

  return (
    <div className="flex items-center gap-1">
      {(overdue || dueToday) && (
        <AlertCircle
          className={cn(
            "w-3 h-3 flex-shrink-0",
            overdue ? "text-red-500" : "text-yellow-500"
          )}
        />
      )}
      {!overdue && !dueToday && (
        <Clock className="w-3 h-3 text-gray-400 flex-shrink-0" />
      )}
      <span className={cn("text-xs whitespace-nowrap", colorClass)}>{label}</span>
    </div>
  );
}

export function ContactsTable({ contacts, loading }: ContactsTableProps) {
  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 bg-gray-50 dark:bg-gray-800 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl" />
        ))}
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No contacts yet"
        description="Install the Chrome extension and connect with people on LinkedIn to get started."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/80">
            {/* Contact — wide */}
            <th className="text-left px-5 py-4 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
              Contact
            </th>
            {/* Pipeline columns — centered, equal width */}
            <th className="px-4 py-4 font-medium text-gray-500 dark:text-gray-400 text-center whitespace-nowrap text-xs">
              Requested
            </th>
            <th className="px-4 py-4 font-medium text-gray-500 dark:text-gray-400 text-center whitespace-nowrap text-xs">
              Connected
            </th>
            <th className="px-4 py-4 font-medium text-gray-500 dark:text-gray-400 text-center whitespace-nowrap text-xs">
              Messaged
            </th>
            <th className="px-4 py-4 font-medium text-gray-500 dark:text-gray-400 text-center whitespace-nowrap text-xs">
              Replied
            </th>
            {/* Follow-up */}
            <th className="px-4 py-4 font-medium text-gray-500 dark:text-gray-400 text-center whitespace-nowrap text-xs">
              Follow-up
            </th>
          </tr>
        </thead>
        <tbody>
          {contacts.map((contact) => {
            // Pipeline booleans
            const requested  = !!contact.connection_sent_at || contact.status !== "Pending";
            const connected  = !!contact.connected_at || ["Connected","Messaged","Replied","Meeting Booked","Closed"].includes(contact.status);
            const messaged   = !!contact.last_messaged_at || ["Messaged","Replied","Meeting Booked","Closed"].includes(contact.status);
            const replied    = !!contact.last_replied_at || ["Replied","Meeting Booked","Closed"].includes(contact.status);

            return (
              <tr
                key={contact.id}
                className="border-b border-dashed border-gray-100 dark:border-gray-800/60 hover:bg-[#0A66C2]/5 dark:hover:bg-gray-800/40 transition-colors"
              >
                {/* Contact */}
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={contact.name} src={contact.profile_image} size="sm" />
                    <div className="min-w-0">
                      <Link
                        href={`/contacts/${contact.id}`}
                        className="font-medium text-gray-900 dark:text-white hover:text-[#0A66C2] dark:hover:text-blue-400 transition-colors block truncate max-w-[140px]"
                      >
                        {contact.name}
                      </Link>
                      <div className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[140px]">
                        {contact.role
                          ? contact.role.length > 30
                            ? contact.role.slice(0, 30) + "…"
                            : contact.role
                          : contact.company
                          ? contact.company
                          : <span className="text-gray-300 dark:text-gray-700">No role</span>
                        }
                      </div>
                    </div>
                    <a
                      href={contact.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-300 hover:text-[#0A66C2] dark:text-gray-700 dark:hover:text-blue-400 flex-shrink-0"
                      title="Open LinkedIn"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </td>

                {/* Requested */}
                <td className="px-4 py-4 text-center">
                  <div className="flex justify-center">
                    <Tick done={requested} label={contact.connection_sent_at ? `Sent ${new Date(contact.connection_sent_at).toLocaleDateString()}` : requested ? "Connection requested" : "Not sent"} />
                  </div>
                </td>

                {/* Connected */}
                <td className="px-4 py-4 text-center">
                  <div className="flex justify-center">
                    <Tick done={connected} label={contact.connected_at ? `Connected ${new Date(contact.connected_at).toLocaleDateString()}` : connected ? "Connected" : "Not connected"} />
                  </div>
                </td>

                {/* Messaged */}
                <td className="px-4 py-4 text-center">
                  <div className="flex justify-center">
                    <Tick done={messaged} label={contact.last_messaged_at ? `Messaged ${new Date(contact.last_messaged_at).toLocaleDateString()}` : messaged ? "Messaged" : "Not messaged"} />
                  </div>
                </td>

                {/* Replied */}
                <td className="px-4 py-4 text-center">
                  <div className="flex justify-center">
                    <Tick done={replied} label={contact.last_replied_at ? `Replied ${new Date(contact.last_replied_at).toLocaleDateString()}` : replied ? "Replied" : "No reply"} />
                  </div>
                </td>

                {/* Follow-up */}
                <td className="px-4 py-4 text-center">
                  <div className="flex justify-center">
                    <FollowUpCell dateStr={contact.next_followup} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
