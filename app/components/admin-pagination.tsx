import Link from "next/link";
export default function AdminPagination({ path, offset, more, size = 30, query = {} }: { path: string; offset: number; more: boolean; size?: number; query?: Record<string,string> }) {
  function href(page: number) { return path + "?" + new URLSearchParams({ ...query, page: String(page) }); }
  return <nav aria-label="Pagination" className="mt-6 flex items-center gap-5 text-sm"><span className="text-muted">Page {offset / size + 1}</span>{offset > 0 && <Link className="text-primary" href={href(offset/size-1)}>Previous</Link>}{more && <Link className="text-primary" href={href(offset/size+1)}>Next</Link>}</nav>;
}
