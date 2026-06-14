import type { AuthUser } from "@/context/AuthContext";

const BASE = "/api/auth";

async function post<T>(path: string, body: unknown, token?: string): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { method: "POST", headers, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data as T;
}

interface AuthResponse { token: string; user: AuthUser }

export const authApi = {
  register: (body: { name: string; email?: string; phone?: string; password: string }) =>
    post<AuthResponse>("/register", body),

  login: (identifier: string, password: string) =>
    post<AuthResponse>("/login", { identifier, password }),

  forgotPassword: (identifier: string) =>
    post<{ success: boolean; message: string }>("/forgot-password", { identifier }),

  webauthnRegisterCredential: (credentialId: string, token: string) =>
    post<{ success: boolean }>("/webauthn/register", { credentialId }, token),

  webauthnLogin: (credentialId: string) =>
    post<AuthResponse>("/webauthn/login", { credentialId }),
};
