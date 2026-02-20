import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CopyButton } from "@/components/ui/CopyButton";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Settings</h1>
      <p className="text-sm text-gray-400 dark:text-gray-500 mb-8">
        Copy your User ID and paste it into the Chrome extension to connect.
      </p>

      {/* Primary: User ID — the only thing needed */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-7">
        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
          Your User ID
        </label>
        <div className="flex items-center gap-2 mb-2">
          <code className="flex-1 px-3 py-2.5 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm text-gray-700 dark:text-gray-300 font-mono break-all">
            {user.id}
          </code>
          <CopyButton text={user.id} />
        </div>
        <p className="text-xs text-gray-400">
          This is the <strong>only thing</strong> you need to paste into the extension popup. The API secret and URL are already built in.
        </p>
      </div>

      {/* How-to */}
      <div className="mt-5 p-5 bg-[#0A66C2]/5 dark:bg-[#0A66C2]/10 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
        <p className="text-xs text-[#0A66C2] dark:text-blue-300 font-semibold mb-2">How to connect the extension</p>
        <ol className="text-xs text-[#0A66C2]/80 dark:text-blue-400 space-y-1.5 list-decimal list-inside">
          <li>Click the <strong>Copy</strong> button next to your User ID above</li>
          <li>Click the LinkedFollow icon in your Chrome toolbar</li>
          <li>Click the paste button — it fills automatically</li>
          <li>Click <strong>Connect</strong> — done!</li>
        </ol>
      </div>
    </div>
  );
}
