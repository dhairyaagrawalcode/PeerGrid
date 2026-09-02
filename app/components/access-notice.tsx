import Link from "next/link";
import Brand from "./brand";
import { signOut } from "@/app/actions/auth";
export default function AccessNotice({ title, message, signedIn = false }: { title: string; message: string; signedIn?: boolean }) {
  return <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6 py-16"><Brand href="/" /><h1 className="mt-10 text-2xl font-bold">{title}</h1><p className="mt-4 text-sm leading-7 text-muted">{message}</p><div className="mt-7 flex flex-wrap gap-3"><Link className="button button-secondary" href="/">Try again</Link>{signedIn ? <form action={signOut}><button className="button button-secondary">Sign out</button></form> : <Link className="button button-secondary" href="/admin/login">Admin sign in</Link>}</div></main>;
}
