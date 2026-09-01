import type { ReactNode } from "react";

export default function EmptyState({ icon, title, copy, action }: { icon: ReactNode; title: string; copy: string; action?: ReactNode }) {
  return <div className="flex flex-col items-center px-6 py-14 text-center"><div className="grid h-11 w-11 place-items-center rounded-full bg-card text-subtle">{icon}</div><h2 className="mt-4 font-bold">{title}</h2><p className="mt-2 max-w-sm text-sm leading-6 text-muted">{copy}</p>{action && <div className="mt-6">{action}</div>}</div>;
}
