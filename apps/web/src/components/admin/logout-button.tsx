"use client";

import { useRouter } from "next/navigation";
import { logout } from "@/lib/api/auth";
import { Button } from "../ui/button";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push("/admin/login");
  }

  return (
    <Button variant="ghost" size="sm" onClick={() => void handleLogout()}>
      Log Out
    </Button>
  );
}
