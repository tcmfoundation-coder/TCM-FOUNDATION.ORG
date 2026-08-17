import { getAuthConfig } from "@/lib/api/auth";
import { LoginForm } from "@/components/admin/login-form";

export default async function AdminLoginPage() {
  const config = await getAuthConfig();

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center gap-8 px-6 py-16">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-medium text-stone-900">Admin Sign In</h1>
        <p className="text-sm text-stone-600">Sign in to manage TCM Foundation content.</p>
      </div>
      <LoginForm googleEnabled={config.googleEnabled} />
    </main>
  );
}
