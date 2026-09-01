import Link from "next/link";
import { FiMail } from "react-icons/fi";
import Brand from "@/app/components/brand";

export default async function CheckEmailPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  return (
    <main className="grid min-h-screen place-items-center bg-bg p-5 text-font">
      <section className="surface w-full max-w-md p-7 text-center sm:p-9">
        <div className="flex justify-center"><Brand /></div>
        <div className="mx-auto mt-9 grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary"><FiMail size={24} /></div>
        <h1 className="mt-5 text-2xl font-bold">Verify your college email</h1>
        <p className="mt-3 text-sm leading-6 text-muted">We sent a verification link{email ? <> to <span className="text-font">{email}</span></> : null}. Open it on this device to finish setting up your profile.</p>
        <Link className="button button-secondary mt-7 w-full" href="/auth/login">Back to sign in</Link>
      </section>
    </main>
  );
}
