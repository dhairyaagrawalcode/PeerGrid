import Link from "next/link";
import AdminPagination from "@/app/components/admin-pagination";
import AdminUserActions from "@/app/components/admin-user-actions";
import AvatarImage from "@/app/components/avatar-image";
import { adminQuery, dateLabel, pageOffset } from "@/app/lib/admin";
import { initials } from "@/app/lib/format";
import type { AdminUserDirectory, AdminUserFilterOptions } from "@/app/types/admin";

type UserSearchParams = {
  q?: string;
  page?: string;
  profiles?: string;
  campus?: string;
  year?: string;
  status?: string;
  verified?: string;
  joinedFrom?: string;
  joinedTo?: string;
  activeFrom?: string;
  activeTo?: string;
  activity?: string;
  sort?: string;
};

const profileFilters = ["all", "profiles", "without_profile"] as const;
const statusFilters = ["all", "active", "suspended", "disabled", "removed"] as const;
const verificationFilters = ["all", "verified", "unverified"] as const;
const activityFilters = ["all", "has_posts", "has_collaborations", "has_post_reports", "has_issues"] as const;
const sortOptions = ["newest", "oldest", "last_active", "name", "most_posts", "most_collaborations"] as const;

function oneOf<T extends readonly string[]>(value: string | undefined, options: T, fallback: T[number]): T[number] {
  return options.includes(value as T[number]) ? value as T[number] : fallback;
}

function validDate(value: string | undefined) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

function validUuid(value: string | undefined) {
  return value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ? value : "";
}

function compactQuery(values: Record<string, string>) {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value && value !== "all"));
}

export default async function UsersPage({ searchParams }: { searchParams: Promise<UserSearchParams> }) {
  const params = await searchParams;
  const q = (params.q ?? "").slice(0, 120);
  const profiles = oneOf(params.profiles, profileFilters, "all");
  const status = oneOf(params.status, statusFilters, "all");
  const verified = oneOf(params.verified, verificationFilters, "all");
  const activity = oneOf(params.activity, activityFilters, "all");
  const sort = oneOf(params.sort, sortOptions, "newest");
  const campus = validUuid(params.campus);
  const joinedFrom = validDate(params.joinedFrom);
  const joinedTo = validDate(params.joinedTo);
  const activeFrom = validDate(params.activeFrom);
  const activeTo = validDate(params.activeTo);
  const parsedYear = Number(params.year);
  const year = Number.isInteger(parsedYear) && parsedYear >= 2000 && parsedYear <= 2200 ? String(parsedYear) : "";
  const offset = pageOffset(params.page);

  const [directory, options] = await Promise.all([
    adminQuery<AdminUserDirectory>("admin_user_directory", {
      search_text: q,
      result_offset: offset,
      profile_filter: profiles,
      campus_filter: campus || null,
      year_filter: year ? Number(year) : null,
      status_filter: status,
      verification_filter: verified,
      joined_from: joinedFrom || null,
      joined_to: joinedTo || null,
      active_from: activeFrom || null,
      active_to: activeTo || null,
      activity_filter: activity,
      sort_by: sort,
    }),
    adminQuery<AdminUserFilterOptions>("admin_user_filter_options"),
  ]);

  const query = compactQuery({ q, profiles, campus, year, status, verified, joinedFrom, joinedTo, activeFrom, activeTo, activity, sort });
  const hasFilters = Object.keys(query).length > 0;
  const users = directory.items.slice(0, 30);

  return <div>
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-2xl font-bold">Users</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-muted">Search and filter live Supabase Auth accounts with their matching profile and platform activity.</p></div>
      {hasFilters && <Link className="text-sm text-primary" href="/admin/users">Clear filters</Link>}
    </div>
    <p className="mt-3 text-sm text-subtle">{directory.total_accounts} Auth accounts · {directory.profile_count} profiles · {directory.accounts_without_profile} without a profile</p>

    <form className="my-6 space-y-3">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px_auto]">
        <input aria-label="Search users" className="field" defaultValue={q} maxLength={120} name="q" placeholder="Name, username, email, ID, or campus" />
        <select aria-label="Account status" className="field" defaultValue={status} name="status">
          <option value="all">All access states</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="disabled">Disabled</option><option value="removed">Removed</option>
        </select>
        <button className="button button-secondary">Apply</button>
      </div>
      <details className="rounded-xl border border-line bg-panel/30 p-3" open={hasFilters && Object.keys(query).some((key) => !["q", "status"].includes(key))}>
        <summary className="cursor-pointer select-none text-sm font-semibold text-subtle">Advanced database filters</summary>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-xs text-muted">Profile<select className="field mt-1 w-full" defaultValue={profiles} name="profiles"><option value="all">All accounts</option><option value="profiles">Profiles only</option><option value="without_profile">Without profile</option></select></label>
          <label className="text-xs text-muted">Campus<select className="field mt-1 w-full" defaultValue={campus} name="campus"><option value="">All campuses</option>{options.campuses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="text-xs text-muted">Graduation year<select className="field mt-1 w-full" defaultValue={year} name="year"><option value="">All years</option>{options.years.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label className="text-xs text-muted">Verification<select className="field mt-1 w-full" defaultValue={verified} name="verified"><option value="all">Any verification</option><option value="verified">Verified only</option><option value="unverified">Unverified only</option></select></label>
          <label className="text-xs text-muted">Activity<select className="field mt-1 w-full" defaultValue={activity} name="activity"><option value="all">Any activity</option><option value="has_posts">Has posts</option><option value="has_collaborations">Has collaborations</option><option value="has_post_reports">Submitted post reports</option><option value="has_issues">Submitted issues</option></select></label>
          <label className="text-xs text-muted">Sort<select className="field mt-1 w-full" defaultValue={sort} name="sort"><option value="newest">Newest accounts</option><option value="oldest">Oldest accounts</option><option value="last_active">Recently active</option><option value="name">Name</option><option value="most_posts">Most posts</option><option value="most_collaborations">Most collaborations</option></select></label>
          <label className="text-xs text-muted">Signed up from<input className="field mt-1 w-full" defaultValue={joinedFrom} name="joinedFrom" type="date" /></label>
          <label className="text-xs text-muted">Signed up through<input className="field mt-1 w-full" defaultValue={joinedTo} name="joinedTo" type="date" /></label>
          <span className="hidden lg:block" />
          <label className="text-xs text-muted">Active from<input className="field mt-1 w-full" defaultValue={activeFrom} name="activeFrom" type="date" /></label>
          <label className="text-xs text-muted">Active through<input className="field mt-1 w-full" defaultValue={activeTo} name="activeTo" type="date" /></label>
        </div>
      </details>
    </form>

    <p className="mb-5 text-xs text-muted">{directory.matching_count} matching {directory.matching_count === 1 ? "account" : "accounts"}{directory.matching_count > offset && ` · showing ${offset + 1}–${Math.min(offset + users.length, directory.matching_count)}`}</p>
    <div className="divide-y divide-line">{users.map((user) => <article className="py-6 first:pt-0" key={user.id}>
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-2 sm:flex">
        <span className="avatar !h-11 !w-11 shrink-0">{user.avatar_url ? <AvatarImage alt="" src={user.avatar_url} /> : initials(user.full_name || "Student")}</span>
        <div className="min-w-0 flex-1"><h2 className="font-semibold">{user.full_name || (user.has_profile ? "Name not set" : "No profile — Auth account only")}</h2>{user.username && <Link className="text-sm text-primary" href={`/students/${user.username}`}>@{user.username}</Link>}<p className="text-sm text-muted [overflow-wrap:anywhere]">{user.email}</p></div>
        <div className="col-start-2 text-xs text-subtle sm:text-right"><p>Access: <span className="capitalize">{user.account_status}</span></p><p>{user.is_verified ? "Verified profile" : "Not verified"}</p></div>
      </div>
      <dl className="mt-4 grid gap-x-8 gap-y-3 text-xs sm:grid-cols-2 lg:grid-cols-3">
        <div><dt className="text-muted">User ID</dt><dd className="mt-1 break-all font-mono">{user.id}</dd></div>
        <div><dt className="text-muted">Campus / batch</dt><dd className="mt-1">{user.campus || "Not set"}{user.graduation_year ? ` · Class of ${user.graduation_year}` : ""}</dd></div>
        <div><dt className="text-muted">Approval</dt><dd className="mt-1 capitalize">{user.approval_status || "Not recorded"}</dd></div>
        <div><dt className="text-muted">Auth account created · IST</dt><dd className="mt-1">{dateLabel(user.created_at)}</dd></div>
        <div><dt className="text-muted">Last recorded activity · IST</dt><dd className="mt-1">{dateLabel(user.last_active_at)}</dd></div>
        <div><dt className="text-muted">Profile created · IST</dt><dd className="mt-1">{user.has_profile ? dateLabel(user.profile_created_at) : "No profile row"}</dd></div>
      </dl>
      <p className="mt-4 text-xs text-muted">{user.posts} posts · {user.collaborations} collaborations · {user.followers} followers · {user.following} following · {user.post_reports} post reports · {user.issues} issues</p>
      <AdminUserActions userId={user.id} name={user.username ? `@${user.username}` : user.email} status={user.account_status} isAdmin={user.is_admin} />
    </article>)}</div>
    {users.length === 0 && <p className="py-12 text-sm text-muted">No users match these filters.</p>}
    <AdminPagination path="/admin/users" offset={offset} more={directory.items.length > 30} query={query} />
  </div>;
}
