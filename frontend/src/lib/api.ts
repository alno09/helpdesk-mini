const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface User {
  id: number;
  business_id: number;
  name: string;
  email: string;
  role: "admin" | "agent" | "customer";
}

export interface Business {
  id: number;
  name: string;
  slug: string;
}

export interface MeResponse {
  user: User;
  business: Business;
}

export function saveTokens(tokens: TokenPair) {
  sessionStorage.setItem("access_token", tokens.access_token);
  sessionStorage.setItem("refresh_token", tokens.refresh_token);
}

export function logout() {
  sessionStorage.removeItem("access_token");
  sessionStorage.removeItem("refresh_token");

  window.location.replace("/login");
}

async function getError(response: Response): Promise<string> {
  const data: unknown = await response.json().catch(() => null);

  if (
    typeof data === "object" &&
    data !== null &&
    "detail" in data &&
    typeof data.detail === "string"
  ) {
    return data.detail;
  }

  return `Request failed (${response.status})`;
}

export async function publicRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(await getError(response));
  }

  return (await response.json()) as T;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const accessToken = sessionStorage.getItem("access_token");

  const request = (token: string | null) =>
    fetch(`${API_URL}${path}`, {
      ...options,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

  let response = await request(accessToken);

  if (response.status === 401) {
    const refreshToken = sessionStorage.getItem("refresh_token");

    if (!refreshToken) {
      logout();
      throw new Error("Session expired");
    }

    const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        refresh_token: refreshToken,
      }),
    });

    if (!refreshResponse.ok) {
      logout();
      throw new Error("Session expired");
    }

    const tokens = (await refreshResponse.json()) as {
      access_token: string;
    };

    sessionStorage.setItem("access_token", tokens.access_token);

    response = await request(tokens.access_token);
  }

  if (!response.ok) {
    throw new Error(await getError(response));
  }

  return (await response.json()) as T;
}