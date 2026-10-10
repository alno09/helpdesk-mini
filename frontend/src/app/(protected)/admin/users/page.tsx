"use client";

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import { useRouter } from "next/navigation";

import {
  Loader2,
  Plus,
  Search,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { apiRequest, type User } from "@/lib/api";
import { useAuth } from "@/features/auth/auth-context";

type CreatableRole = "agent" | "customer";

interface CreateUserForm {
  name: string;
  email: string;
  password: string;
  role: CreatableRole;
}

const initialForm: CreateUserForm = {
  name: "",
  email: "",
  password: "",
  role: "agent",
};

export default function UsersPage() {
  const router = useRouter();
  const me = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");

  const [form, setForm] = useState<CreateUserForm>(
    initialForm,
  );

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [loadError, setLoadError] = useState("");
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");

  // ==========================================================
  // ROLE GUARD
  // ==========================================================

  useEffect(() => {
    if (me && me.user.role !== "admin") {
      router.replace("/tickets");
    }
  }, [me, router]);

  // ==========================================================
  // LOAD USERS
  // ==========================================================

  useEffect(() => {
    if (!me || me.user.role !== "admin") {
      return;
    }

    let active = true;

    apiRequest<User[]>("/users")
      .then((data) => {
        if (active) {
          setUsers(data);
          setLoadError("");
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setLoadError(
            err instanceof Error
              ? err.message
              : "Failed to load users",
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [me]);

  // ==========================================================
  // FORM HANDLERS
  // ==========================================================

  function updateField(
    field: keyof CreateUserForm,
    value: string,
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (creating || me?.user.role !== "admin") {
      return;
    }

    setCreating(true);
    setFormError("");
    setSuccess("");

    try {
      const createdUser = await apiRequest<User>(
        "/users",
        {
          method: "POST",
          body: JSON.stringify({
            name: form.name.trim(),
            email: form.email.trim(),
            password: form.password,
            role: form.role,
          }),
        },
      );

      setUsers((previous) => [
        createdUser,
        ...previous,
      ]);

      setForm(initialForm);

      setSuccess(
        `${createdUser.name} has been created successfully.`,
      );
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : "Failed to create user",
      );
    } finally {
      setCreating(false);
    }
  }

  // ==========================================================
  // DERIVED DATA
  // ==========================================================

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return users;

    return users.filter((user) =>
      [
        user.name,
        user.email,
        user.role,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [users, search]);

  const agentCount = users.filter(
    (user) => user.role === "agent",
  ).length;

  const customerCount = users.filter(
    (user) => user.role === "customer",
  ).length;

  // ==========================================================
  // PERMISSION CHECK
  // ==========================================================

  if (!me) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (me.user.role !== "admin") {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Redirecting...
      </div>
    );
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* HEADER */}

      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          User management
        </h1>

        <p className="text-sm text-muted-foreground">
          Manage accounts in{" "}
          <span className="font-medium text-foreground">
            {me.business.name}
          </span>
          .
        </p>

        {!loading && !loadError && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-[11px] text-muted-foreground">
            <span>{users.length} users</span>
            <span aria-hidden="true">·</span>
            <span>{agentCount} agents</span>
            <span aria-hidden="true">·</span>
            <span>{customerCount} customers</span>
          </div>
        )}
      </header>

      {/* CONTENT */}

      <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* USER LIST */}

        <section className="min-w-0 overflow-hidden rounded-lg border bg-card">
          <div className="border-b px-5 py-4">
            <h2 className="text-sm font-semibold">
              Business users
            </h2>

            <p className="mt-1 text-xs text-muted-foreground">
              Users registered under this business.
            </p>

            <div className="relative mt-4">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              />

              <Input
                type="search"
                aria-label="Search users"
                placeholder="Search by name, email, or role..."
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                className="h-9 pl-9 text-sm"
              />
            </div>
          </div>

          {/* LOADING */}

          {loading && (
            <div className="space-y-4 p-5">
              {[1, 2, 3, 4].map((item) => (
                <Skeleton
                  key={item}
                  className="h-12 w-full"
                />
              ))}
            </div>
          )}

          {/* ERROR */}

          {!loading && loadError && (
            <p
              role="alert"
              className="px-5 py-6 text-sm text-destructive"
            >
              {loadError}
            </p>
          )}

          {/* EMPTY */}

          {!loading &&
            !loadError &&
            filteredUsers.length === 0 && (
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <Users className="size-6 text-muted-foreground" />

                <p className="mt-3 text-sm font-medium">
                  No users found
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  {search.trim()
                    ? "Try another search keyword."
                    : "No users are available."}
                </p>
              </div>
            )}

          {/* USER TABLE */}

          {!loading &&
            !loadError &&
            filteredUsers.length > 0 && (
              <>
                <div className="hidden overflow-x-auto sm:block">
                  <table className="w-full min-w-[420px] text-left">
                    <thead className="border-b bg-muted/30">
                      <tr className="text-[11px] text-muted-foreground">
                        <th className="px-5 py-3 font-medium">
                          User
                        </th>

                        <th className="px-5 py-3 font-medium">
                          Role
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y">
                      {filteredUsers.map((user) => (
                        <tr
                          key={user.id}
                          className="hover:bg-muted/30"
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex size-8 shrink-0 items-center justify-center rounded-full border bg-muted text-[11px] font-semibold">
                                {user.name
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-xs font-medium">
                                  {user.name}
                                </p>

                                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                                  {user.email}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-3.5">
                            <Badge
                              variant={
                                user.role === "admin"
                                  ? "secondary"
                                  : "outline"
                              }
                              className="capitalize"
                            >
                              {user.role}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* MOBILE */}

                <div className="divide-y sm:hidden">
                  {filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-start justify-between gap-3 px-4 py-4"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-medium">
                          {user.name}
                        </p>

                        <p className="mt-1 break-all text-[11px] text-muted-foreground">
                          {user.email}
                        </p>
                      </div>

                      <Badge
                        variant="outline"
                        className="shrink-0 capitalize"
                      >
                        {user.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              </>
            )}
        </section>

        {/* CREATE USER PANEL */}

        <section className="overflow-hidden rounded-lg border bg-card">
          <div className="border-b px-5 py-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Plus className="size-4" />
              Add new user
            </h2>

            <p className="mt-1 text-xs text-muted-foreground">
              Create an Agent or Customer account.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-5 p-5"
          >
            {/* NAME */}

            <div className="space-y-2">
              <label
                htmlFor="user-name"
                className="text-xs font-medium"
              >
                Full name
              </label>

              <Input
                id="user-name"
                placeholder="Full name"
                value={form.name}
                minLength={2}
                maxLength={150}
                disabled={creating}
                onChange={(event) =>
                  updateField(
                    "name",
                    event.target.value,
                  )
                }
                className="h-9"
                required
              />
            </div>

            {/* EMAIL */}

            <div className="space-y-2">
              <label
                htmlFor="user-email"
                className="text-xs font-medium"
              >
                Email address
              </label>

              <Input
                id="user-email"
                type="email"
                placeholder="user@company.com"
                value={form.email}
                disabled={creating}
                onChange={(event) =>
                  updateField(
                    "email",
                    event.target.value,
                  )
                }
                className="h-9"
                required
              />
            </div>

            {/* PASSWORD */}

            <div className="space-y-2">
              <label
                htmlFor="user-password"
                className="text-xs font-medium"
              >
                Password
              </label>

              <Input
                id="user-password"
                type="password"
                placeholder="Minimum 8 characters"
                autoComplete="new-password"
                value={form.password}
                minLength={8}
                maxLength={128}
                disabled={creating}
                onChange={(event) =>
                  updateField(
                    "password",
                    event.target.value,
                  )
                }
                className="h-9"
                required
              />
            </div>

            {/* ROLE */}

            <div className="space-y-2">
              <label
                htmlFor="user-role"
                className="text-xs font-medium"
              >
                User role
              </label>

              <Select
                value={form.role}
                disabled={creating}
                onValueChange={(value) =>
                  updateField("role", value)
                }
              >
                <SelectTrigger
                  id="user-role"
                  className="w-full"
                >
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="agent">
                    Agent
                  </SelectItem>

                  <SelectItem value="customer">
                    Customer
                  </SelectItem>
                </SelectContent>
              </Select>

              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Agents handle tickets. Customers create
                support requests.
              </p>
            </div>

            {/* FEEDBACK */}

            {formError && (
              <p
                role="alert"
                className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive"
              >
                {formError}
              </p>
            )}

            {success && (
              <p
                role="status"
                className="text-xs text-emerald-700 dark:text-emerald-400"
              >
                {success}
              </p>
            )}

            {/* SUBMIT */}

            <Button
              type="submit"
              size="sm"
              className="w-full"
              disabled={creating}
            >
              {creating ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="size-4" />
                  Create user
                </>
              )}
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}