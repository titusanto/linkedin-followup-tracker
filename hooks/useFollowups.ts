"use client";

import { useState, useEffect } from "react";
import type { Contact } from "@/lib/types";

/**
 * Hook to fetch contacts with due/overdue follow-up dates.
 */
export function useFollowups() {
  const [followups, setFollowups] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/followups");
        const json = await res.json();
        if (!res.ok) {
          setError(json.error ?? "Failed to load follow-ups");
        } else {
          setFollowups(json.data ?? []);
        }
      } catch {
        setError("Network error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return { followups, loading, error };
}
