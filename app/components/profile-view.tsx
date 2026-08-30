import Link from "next/link";
import { FiExternalLink, FiGithub, FiLinkedin, FiMapPin, FiShield } from "react-icons/fi";
import { initials } from "@/app/lib/format";
import type { ConnectionRecord, StudentProfile } from "@/app/types";
import AvatarImage from "./avatar-image";
import ConnectionControls from "./connection-controls";

export default function ProfileView({ profile, currentId, connection, own = false }: { profile: StudentProfile; currentId: string; connection?: ConnectionRecord; own?: boolean }) {
  return (
    <div className="space-y-5">
      <section className="surface overflow-hidden">
        <div className="h-28 bg-[radial-gradient(circle_at_20%_10%,rgba(79,209,197,.28),transparent_35%),linear-gradient(115deg,rgba(108,99,255,.35),rgba(13,19,32,.3))] sm:h-36" />
        <div className="px-5 pb-6 sm:px-7">
          <div className="-mt-10 flex items-end justify-between gap-4">
            <div className="avatar !h-20 !w-20 !rounded-2xl !border-4 !border-panel text-xl">{profile.avatar_url ? <AvatarImage alt={profile.full_name} src={profile.avatar_url} /> : initials(profile.full_name)}</div>
            {own ? <Link className="button button-secondary" href="/profile/edit">Edit profile</Link> : <ConnectionControls currentId={currentId} targetId={profile.id} connection={connection} />}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2"><h1 className="text-2xl font-black tracking-tight sm:text-3xl">{profile.full_name}</h1><span className="chip !border-secondary/15 !bg-secondary/8 !text-secondary"><FiShield /> Verified</span></div>
          <p className="mt-1 text-sm text-muted">@{profile.username}</p>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted"><span className="flex items-center gap-1.5"><FiMapPin className="text-secondary" />{profile.campus?.name}</span>{profile.program && <span>{profile.program}</span>}{profile.graduation_year && <span>Class of {profile.graduation_year}</span>}</div>
          {profile.bio && <p className="mt-5 max-w-2xl text-sm leading-6 text-[#d3d7df]">{profile.bio}</p>}
          <div className="mt-5 flex flex-wrap gap-3">{profile.github_url && <a className="button button-ghost !min-h-9 !px-3 !text-xs" href={profile.github_url} target="_blank" rel="noreferrer"><FiGithub /> GitHub</a>}{profile.linkedin_url && <a className="button button-ghost !min-h-9 !px-3 !text-xs" href={profile.linkedin_url} target="_blank" rel="noreferrer"><FiLinkedin /> LinkedIn</a>}{profile.portfolio_url && <a className="button button-ghost !min-h-9 !px-3 !text-xs" href={profile.portfolio_url} target="_blank" rel="noreferrer"><FiExternalLink /> Portfolio</a>}</div>
        </div>
      </section>
      <div className="grid gap-5 md:grid-cols-2">
        <section className="surface p-5"><p className="eyebrow">Skills</p>{profile.skills?.length ? <div className="mt-4 flex flex-wrap gap-2">{profile.skills.map((item) => <span className="chip !text-secondary" key={item.id}>{item.name}</span>)}</div> : <p className="mt-4 text-sm text-muted">No skills added yet.</p>}</section>
        <section className="surface p-5"><p className="eyebrow">Interests</p>{profile.interests?.length ? <div className="mt-4 flex flex-wrap gap-2">{profile.interests.map((item) => <span className="chip" key={item.id}>{item.name}</span>)}</div> : <p className="mt-4 text-sm text-muted">No interests added yet.</p>}</section>
      </div>
      <section className="surface p-5"><p className="eyebrow">Currently looking for</p><p className="mt-4 text-sm leading-6 text-[#d3d7df]">{profile.goals || "Nothing specific shared yet."}</p></section>
    </div>
  );
}
