"use client";

import { logout } from "@/lib/api/auth";
import { Button } from "../ui/button";

export function LogoutButton() {
  async function handleLogout() {
    await logout();
    // Hard navigation, not router.push: admin/layout.tsx is a server
    // component shared by every /admin/* route (including login) that
    // fetches the session once and decides whether to render the
    // privileged header/sidebar chrome. A client-side transition keeps
    // that layout mounted with its now-stale "logged in" data, so the
    // chrome would keep rendering around the login page. A full reload
    // forces it to refetch and correctly render as logged out.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- intentional hard reload, see comment above
    window.location.href = "/admin/login";
  }

  return (
    <Button variant="ghost" size="sm" onClick={() => void handleLogout()}>
      Log Out
    </Button>
  );
}
