"use client";

import { useFollowups } from "@/hooks/useFollowups";
import { ContactsTable } from "@/components/dashboard/ContactsTable";
import { Bell } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export default function FollowupsPage() {
  const { followups, loading } = useFollowups();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Follow-ups Due</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Contacts with overdue or today&apos;s follow-up dates
        </p>
      </div>

      {!loading && followups.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="You're all caught up!"
          description="No follow-ups are due today. Set follow-up dates on contacts to see them here."
        />
      ) : (
        <ContactsTable contacts={followups} loading={loading} />
      )}
    </div>
  );
}
