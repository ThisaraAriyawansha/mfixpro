"use client";
import { useState } from "react";
import { RefreshCw } from "lucide-react";

// Reloads a page's data straight from Firebase, skipping the shared in-memory
// cache (see SHARED READ CACHE in lib/firestore.ts). Use it to pick up changes
// made on another device before the cache expires.
export default function RefreshButton({
  onRefresh,
  className = "",
  label = "Refresh",
}: {
  onRefresh: () => Promise<unknown> | void;
  className?: string;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onRefresh();
    } catch (err) {
      console.error("Refresh failed", err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      title="Reload the latest data from Firebase"
      className={`nexora-btn nexora-btn-outline text-xs disabled:opacity-60 ${className}`}
    >
      <RefreshCw size={12} className={busy ? "animate-spin" : ""} /> {busy ? "Refreshing…" : label}
    </button>
  );
}
