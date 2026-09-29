"use client";
import { useCallback, useEffect, useState } from "react";
import { searchCustomers } from "@/lib/firestore";
import type { Customer } from "@/types";

// Debounced server-side customer search — pickers query Firestore as the user
// types instead of loading the whole customer list up front.
export function useCustomerSearch(term: string, max = 8) {
  const [results, setResults] = useState<Customer[]>([]);
  const [searching, setSearching] = useState(false);
  // Bumped by refresh() to re-run the same search after an add/edit.
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const t = term.trim();
    if (t.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(() => {
      searchCustomers(t, max)
        .then((r) => { if (!cancelled) setResults(r as Customer[]); })
        .catch(() => { if (!cancelled) setResults([]); })
        .finally(() => { if (!cancelled) setSearching(false); });
    }, 350);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [term, max, version]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  return { results, searching, refresh };
}
