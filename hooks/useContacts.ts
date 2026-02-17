"use client";

import { useState, useEffect, useCallback } from "react";
import type { Contact, ContactStatus } from "@/lib/types";

interface UseContactsOptions {
  status?: ContactStatus;
  search?: string;
}

/**
 * Hook to fetch contacts from the API, with optional status/search filters.
 * Re-fetches when filters change.
 */
export function useContacts(options: UseContactsOptions = {}) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (options.status) params.set("status", options.status);
      if (options.search) params.set("search", options.search);

      const res = await fetch(`/api/contacts?${params.toString()}`);
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Failed to load contacts");
      } else {
        setContacts(json.data ?? []);
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [options.status, options.search]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  return { contacts, loading, error, refetch: fetchContacts };
}
