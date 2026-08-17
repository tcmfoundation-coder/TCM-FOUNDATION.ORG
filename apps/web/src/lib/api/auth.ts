import { apiClient } from "../api-client";

export interface AuthConfig {
  googleEnabled: boolean;
}

export function getAuthConfig(): Promise<AuthConfig> {
  return apiClient.get<AuthConfig>("/auth/config");
}

export function login(email: string, password: string): Promise<{ mfaRequired: boolean }> {
  return apiClient.post<{ mfaRequired: boolean }>("/auth/login", { email, password });
}

export function mfaLoginVerify(code: string): Promise<{ success: true }> {
  return apiClient.post<{ success: true }>("/auth/mfa/login-verify", { code });
}

export function logout(): Promise<{ success: true }> {
  return apiClient.post<{ success: true }>("/auth/logout");
}
