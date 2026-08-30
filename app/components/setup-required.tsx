import Link from "next/link";
import { FiDatabase, FiExternalLink } from "react-icons/fi";
import Brand from "./brand";

export default function SetupRequired() {
  return (
    <main className="grid min-h-screen place-items-center bg-bg p-5 text-font">
      <section className="surface w-full max-w-lg p-7 sm:p-9">
        <Brand />
        <div className="mt-8 grid h-12 w-12 place-items-center rounded-2xl bg-card text-subtle"><FiDatabase size={22} /></div>
        <h1 className="mt-5 text-2xl font-bold">Connect PeerGrid to Supabase</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          The V1 application is ready, but this environment has not been linked to a Supabase project yet. Add the two public values from <code className="mx-1 rounded bg-card px-1.5 py-0.5 text-xs text-font">.env.example</code> and apply the included migration.
        </p>
        <Link className="button button-secondary mt-7 w-full" href="/">Return to the public site <FiExternalLink /></Link>
      </section>
    </main>
  );
}
