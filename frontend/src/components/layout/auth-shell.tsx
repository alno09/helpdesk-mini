import Link from "next/link";
import type { ReactNode } from "react";

import {
  Headset,
  MessageSquareText,
  ShieldCheck,
  Ticket,
} from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";

interface AuthShellProps {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}

export function AuthShell({
  title,
  description,
  children,
  footer,
}: AuthShellProps) {
  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* BRAND PANEL */}

      <aside className="hidden w-[42%] flex-col justify-between border-r border-sidebar-border bg-sidebar px-10 py-9 lg:flex xl:px-16">
        <Link
          href="/login"
          className="inline-flex items-center gap-3 self-start"
        >
          <div className="flex size-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Headset className="size-[18px]" />
          </div>

          <span className="text-sm font-semibold tracking-tight">
            HelpDesk Mini
          </span>
        </Link>

        <div className="max-w-md">
          <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            Customer support workspace
          </p>

          <h2 className="max-w-sm text-3xl font-semibold leading-tight tracking-tight xl:text-4xl">
            Support, without the clutter.
          </h2>

          <p className="mt-5 max-w-sm text-sm leading-7 text-muted-foreground">
            Keep support requests, team assignments, and
            customer conversations in one focused workspace.
          </p>

          <div className="mt-10 space-y-0 border-y border-sidebar-border">
            <div className="flex items-center gap-4 border-b border-sidebar-border py-4">
              <Ticket className="size-4 shrink-0 text-muted-foreground" />

              <div>
                <p className="text-xs font-medium">
                  Organized ticket management
                </p>

                <p className="mt-1 text-[11px] text-muted-foreground">
                  Track requests from open to closed.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 border-b border-sidebar-border py-4">
              <MessageSquareText className="size-4 shrink-0 text-muted-foreground" />

              <div>
                <p className="text-xs font-medium">
                  Real-time conversations
                </p>

                <p className="mt-1 text-[11px] text-muted-foreground">
                  Communicate directly through tickets.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 py-4">
              <ShieldCheck className="size-4 shrink-0 text-muted-foreground" />

              <div>
                <p className="text-xs font-medium">
                  Separate business workspaces
                </p>

                <p className="mt-1 text-[11px] text-muted-foreground">
                  Keep each business&apos;s support data isolated.
                </p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground">
          HelpDesk Mini · Support Management Platform
        </p>
      </aside>

      {/* AUTH CONTENT */}

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between px-6 lg:justify-end lg:px-10">
          <Link
            href="/login"
            className="flex items-center gap-2.5 lg:hidden"
          >
            <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Headset className="size-4" />
            </div>

            <span className="text-sm font-semibold">
              HelpDesk Mini
            </span>
          </Link>

          <ThemeToggle />
        </header>

        <div className="flex flex-1 items-center justify-center px-6 pb-16 pt-8 sm:px-10">
          <div className="w-full max-w-[420px]">
            <div className="mb-8">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Workspace access
              </p>

              <h1 className="text-2xl font-semibold tracking-tight">
                {title}
              </h1>

              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            </div>

            {children}

            <div className="mt-8 border-t pt-6 text-center text-xs text-muted-foreground">
              {footer}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}