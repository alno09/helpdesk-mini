"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Headset,
  Ticket,
  Users,
  LogOut,
  Plus,
  ChevronDown,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

import { logout } from "@/lib/api";
import type { MeResponse } from "@/lib/api";

interface AppSidebarProps {
  me: MeResponse;
}

export function AppSidebar({ me }: AppSidebarProps) {
  const pathname = usePathname();

  const role = me.user.role;

  const isTicketListActive =
    pathname === "/tickets" ||
    (
      pathname.startsWith("/tickets/") &&
      pathname !== "/tickets/new"
    );

  const isCreateTicketActive =
    pathname === "/tickets/new";

  const isUsersActive =
    pathname.startsWith("/admin/users");

  function navClass(active: boolean) {
    return [
      "flex min-h-9 items-center gap-3",
      "rounded-md px-3 py-2",
      "text-[13px] font-medium",
      "transition-colors",
      active
        ? "bg-sidebar-accent text-sidebar-accent-foreground"
        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
    ].join(" ");
  }

  return (
    <aside
      className="
        flex w-full shrink-0 flex-col
        border-b border-sidebar-border
        bg-sidebar text-sidebar-foreground
        md:min-h-screen md:w-60
        md:border-r md:border-b-0
      "
    >
      {/* Workspace Identity */}

      <div className="flex h-16 items-center gap-3 px-4">
        <div
          className="
            flex size-9 shrink-0 items-center justify-center
            rounded-lg bg-sidebar-primary
            text-sidebar-primary-foreground
          "
        >
          <Headset className="size-[18px]" />
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold tracking-tight">
            HelpDesk Mini
          </h1>

          <p className="truncate text-[11px] text-muted-foreground">
            Support workspace
          </p>
        </div>

        <ChevronDown
          className="size-3.5 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
      </div>

      {/* Navigation */}

      <div className="border-t border-sidebar-border px-3 py-4">
        <p
          className="
            mb-2 px-3 text-[10px] font-semibold
            uppercase tracking-[0.12em]
            text-muted-foreground
          "
        >
          Workspace
        </p>

        <nav
          aria-label="Main navigation"
          className="flex flex-wrap gap-1 md:flex-col"
        >
          <Link
            href="/tickets"
            aria-current={
              isTicketListActive ? "page" : undefined
            }
            className={navClass(isTicketListActive)}
          >
            <Ticket className="size-4 shrink-0" />

            <span>Tickets</span>
          </Link>

          {role === "customer" && (
            <Link
              href="/tickets/new"
              aria-current={
                isCreateTicketActive ? "page" : undefined
              }
              className={navClass(isCreateTicketActive)}
            >
              <Plus className="size-4 shrink-0" />

              <span>New Ticket</span>
            </Link>
          )}

          {role === "admin" && (
            <Link
              href="/admin/users"
              aria-current={
                isUsersActive ? "page" : undefined
              }
              className={navClass(isUsersActive)}
            >
              <Users className="size-4 shrink-0" />

              <span>User Management</span>
            </Link>
          )}
        </nav>
      </div>

      {/* Sidebar Footer */}

      <div
        className="
          mt-auto border-t border-sidebar-border
          px-3 py-4
        "
      >
        {/* Appearance */}

        <div className="mb-3 flex items-center justify-between px-2">
          <span className="text-xs text-muted-foreground">
            Appearance
          </span>

          <ThemeToggle />
        </div>

        {/* User Identity */}

        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div
            className="
              flex size-9 shrink-0 items-center justify-center
              rounded-full border border-sidebar-border
              bg-sidebar-accent
              text-xs font-semibold
            "
          >
            {me.user.name.charAt(0).toUpperCase()}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold">
              {me.user.name}
            </p>

            <p className="truncate text-[11px] text-muted-foreground">
              {me.business.name} · {role}
            </p>
          </div>
        </div>

        {/* Logout */}

        <Button
          type="button"
          variant="ghost"
          onClick={logout}
          className="
            mt-2 h-9 w-full justify-start gap-3
            px-3 text-xs font-medium
            text-muted-foreground
            hover:text-foreground
          "
        >
          <LogOut className="size-4" />

          Sign out
        </Button>
      </div>
    </aside>
  );
}