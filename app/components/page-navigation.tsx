import Link from "next/link";

export default function PageNavigation({
  page,
  hasMore,
  path,
}: {
  page: number;
  hasMore: boolean;
  path: string;
}) {
  if (page === 0 && !hasMore) return null;
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between py-5">
      {page > 0 ? (
        <Link className="button button-secondary !min-h-9 !text-xs" href={`${path}?page=${page - 1}`}>
          Newer
        </Link>
      ) : <span />}
      <span className="text-xs text-muted">Page {page + 1}</span>
      {hasMore ? (
        <Link className="button button-secondary !min-h-9 !text-xs" href={`${path}?page=${page + 1}`}>
          Older
        </Link>
      ) : <span />}
    </nav>
  );
}
