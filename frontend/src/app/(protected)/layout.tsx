"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { apiRequest } from "@/lib/api";
import type { MeResponse } from "@/lib/api";

import { AuthContext } from "@/features/auth/auth-context";
import { AppSidebar } from "@/components/ui/layout/app-sidebar";

import { Skeleton } from "@/components/ui/skeleton";


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
    <AuthContext.Provider value={me}>
      <div className="min-h-screen bg-muted/30 md:flex">
        {me ? (
          <AppSidebar me={me} />
        ) : (
          <aside className="hidden w-64 border-r bg-background p-6 md:block">
            <Skeleton className="mb-8 h-10 w-40" />
            <Skeleton className="mb-3 h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </aside>
        )}

        <main
          hidden={!me}
          className="min-w-0 flex-1 p-4 md:p-8"
        >
          {children}
        </main>
      </div>
    </AuthContext.Provider>
  );
}