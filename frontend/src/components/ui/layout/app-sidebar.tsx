"use client";

import Link from "next/link";

import {
  Headset,
  Ticket,
  Users,
  LogOut,
  Plus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import { logout } from "@/lib/api";
import type { MeResponse } from "@/lib/api";


interface AppSidebarProps {
  me: MeResponse;
}

export function AppSidebar({ me }: AppSidebarProps) {
  const role = me.user.role;

  return (
    <aside className="flex w-full shrink-0 flex-col border-b bg-background md:min-h-screen md:w-64 md:border-r md:border-b-0">
      <div className="flex items-center gap-3 p-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Headset size={22} />
        </div>

        <div>
          <h1 className="font-bold tracking-tight">
            HelpDesk Mini
          </h1>
          <p className="text-xs text-muted-foreground">
            Support Workspace
          </p>
        </div>
      </div>

      <Separator />

      <div className="px-5 py-5">
        <p className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Workspace
        </p>

        <nav className="flex flex-wrap gap-2 md:flex-col">
          <Button
            variant="ghost"
            className="justify-start"
            asChild
          >
            <Link href="/tickets">
              <Ticket size={17} />
              Tickets
            </Link>
          </Button>

          {role === "customer" && (
            <Button
              variant="ghost"
              className="justify-start"
              asChild
            >
              <Link href="/tickets/new">
                <Plus size={17} />
                Create Ticket
              </Link>
            </Button>
          )}

          {role === "admin" && (
            <Button
              variant="ghost"
              className="justify-start"
              asChild
            >
              <Link href="/admin/users">
                <Users size={17} />
                User Management
              </Link>
            </Button>
          )}
        </nav>
      </div>

      <div className="mt-auto border-t p-5">
        <p className="truncate text-sm font-semibold">
          {me.user.name}
        </p>

        <p className="truncate text-xs text-muted-foreground">
          {me.business.name}
        </p>

        <p className="mt-1 text-xs capitalize text-muted-foreground">
          {role}
        </p>

        <Button
          variant="outline"
          className="mt-4 w-full justify-start"
          onClick={logout}
        >
          <LogOut size={16} />
          Logout
        </Button>
      </div>
    </aside>
  );
}