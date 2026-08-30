import Link from "next/link";

export default function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link className="inline-flex items-center gap-2.5" href={href}>
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-[#a879ff] text-sm font-black text-white shadow-lg shadow-primary/20">PG</span>
      <span className="text-base font-extrabold tracking-tight text-font">PeerGrid</span>
    </Link>
  );
}
