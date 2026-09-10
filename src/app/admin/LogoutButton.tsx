"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await fetch("/api/admin/logout", { method: "POST" });
        router.replace("/admin/login");
        router.refresh();
      }}
      className="cursor-pointer text-[10px] tracking-[0.14em] text-ink-soft hover:text-ink hover:underline"
    >
      log out
    </button>
  );
}
