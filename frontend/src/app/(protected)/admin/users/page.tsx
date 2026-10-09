"use client";

import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import { useRouter } from "next/navigation";

import {
  Loader2,
  Plus,
  UserRound,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
  const [form, setForm] = useState<CreateUserForm>(
    initialForm,
  );

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [loadError, setLoadError] = useState("");
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");

  // ==================================================
  // ROLE GUARD
  // ==================================================

  useEffect(() => {
    if (me && me.user.role !== "admin") {
      router.replace("/tickets");
    }
  }, [me, router]);

  // ==================================================
  // LOAD BUSINESS USERS
  // ==================================================

  useEffect(() => {
    if (!me || me.user.role !== "admin") {
      return;
    }

    let active = true;

    apiRequest<User[]>("/users")
      .then((data) => {
        if (active) {
          setUsers(data);
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

  // ==================================================
  // FORM HANDLERS
  // ==================================================

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

  // ==================================================
  // PERMISSION CHECK
  // ==================================================

  if (!me) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-80 w-full" />
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

  // ==================================================
  // STATISTICS
  // ==================================================

  const agentCount = users.filter(
    (user) => user.role === "agent",
  ).length;

  const customerCount = users.filter(
    (user) => user.role === "customer",
  ).length;

  // ==================================================
  // RENDER
  // ==================================================

  return (
    <div className="mx-auto max-w-7xl space-y-6">

      {/* HEADER */}

      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          User Management
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          Manage team members and customers in{" "}
          <span className="font-medium">
            {me.business.name}
          </span>
          .
        </p>
      </div>

      {/* STATISTICS */}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Total Users
              </p>

              <p className="mt-2 text-3xl font-bold">
                {loading ? "..." : users.length}
              </p>
            </div>

            <Users
              size={25}
              className="text-muted-foreground"
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Agents
            </p>

            <p className="mt-2 text-3xl font-bold">
              {loading ? "..." : agentCount}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Customers
            </p>

            <p className="mt-2 text-3xl font-bold">
              {loading ? "..." : customerCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* MAIN CONTENT */}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">

        {/* USER LIST */}

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Business Users</CardTitle>

            <CardDescription>
              All users registered under this business.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((item) => (
                  <Skeleton
                    key={item}
                    className="h-20 w-full"
                  />
                ))}
              </div>
            ) : loadError ? (
              <p
                role="alert"
                className="text-sm text-destructive"
              >
                {loadError}
              </p>
            ) : users.length === 0 ? (
              <div className="py-12 text-center">
                <Users
                  size={36}
                  className="mx-auto mb-4 text-muted-foreground"
                />

                <p className="font-medium">
                  No users found
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
                        <UserRound
                          size={19}
                          className="text-muted-foreground"
                        />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {user.name}
                        </p>

                        <p className="truncate text-xs text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </div>

                    <Badge
                      variant={
                        user.role === "admin"
                          ? "default"
                          : user.role === "agent"
                            ? "secondary"
                            : "outline"
                      }
                      className="capitalize"
                    >
                      {user.role}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* CREATE USER FORM */}

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Plus size={20} />

              <CardTitle>Add New User</CardTitle>
            </div>

            <CardDescription>
              Create an Agent or Customer account.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >

              {/* NAME */}

              <div className="space-y-2">
                <label
                  htmlFor="user-name"
                  className="text-sm font-medium"
                >
                  Full Name
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
                  required
                />
              </div>

              {/* EMAIL */}

              <div className="space-y-2">
                <label
                  htmlFor="user-email"
                  className="text-sm font-medium"
                >
                  Email Address
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
                  required
                />
              </div>

              {/* PASSWORD */}

              <div className="space-y-2">
                <label
                  htmlFor="user-password"
                  className="text-sm font-medium"
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
                  required
                />
              </div>

              {/* ROLE */}

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  User Role
                </label>

                <Select
                  value={form.role}
                  disabled={creating}
                  onValueChange={(value) =>
                    updateField("role", value)
                  }
                >
                  <SelectTrigger className="w-full">
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

                <p className="text-xs text-muted-foreground">
                  Agents handle tickets. Customers
                  create support requests.
                </p>
              </div>

              {/* ERROR */}

              {formError && (
                <p
                  role="alert"
                  className="text-sm text-destructive"
                >
                  {formError}
                </p>
              )}

              {/* SUCCESS */}

              {success && (
                <p
                  role="status"
                  className="text-sm text-emerald-600"
                >
                  {success}
                </p>
              )}

              {/* SUBMIT */}

              <Button
                type="submit"
                className="w-full"
                disabled={creating}
              >
                {creating ? (
                  <>
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus size={17} />
                    Create User
                  </>
                )}
              </Button>

            </form>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}