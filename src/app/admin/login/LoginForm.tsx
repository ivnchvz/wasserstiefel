"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      // Refresh so /admin is rendered again with the new session, not from cache.
      router.replace("/admin");
      router.refresh();
      return;
    }
    setError((await res.json().catch(() => ({}))).error ?? "could not log in");
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <input
        type="password"
        autoComplete="current-password"
        autoFocus
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="password"
        className="border border-rule bg-transparent px-3 py-2 text-[13px] outline-none placeholder:text-ink-soft focus:border-ink"
      />
      <button
        type="submit"
        disabled={busy || !password}
        className="cursor-pointer self-start border border-rule px-4 py-2 text-[10px] tracking-[0.16em] text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:cursor-default disabled:opacity-40"
      >
        {busy ? "checking…" : "log in"}
      </button>
      {error && <p className="text-[11px] text-ink">{error}</p>}
    </form>
  );
}
