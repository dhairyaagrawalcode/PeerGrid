import { redirect } from "next/navigation";
import Link from "next/link";
import Brand from "@/app/components/brand";
import AdminLoginForm from "@/app/components/admin-login-form";
import { getPasswordAdminSession, passwordAdminConfigured } from "@/app/lib/admin-password";
export default async function AdminLoginPage() {
  if (await getPasswordAdminSession()) redirect("/admin");
  return <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-16">
    <Brand href="/" /><p className="eyebrow mt-10">Private access</p><h1 className="mt-2 text-2xl font-bold">Admin dashboard</h1><p className="mt-3 text-sm leading-6 text-muted">Enter your dashboard password to continue. No student account is required.</p>
    {passwordAdminConfigured() ? <AdminLoginForm /> : <div className="mt-7 space-y-3 text-sm text-muted"><p>Admin password login hasn’t been configured on this server.</p><p>Run <code className="text-subtle">npm run admin:password</code>, add the generated hash and a server-only Supabase secret key to your environment, then restart PeerGrid.</p></div>}
    <Link className="mt-7 text-sm text-muted hover:text-font" href="/">Back to PeerGrid</Link>
  </main>;
}
