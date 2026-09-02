import type { MutualFollowContext } from "@/app/types";

export default function MutualConnections({ context, className = "" }: { context?: MutualFollowContext | null; className?: string }) {
  if (!context?.mutual_count) return null;
  const names = context.mutual_names.slice(0, 2);
  const remaining = Math.max(context.mutual_count - names.length, 0);
  const named = names.length === 2 ? `${names[0]} and ${names[1]}` : names[0];
  const label = named
    ? remaining > 0 ? `Followed by ${named} and ${remaining} other${remaining === 1 ? "" : "s"}` : `Followed by ${named}`
    : `${context.mutual_count} mutual follower${context.mutual_count === 1 ? "" : "s"}`;
  return <p className={`truncate text-[11px] text-muted ${className}`}>{label}</p>;
}
