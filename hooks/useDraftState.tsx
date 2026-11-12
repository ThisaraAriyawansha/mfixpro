"use client";
import { useEffect, useState, Dispatch, SetStateAction } from "react";
import { useAuth } from "@/hooks/useAuth";

// useState that survives navigating away from the page (and reloads of the
// same browser tab) by mirroring the value to sessionStorage. Use it for
// half-filled forms so switching to another page doesn't wipe the user's work.
//
// Keys are scoped per signed-in user so another login on the same browser
// never inherits someone else's draft. Call clearDraft(scope) after the form
// is successfully submitted.
const PREFIX = "mfixpro.draft.";

function draftKey(uid: string, scope: string, field: string) {
  return `${PREFIX}${uid}.${scope}.${field}`;
}

export function useDraftState<T>(scope: string, field: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const { user } = useAuth();
  const key = user ? draftKey(user.uid, scope, field) : null;
  const [value, setValue] = useState<T>(initial);
  const [restoredKey, setRestoredKey] = useState<string | null>(null);

  // Restore after mount (not in the useState initializer) so server and first
  // client render match and hydration doesn't complain.
  useEffect(() => {
    if (!key) return;
    try {
      const raw = sessionStorage.getItem(key);
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {
      // Corrupt entry or storage blocked — start from the initial value.
    }
    setRestoredKey(key);
  }, [key]);

  useEffect(() => {
    // Only write once this key has been restored, otherwise the initial value
    // would overwrite the saved draft before it is read.
    if (!key || restoredKey !== key) return;
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage full / blocked — the form still works, just isn't saved.
    }
  }, [key, restoredKey, value]);

  return [value, setValue];
}

// Removes every saved field for a form scope (for the current user, or for
// all users when uid is omitted).
export function clearDraft(scope: string, uid?: string) {
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (!k || !k.startsWith(PREFIX)) continue;
      const rest = k.slice(PREFIX.length);
      const matches = uid ? rest.startsWith(`${uid}.${scope}.`) : rest.split(".")[1] === scope;
      if (matches) toRemove.push(k);
    }
    toRemove.forEach((k) => sessionStorage.removeItem(k));
  } catch {
    // ignore
  }
}
