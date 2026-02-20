import Link from "next/link";
import { ArrowRight, CheckCircle, Zap, Users } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Auto-capture from LinkedIn",
    description:
      "Our Chrome extension silently saves contacts when you connect, follow, or message.",
  },
  {
    icon: Users,
    title: "Organized dashboard",
    description:
      "View all your connections, filter by status, and track follow-up dates in one place.",
  },
  {
    icon: CheckCircle,
    title: "Never miss a follow-up",
    description:
      "Get notified about due and overdue follow-ups. Close more deals by staying consistent.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col">
      {/* Nav */}
      <nav className="border-b border-dashed border-gray-200 dark:border-gray-800 px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#0A66C2] rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">LF</span>
          </div>
          <span className="font-semibold text-gray-900 dark:text-white">
            LinkedFollow
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/auth/login"
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/auth/signup"
            className="text-sm bg-[#0A66C2] text-white px-5 py-2.5 rounded-xl hover:bg-[#004182] transition-colors font-medium"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">
        <span className="text-xs font-medium bg-[#0A66C2]/5 dark:bg-[#0A66C2]/10 text-[#0A66C2] dark:text-blue-400 px-4 py-1.5 rounded-full mb-6 uppercase tracking-wide border border-dashed border-gray-300 dark:border-gray-600">
          LinkedIn CRM for individuals
        </span>
        <h1 className="text-5xl font-bold text-gray-900 dark:text-white max-w-2xl leading-tight mb-6">
          Track every LinkedIn connection automatically
        </h1>
        <p className="text-xl text-gray-500 dark:text-gray-400 max-w-xl mb-10">
          Install the Chrome extension, connect with people on LinkedIn, and
          watch your CRM fill itself. Never lose track of a follow-up again.
        </p>
        <div className="flex gap-4 flex-wrap justify-center">
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 bg-[#0A66C2] text-white px-7 py-3.5 rounded-xl hover:bg-[#004182] transition-colors font-medium"
          >
            Start free <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 border border-dashed border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-7 py-3.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors font-medium"
          >
            View dashboard
          </Link>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mt-24 max-w-4xl w-full text-left">
          {features.map((f) => (
            <div key={f.title} className="p-8 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
              <div className="w-12 h-12 bg-[#0A66C2]/5 dark:bg-[#0A66C2]/10 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl flex items-center justify-center mb-5">
                <f.icon className="w-5 h-5 text-[#0A66C2] dark:text-blue-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{f.description}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="text-center py-8 text-xs text-gray-400 dark:text-gray-600">
        © {new Date().getFullYear()} LinkedFollow. Not affiliated with LinkedIn.
      </footer>
    </div>
  );
}
