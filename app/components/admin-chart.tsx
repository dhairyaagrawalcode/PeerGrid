import type { ActivityPoint } from "@/app/types/admin";
export default function AdminChart({ title, points, hourly = false }: { title: string; points: ActivityPoint[]; hourly?: boolean }) {
  const maximum = Math.max(1, ...points.map((p) => Number(p.count)));
  const format = (value: string) => hourly ? new Date(value).toLocaleTimeString("en-IN", { hour: "2-digit", timeZone: "Asia/Kolkata" }) : value.slice(5);
  return <section className="min-w-0"><h2 className="text-base font-bold">{title}</h2><p className="mt-1 text-xs text-muted">Asia/Kolkata · {points.length} {hourly ? "hours" : "days"}</p>
    <div role="img" aria-label={title + ". Exact values are available in the data table below."} className="mt-5 flex h-36 items-end gap-1 border-b border-line">{points.map((p) => <div key={p.label} title={format(p.label) + ": " + p.count} className="min-w-0 flex-1 rounded-t-sm bg-primary/70" style={{ height: Math.max(2, Number(p.count) / maximum * 100) + "%" }} />)}</div>
    <div className="mt-2 flex justify-between text-[10px] text-muted"><span>{points[0] && format(points[0].label)}</span><span>{points.at(-1) && format(points.at(-1)!.label)}</span></div>
    <details className="mt-3 text-xs text-muted"><summary className="cursor-pointer">View exact values</summary><div className="mt-2 max-h-48 overflow-auto"><table className="w-full text-left"><thead><tr><th>{hourly ? "Hour" : "Date"}</th><th>Users</th></tr></thead><tbody>{points.map((p) => <tr key={p.label}><td className="py-1">{p.label}</td><td>{p.count}</td></tr>)}</tbody></table></div></details>
  </section>;
}
