import type { Contact, ContactStatus } from "@/lib/types";

interface StatsBarProps {
  contacts: Contact[];
}

const statuses: { label: string; status: ContactStatus; color: string }[] = [
  { label: "Connected", status: "Connected", color: "text-[#0A66C2] dark:text-blue-400" },
  { label: "Messaged", status: "Messaged", color: "text-yellow-600 dark:text-yellow-400" },
  { label: "Replied", status: "Replied", color: "text-purple-600 dark:text-purple-400" },
  { label: "Meetings", status: "Meeting Booked", color: "text-green-600 dark:text-green-400" },
  { label: "Closed", status: "Closed", color: "text-emerald-600 dark:text-emerald-400" },
];

export function StatsBar({ contacts }: StatsBarProps) {
  const counts = statuses.map((s) => ({
    ...s,
    count: contacts.filter((c) => c.status === s.status).length,
  }));

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
      {counts.map((s) => (
        <div
          key={s.status}
          className="bg-white dark:bg-gray-900 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-5"
        >
          <div className={`text-2xl font-bold ${s.color}`}>{s.count}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">{s.label}</div>
        </div>
      ))}
    </div>
  );
}
