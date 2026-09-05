import Link from "next/link";
import { adminQuery, dateLabel, pageOffset } from "@/app/lib/admin";
import type { AdminUserDirectory } from "@/app/types/admin";
import AdminUserActions from "@/app/components/admin-user-actions";
import AdminPagination from "@/app/components/admin-pagination";
import AvatarImage from "@/app/components/avatar-image";
import { initials } from "@/app/lib/format";

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string; profiles?: string }> }) {
  const { q = "", page, profiles } = await searchParams;
  const filter = profiles === "profiles" || profiles === "without_profile" ? profiles : "all";
  const offset = pageOffset(page);
  const directory = await adminQuery<AdminUserDirectory>("admin_user_directory", { search_text: q.slice(0,120), result_offset: offset, profile_filter: filter });
  const users = directory.items;
  return <div><h1 className="text-2xl font-bold">Users</h1><p className="mt-2 text-sm leading-6 text-muted">All accounts come from Supabase Auth. Profiles are the matching rows in <code>public.profiles</code>; an account can exist without a profile.</p>
    <p className="mt-3 text-sm text-subtle">{directory.total_accounts} Auth accounts · {directory.profile_count} profiles · {directory.accounts_without_profile} without a profile</p>
    <form className="my-6 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]"><input aria-label="Search users" className="field" defaultValue={q} maxLength={120} name="q" placeholder="Name, username, email, ID, or campus" /><select aria-label="Profile filter" className="field" name="profiles" defaultValue={filter}><option value="all">All Auth accounts</option><option value="profiles">Profiles only</option><option value="without_profile">Without a profile</option></select><button className="button button-secondary">Search</button></form>
    <p className="mb-5 text-xs text-muted">{directory.matching_count} matching {directory.matching_count === 1 ? "account" : "accounts"}{directory.matching_count > offset && ` · showing ${offset + 1}–${Math.min(offset + 30, directory.matching_count)}`} · Counts include all stored posts/collaborations, regardless of publication status.</p>
    <div className="divide-y divide-line">{users.slice(0,30).map((user) => <article className="py-6 first:pt-0" key={user.id}>
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-2 sm:flex"><span className="avatar !h-11 !w-11 shrink-0">{user.avatar_url ? <AvatarImage alt="" src={user.avatar_url} /> : initials(user.full_name || "Student")}</span><div className="min-w-0 flex-1"><h2 className="font-semibold">{user.full_name || (user.has_profile ? "Name not set" : "No profile — Auth account only")}</h2>{user.username && <Link className="text-sm text-primary" href={`/students/${user.username}`}>@{user.username}</Link>}<p className="text-sm text-muted [overflow-wrap:anywhere]">{user.email}</p></div><span className="col-start-2 shrink-0 text-xs text-subtle">Access: <span className="capitalize">{user.account_status}</span></span></div>
      <dl className="mt-4 grid gap-x-8 gap-y-3 text-xs sm:grid-cols-2"><div><dt className="text-muted">User ID</dt><dd className="mt-1 break-all font-mono">{user.id}</dd></div><div><dt className="text-muted">Campus / batch</dt><dd className="mt-1">{user.campus || "Not set"}{user.graduation_year ? ` · Class of ${user.graduation_year}` : ""}</dd></div><div><dt className="text-muted">Auth account created · IST</dt><dd className="mt-1">{dateLabel(user.created_at)}</dd></div><div><dt className="text-muted">Last recorded activity · IST</dt><dd className="mt-1">{dateLabel(user.last_active_at)}</dd></div><div><dt className="text-muted">Profile created · IST</dt><dd className="mt-1">{user.has_profile ? dateLabel(user.profile_created_at) : "No profile row"}</dd></div></dl>
      <p className="mt-4 text-xs text-muted">{user.posts} posts · {user.collaborations} collaborations · {user.followers} followers · {user.following} following · Approval: {user.approval_status || "Not recorded"}</p>
      <AdminUserActions userId={user.id} name={user.username ? `@${user.username}` : user.email} status={user.account_status} isAdmin={user.is_admin} />
    </article>)}</div>{users.length === 0 && <p className="py-12 text-sm text-muted">No matching users.</p>}
    <AdminPagination path="/admin/users" offset={offset} more={users.length > 30} query={{ q, profiles: filter }} />
  </div>;
}
