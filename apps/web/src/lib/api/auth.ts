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

// Always the same response whether or not the email matched an account —
// the backend never reveals account existence through this endpoint.
export function requestPasswordReset(email: string): Promise<{ success: true }> {
  return apiClient.post<{ success: true }>("/auth/request-password-reset", { email });
}

export function resetPassword(token: string, newPassword: string): Promise<{ success: true }> {
  return apiClient.post<{ success: true }>("/auth/reset-password", { token, newPassword });
}

// Requires an active session (JwtAuthGuard). On success the backend revokes
// every refresh token and clears this request's auth cookies, so the
// caller should treat the current session as ended and send the user back
// to login.
export function changePassword(currentPassword: string, newPassword: string): Promise<{ success: true }> {
  return apiClient.post<{ success: true }>("/auth/change-password", { currentPassword, newPassword });
}
