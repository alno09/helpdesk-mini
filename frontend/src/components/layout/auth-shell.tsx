import Link from "next/link";
import type { ReactNode } from "react";

import {
  Headset,
  ShieldCheck,
  MessagesSquare,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* BRANDING PANEL */}

      <aside className="hidden flex-col justify-between bg-zinc-950 p-12 text-white lg:flex">
        <Link
          href="/login"
          className="flex items-center gap-3"
        >
          <div className="flex size-11 items-center justify-center rounded-xl bg-white text-zinc-950">
            <Headset size={23} />
          </div>

          <span className="text-xl font-bold tracking-tight">
            HelpDesk Mini
          </span>
        </Link>

        <div className="max-w-lg space-y-7">
          <div className="flex size-16 items-center justify-center rounded-2xl border border-white/20 bg-white/10">
            <MessagesSquare size={32} />
          </div>

          <div className="space-y-4">
            <h1 className="text-5xl leading-tight font-semibold tracking-tight">
              Better conversations.
              <br />
              Better support.
            </h1>

            <p className="text-lg leading-relaxed text-zinc-400">
              A shared workspace for businesses to
              manage support tickets and communicate
              with customers in real time.
            </p>
          </div>

          <div className="flex items-center gap-3 text-sm text-zinc-400">
            <ShieldCheck size={19} />
            <span>
              Dedicated workspace for every business
            </span>
          </div>
        </div>

        <p className="text-sm text-zinc-500">
          HelpDesk Mini — Support Management Platform
        </p>
      </aside>

      {/* FORM PANEL */}

      <main className="flex min-h-screen items-center justify-center bg-muted/30 px-5 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Headset size={22} />
            </div>

            <span className="text-xl font-bold">
              HelpDesk Mini
            </span>
          </div>

          <Card className="shadow-sm">
            <CardHeader className="space-y-2 pb-6">
              <CardTitle className="text-2xl tracking-tight">
                {title}
              </CardTitle>

              <CardDescription>
                {description}
              </CardDescription>
            </CardHeader>

            <CardContent>{children}</CardContent>
          </Card>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {footer}
          </div>
        </div>
      </main>
    </div>
  );
}