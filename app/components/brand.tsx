import Link from "next/link";

export default function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link className="inline-flex h-10 shrink-0 items-center gap-2" href={href}>
      <span className="text-xl font-extrabold leading-none tracking-tight text-font md:text-base">
        PeerGrid
      </span>
    </Link>
  );
}
