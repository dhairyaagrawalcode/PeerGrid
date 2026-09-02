import Link from "next/link";

export default function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link className="inline-flex h-10 shrink-0 items-center gap-2" href={href}>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-xs font-black text-white md:h-9 md:w-9 md:text-sm">PG</span>
      <span className="text-sm font-extrabold leading-none tracking-tight text-font md:text-base">PeerGrid</span>
    </Link>
  );
}
