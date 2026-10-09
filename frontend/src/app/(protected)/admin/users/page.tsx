"use client";

import { FormEvent, useEffect, useState } from "react";

import {
  apiRequest,
  User,
} from "@/lib/api";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "agent" as "agent" | "customer",
  });

  async function loadUsers() {
    try {
      const data = await apiRequest<User[]>("/users");
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    try {
      await apiRequest("/users", {
        method: "POST",
        body: JSON.stringify(form),
      });

      setForm({
        name: "",
        email: "",
        password: "",
        role: "agent",
      });

      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  if (loading) {
    return <p className="p-6">Loading users...</p>;
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-2xl font-bold">
        User Management
      </h1>

      <form
        onSubmit={handleSubmit}
        className="mb-8 space-y-3"
      >
        <input
          className="w-full rounded border p-3"
          placeholder="Name"
          value={form.name}
          onChange={(event) =>
            setForm({ ...form, name: event.target.value })
          }
          required
        />

        <input
          className="w-full rounded border p-3"
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(event) =>
            setForm({ ...form, email: event.target.value })
          }
          required
        />

        <input
          className="w-full rounded border p-3"
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(event) =>
            setForm({ ...form, password: event.target.value })
          }
          required
        />

        <select
          className="w-full rounded border p-3"
          value={form.role}
          onChange={(event) =>
            setForm({
              ...form,
              role: event.target.value as "agent" | "customer",
            })
          }
        >
          <option value="agent">Agent</option>
          <option value="customer">Customer</option>
        </select>

        <button className="rounded bg-blue-600 px-5 py-3 text-white">
          Create User
        </button>
      </form>

      {error && <p className="mb-4 text-red-500">{error}</p>}

      <h2 className="mb-3 text-xl font-semibold">
        Business Users
      </h2>

      <div className="space-y-2">
        {users.map((user) => (
          <div
            key={user.id}
            className="rounded border p-3"
          >
            <p className="font-semibold">{user.name}</p>
            <p>{user.email}</p>
            <p className="text-sm">{user.role}</p>
          </div>
        ))}
      </div>
    </div>
  );
}