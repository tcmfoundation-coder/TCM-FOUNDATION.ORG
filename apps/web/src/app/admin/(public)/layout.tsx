// The only unguarded surface under /admin — the entry points into the auth
// flow itself (password/Google login, TOTP login-verify). Everything past
// this point requires a real session; see the (authenticated) and
// (privileged) route groups' layouts for the actual security boundary.
export default function AdminPublicLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
