"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import {
  Contact,
  ContactStatus,
  UpdateContactPayload,
} from "@/lib/types";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Calendar,
  Clock,
  MessageSquare,
  UserCheck,
  Eye,
  Reply,
  CheckCircle2,
  ExternalLink,
  Save,
  Loader2,
  Bell,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";

// ─── Status pipeline ──────────────────────────────────────────────────────────
// The linear journey — these always follow in order
const PIPELINE: ContactStatus[] = [
  "Pending",
  "Connected",
  "Messaged",
  "Replied",
  "Meeting Booked",
  "Closed",
];

// Terminal states that fall outside the linear pipeline
const TERMINAL: ContactStatus[] = ["Lost"];

const STEP_CONFIG: Record<
  string,
  { icon: React.ElementType; label: string; color: string; bg: string; muted: string }
> = {
  Pending:        { icon: UserCheck,    label: "Pending",        color: "text-amber-600",  bg: "bg-amber-500",  muted: "bg-amber-100 dark:bg-amber-900/40" },
  Connected:      { icon: CheckCircle2, label: "Connected",      color: "text-green-600",  bg: "bg-green-500",  muted: "bg-green-100 dark:bg-green-900/40" },
  Messaged:       { icon: MessageSquare,label: "Messaged",       color: "text-blue-600",   bg: "bg-blue-500",   muted: "bg-blue-100 dark:bg-blue-900/40" },
  Replied:        { icon: Reply,        label: "They Replied",   color: "text-purple-600", bg: "bg-purple-500", muted: "bg-purple-100 dark:bg-purple-900/40" },
  "Meeting Booked": { icon: Calendar,  label: "Meeting Booked", color: "text-indigo-600", bg: "bg-indigo-500", muted: "bg-indigo-100 dark:bg-indigo-900/40" },
  Closed:         { icon: CheckCircle2, label: "Closed",        color: "text-emerald-600",bg: "bg-emerald-500",muted: "bg-emerald-100 dark:bg-emerald-900/40" },
  Lost:           { icon: UserCheck,    label: "Lost",           color: "text-red-500",    bg: "bg-red-400",    muted: "bg-red-100 dark:bg-red-900/40" },
};

// ─── Timestamp fields tied to each step ──────────────────────────────────────
const STEP_TIMESTAMP: Partial<Record<ContactStatus, keyof Contact>> = {
  Pending:   "connection_sent_at",
  Connected: "connected_at",
  Messaged:  "last_messaged_at",
  Replied:   "last_replied_at",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}
function fmtDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short", day: "numeric", year: "numeric",
  });
}
function daysAgo(iso: string | null) {
  if (!iso) return null;
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d === 0) return "today";
  if (d === 1) return "yesterday";
  return `${d}d ago`;
}

// ─── Status Journey Component ─────────────────────────────────────────────────
function StatusJourney({
  contact,
  status,
  onChange,
}: {
  contact: Contact;
  status: ContactStatus;
  onChange: (s: ContactStatus) => void;
}) {
  const currentIdx = PIPELINE.indexOf(status);
  const isLost = status === "Lost";

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Journey</h2>
        {isLost && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 font-medium">
            Lost
          </span>
        )}
      </div>

      {/* Pipeline steps */}
      <div className="flex items-center gap-0 mb-4 overflow-x-auto pb-1">
        {PIPELINE.map((step, idx) => {
          const cfg = STEP_CONFIG[step];
          const Icon = cfg.icon;
          const isActive = step === status && !isLost;
          const isDone = !isLost && currentIdx > idx;
          const isCurrent = step === status && !isLost;

          // Determine timestamp for this step
          const tsKey = STEP_TIMESTAMP[step];
          const ts = tsKey ? (contact[tsKey] as string | null) : null;

          return (
            <div key={step} className="flex items-center flex-shrink-0">
              {/* Step bubble */}
              <button
                onClick={() => onChange(step)}
                title={`Set status to ${step}`}
                className={`flex flex-col items-center gap-1 px-1 group`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                    isDone
                      ? `${cfg.bg} border-transparent`
                      : isCurrent
                      ? `${cfg.muted} border-current ${cfg.color}`
                      : "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-40"
                  }`}
                >
                  <Icon
                    className={`w-3.5 h-3.5 ${
                      isDone ? "text-white" : isCurrent ? cfg.color : "text-gray-400"
                    }`}
                  />
                </div>
                <span
                  className={`text-[10px] font-medium whitespace-nowrap ${
                    isDone || isCurrent
                      ? "text-gray-700 dark:text-gray-300"
                      : "text-gray-400 opacity-60"
                  }`}
                >
                  {cfg.label}
                </span>
                {ts && isCurrent && (
                  <span className="text-[9px] text-gray-400">{daysAgo(ts)}</span>
                )}
              </button>

              {/* Connector line — not after last */}
              {idx < PIPELINE.length - 1 && (
                <div
                  className={`flex-shrink-0 h-0.5 w-4 mx-0.5 transition-colors ${
                    !isLost && currentIdx > idx
                      ? "bg-green-400"
                      : "bg-gray-200 dark:bg-gray-700"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Quick status buttons (full width, easier to tap) */}
      <div className="flex flex-wrap gap-1.5">
        {([...PIPELINE, ...TERMINAL] as ContactStatus[]).map((s) => {
          const cfg = STEP_CONFIG[s];
          return (
            <button
              key={s}
              onClick={() => onChange(s)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border-2 transition-all ${
                status === s
                  ? `${cfg.muted} ${cfg.color} border-current`
                  : "border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-400"
              }`}
            >
              {s === "Pending" ? "⏳" : s === "Connected" ? "🤝" : s === "Messaged" ? "💬" : s === "Replied" ? "↩️" : s === "Meeting Booked" ? "📅" : s === "Closed" ? "✅" : "❌"}{" "}
              {cfg.label}
            </button>
          );
        })}
      </div>

      {/* Context warning: messaged but not connected */}
      {status === "Messaged" && !contact.connected_at && (
        <div className="mt-3 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
          ⚠️ You messaged this person but they haven&apos;t accepted a connection yet.
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Editable fields
  const [status, setStatus] = useState<ContactStatus>("Pending");
  const [notes, setNotes] = useState("");
  const [nextFollowup, setNextFollowup] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [connectedAt, setConnectedAt] = useState("");
  const [lastMessagedAt, setLastMessagedAt] = useState("");
  const [lastRepliedAt, setLastRepliedAt] = useState("");
  const [viewedProfileAt, setViewedProfileAt] = useState("");

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("id", id)
        .single();
      if (error || !data) {
        toast.error("Contact not found");
        router.push("/dashboard");
        return;
      }
      populate(data as Contact);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function populate(c: Contact) {
    setContact(c);
    setStatus(c.status);
    setNotes(c.notes ?? "");
    setNextFollowup(c.next_followup ?? "");
    setEmail(c.email ?? "");
    setPhone(c.phone ?? "");
    setConnectedAt(c.connected_at ? c.connected_at.slice(0, 16) : "");
    setLastMessagedAt(c.last_messaged_at ? c.last_messaged_at.slice(0, 16) : "");
    setLastRepliedAt(c.last_replied_at ? c.last_replied_at.slice(0, 16) : "");
    setViewedProfileAt(c.viewed_profile_at ? c.viewed_profile_at.slice(0, 16) : "");
  }

  async function handleSave() {
    if (!contact) return;
    setSaving(true);

    const payload: UpdateContactPayload = {
      id: contact.id,
      status,
      notes,
      next_followup: nextFollowup || null,
      email,
      phone,
      connected_at: connectedAt ? new Date(connectedAt).toISOString() : null,
      last_messaged_at: lastMessagedAt ? new Date(lastMessagedAt).toISOString() : null,
      last_replied_at: lastRepliedAt ? new Date(lastRepliedAt).toISOString() : null,
      viewed_profile_at: viewedProfileAt ? new Date(viewedProfileAt).toISOString() : null,
    };

    const res = await fetch("/api/contact/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (json.error) {
      toast.error(json.error);
    } else {
      populate(json.data as Contact);
      toast.success("Saved!");
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!contact) return;
    setDeleting(true);
    const { error } = await supabase
      .from("contacts")
      .delete()
      .eq("id", contact.id);
    if (error) {
      toast.error("Delete failed: " + error.message);
      setDeleting(false);
      setShowDeleteConfirm(false);
    } else {
      toast.success("Contact deleted");
      router.push("/dashboard");
    }
  }

  function suggestFollowup(days: number) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setNextFollowup(d.toISOString().split("T")[0]);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-32">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!contact) return null;

  // Build timeline from non-null timestamps
  const timelineItems = [
    { Icon: UserCheck,    color: "text-amber-500",  label: "Connection request sent", ts: contact.connection_sent_at },
    { Icon: CheckCircle2, color: "text-green-500",  label: "Connection accepted",     ts: contact.connected_at },
    { Icon: MessageSquare,color: "text-blue-500",   label: "You sent a message",      ts: contact.last_messaged_at },
    { Icon: Reply,        color: "text-purple-500", label: "They replied",            ts: contact.last_replied_at },
    { Icon: Eye,          color: "text-orange-500", label: "They viewed your profile",ts: contact.viewed_profile_at },
  ].filter((e) => e.ts !== null);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Back + Delete */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete contact
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Are you sure?</span>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Yes, delete"}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Header card */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 mb-4">
        <div className="flex items-start gap-4">
          {contact.profile_image ? (
            <Image
              src={contact.profile_image}
              alt={contact.name}
              width={64}
              height={64}
              className="w-16 h-16 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
              <span className="text-blue-700 dark:text-blue-300 font-bold text-xl">
                {contact.name.charAt(0)}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{contact.name}</h1>
            {contact.role && (
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-0.5">{contact.role}</p>
            )}
            {contact.company && (
              <div className="flex items-center gap-1.5 mt-1">
                <Building2 className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-sm text-gray-500 dark:text-gray-400">{contact.company}</span>
              </div>
            )}
            {contact.location && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-sm text-gray-500 dark:text-gray-400">{contact.location}</span>
              </div>
            )}
            <a
              href={contact.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-xs text-blue-600 hover:underline"
            >
              View LinkedIn profile <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Status journey */}
      <StatusJourney
        contact={contact}
        status={status}
        onChange={setStatus}
      />

      {/* Activity Timeline */}
      {timelineItems.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 mb-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Activity</h2>
          <div className="space-y-3">
            {timelineItems.map((e, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={`mt-0.5 flex-shrink-0 ${e.color}`}>
                  <e.Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm text-gray-800 dark:text-gray-200">{e.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {fmt(e.ts)} · {daysAgo(e.ts)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit form */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 space-y-5">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Details</h2>

        {/* Timestamps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              <CheckCircle2 className="w-3 h-3 inline mr-1 text-green-500" />
              Connected at
            </label>
            <input type="datetime-local" value={connectedAt}
              onChange={(e) => setConnectedAt(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              <MessageSquare className="w-3 h-3 inline mr-1 text-blue-500" />
              Last messaged
            </label>
            <input type="datetime-local" value={lastMessagedAt}
              onChange={(e) => setLastMessagedAt(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              <Reply className="w-3 h-3 inline mr-1 text-purple-500" />
              They replied
            </label>
            <input type="datetime-local" value={lastRepliedAt}
              onChange={(e) => setLastRepliedAt(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              <Eye className="w-3 h-3 inline mr-1 text-orange-500" />
              Viewed your profile
            </label>
            <input type="datetime-local" value={viewedProfileAt}
              onChange={(e) => setViewedProfileAt(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
          </div>
        </div>

        {/* Follow-up date */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">
            <Bell className="w-3 h-3 inline mr-1 text-blue-500" />
            Next follow-up
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="date"
              value={nextFollowup}
              onChange={(e) => setNextFollowup(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
            <span className="text-xs text-gray-400">or:</span>
            {[1, 2, 3, 5, 7].map((d) => (
              <button key={d} onClick={() => suggestFollowup(d)}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition-colors">
                +{d}d
              </button>
            ))}
          </div>
          {nextFollowup && (
            <div className="mt-2 flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 px-3 py-2 rounded-xl">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span>Follow-up on <strong>{fmtDate(nextFollowup)}</strong></span>
            </div>
          )}
        </div>

        {/* Contact info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="their@email.com"
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 234 567 8900"
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400" />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Add notes about this contact, conversation details, context..."
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 resize-none"
          />
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl text-sm transition-colors disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>

        {/* Meta */}
        <div className="flex items-center gap-2 text-xs text-gray-400 pt-1">
          <Calendar className="w-3 h-3" />
          <span>Added {fmtDate(contact.created_at)} · Updated {fmtDate(contact.updated_at)}</span>
        </div>
      </div>
    </div>
  );
}
