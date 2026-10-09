"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  apiRequest,
  logout,
  MeResponse,
} from "@/lib/api";

export default function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();

  const [me, setMe] = useState<MeResponse | null>(null);

  useEffect(() => {
    let active = true;

    apiRequest<MeResponse>("/auth/me")
      .then((data) => {
        if (active) setMe(data);
      })
      .catch(() => {
        if (active) router.replace("/login");
      });

    return () => {
      active = false;
    };
  }, [router]);

  return (
     <div>
      {!me && (
        <p className="p-6">Loading session...</p>
      )}

      {me && (
        <header className="flex flex-wrap items-center justify-between gap-4 border-b p-4">
          <div>
            <h1 className="font-bold">HelpDesk Mini</h1>
            <p className="text-sm">
              {me.business.name} — {me.user.role}
            </p>
          </div>

          <nav className="flex items-center gap-4">
            <Link href="/tickets">Tickets</Link>

            {me.user.role === "admin" && (
              <Link href="/admin/users">Users</Link>
            )}

            <button onClick={logout} className="text-red-500">
              Logout
            </button>
          </nav>
        </header>
      )}

      <main hidden={!me}>
        {children}
      </main>
    </div>
  );
}