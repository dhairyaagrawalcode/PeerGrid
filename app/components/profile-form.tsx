"use client";

import { useActionState } from "react";
import { FiSave } from "react-icons/fi";
import { saveProfile, type ProfileFormState } from "@/app/actions/profile";
import type { Campus, StudentProfile } from "@/app/types";

const initialState: ProfileFormState = {};

export default function ProfileForm({ campuses, profile, returnTo }: { campuses: Campus[]; profile: Partial<StudentProfile> | null; returnTo: string }) {
  const [state, action, pending] = useActionState(saveProfile, initialState);
  const skills = profile?.skills?.map((item) => item.name).join(", ") ?? "";
  const interests = profile?.interests?.map((item) => item.name).join(", ") ?? "";
  return (
    <form action={action} className="space-y-7">
      <input type="hidden" name="returnTo" value={returnTo} />
      <div className="grid gap-5 sm:grid-cols-2">
        <div><label className="label" htmlFor="fullName">Full name *</label><input className="field" id="fullName" name="fullName" defaultValue={profile?.full_name ?? ""} minLength={2} maxLength={80} required /></div>
        <div><label className="label" htmlFor="username">Username *</label><div className="relative"><span className="absolute left-3.5 top-3 text-muted">@</span><input className="field !pl-8" id="username" name="username" defaultValue={profile?.username ?? ""} pattern="[a-zA-Z0-9][a-zA-Z0-9_-]{2,29}" required /></div></div>
        <div><label className="label" htmlFor="campusId">Campus *</label><select className="field" id="campusId" name="campusId" defaultValue={profile?.campus_id ?? ""} required><option value="" disabled>Select campus</option>{campuses.map((campus) => <option key={campus.id} value={campus.id}>{campus.name}</option>)}</select></div>
        <div><label className="label" htmlFor="graduationYear">Graduation year</label><input className="field" id="graduationYear" name="graduationYear" type="number" min={2024} max={2040} defaultValue={profile?.graduation_year ?? ""} /></div>
        <div className="sm:col-span-2"><label className="label" htmlFor="program">Program / branch</label><input className="field" id="program" name="program" maxLength={100} defaultValue={profile?.program ?? ""} placeholder="B.Tech Computer Science" /></div>
        <div className="sm:col-span-2"><label className="label" htmlFor="avatar">Profile photo</label><input className="field file:mr-4 file:rounded-lg file:border-0 file:bg-primary/15 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-primary" id="avatar" name="avatar" type="file" accept="image/png,image/jpeg,image/webp" /><p className="mt-1.5 text-xs text-muted">JPG, PNG or WebP. Maximum 3 MB.</p></div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div><label className="label" htmlFor="skills">Skills</label><input className="field" id="skills" name="skills" defaultValue={skills} placeholder="React, Python, UI design" /><p className="mt-1.5 text-xs text-muted">Separate with commas.</p></div>
        <div><label className="label" htmlFor="interests">Interests</label><input className="field" id="interests" name="interests" defaultValue={interests} placeholder="GSoC, startups, robotics" /><p className="mt-1.5 text-xs text-muted">Separate with commas.</p></div>
        <div className="sm:col-span-2"><label className="label" htmlFor="bio">Short bio</label><textarea className="field" id="bio" name="bio" maxLength={500} defaultValue={profile?.bio ?? ""} placeholder="What are you curious about?" /></div>
        <div className="sm:col-span-2"><label className="label" htmlFor="goals">What are you looking for?</label><textarea className="field" id="goals" name="goals" maxLength={500} defaultValue={profile?.goals ?? ""} placeholder="Hackathon teammates, open-source contributors, a design collaborator…" /></div>
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        <div><label className="label" htmlFor="githubUrl">GitHub URL</label><input className="field" id="githubUrl" name="githubUrl" type="url" defaultValue={profile?.github_url ?? ""} placeholder="https://github.com/..." /></div>
        <div><label className="label" htmlFor="linkedinUrl">LinkedIn URL</label><input className="field" id="linkedinUrl" name="linkedinUrl" type="url" defaultValue={profile?.linkedin_url ?? ""} placeholder="https://linkedin.com/in/..." /></div>
        <div><label className="label" htmlFor="portfolioUrl">Portfolio URL</label><input className="field" id="portfolioUrl" name="portfolioUrl" type="url" defaultValue={profile?.portfolio_url ?? ""} placeholder="https://..." /></div>
      </div>
      {state.error && <p className="rounded-xl border border-danger/20 bg-danger/10 p-3 text-sm text-danger" role="alert">{state.error}</p>}
      <button className="button button-primary w-full sm:w-auto" disabled={pending} type="submit"><FiSave />{pending ? "Saving…" : "Save profile"}</button>
    </form>
  );
}
