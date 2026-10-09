"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { publicRequest } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    business_name: "",
    business_slug: "",
    name: "",
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      await publicRequest("/auth/register-business", {
        method: "POST",
        body: JSON.stringify(form),
      });

      router.replace("/login");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Registration failed",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="mb-6 text-2xl font-bold">
        Register Business
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {Object.keys(form).map((key) => {
          const field = key as keyof typeof form;

          return (
            <input
              key={field}
              className="w-full rounded border p-3"
              type={
                field === "password"
                  ? "password"
                  : field === "email"
                    ? "email"
                    : "text"
              }
              placeholder={field.replaceAll("_", " ")}
              value={form[field]}
              onChange={(event) =>
                setForm({
                  ...form,
                  [field]: event.target.value,
                })
              }
              required
            />
          );
        })}

        {error && <p className="text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-blue-600 p-3 text-white disabled:opacity-50"
        >
          {loading ? "Registering..." : "Register"}
        </button>
      </form>
    </main>
  );
}