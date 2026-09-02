"use client";

import { useRef, useState, useTransition } from "react";
import { FiCheck, FiSearch, FiTrash2, FiUserPlus, FiX } from "react-icons/fi";
import {
  completeCollaboration,
  deleteCollaboration,
  searchCollaborationParticipants,
  setCollaborationStatus,
  updateCollaborationDetails,
  updateCollaborationTeam,
} from "@/app/actions/collaborations";
import { initials } from "@/app/lib/format";
import type { Campus, CollaborationParticipantOption, CollaborationPost } from "@/app/types";
import AvatarImage from "./avatar-image";
import ConfirmedSubmitButton from "./confirmed-submit-button";
import FormSubmitButton from "./form-submit-button";

type SelectedParticipant = CollaborationParticipantOption & { role: string };

export default function CollaborationManager({ post, campuses }: { post: CollaborationPost; campuses: Campus[] }) {
  const manageRef = useRef<HTMLDialogElement>(null);
  const completionRef = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CollaborationParticipantOption[]>([]);
  const [participants, setParticipants] = useState<SelectedParticipant[]>([]);
  const [isSearching, startSearch] = useTransition();
  const completed = post.status === "completed";

  function search(value: string) {
    setQuery(value);
    if (value.trim().length < 2) return setResults([]);
    startSearch(async () => setResults(await searchCollaborationParticipants(value)));
  }

  function addParticipant(student: CollaborationParticipantOption) {
    if (participants.some((participant) => participant.id === student.id)) return;
    setParticipants((current) => [...current, { ...student, role: "" }]);
    setQuery("");
    setResults([]);
  }

  function openCompletion() {
    manageRef.current?.close();
    completionRef.current?.showModal();
  }

  return (
    <>
      <button className="button button-secondary !min-h-9 !px-3 !text-xs" onClick={() => manageRef.current?.showModal()} type="button">Manage collaboration</button>

      <dialog className="m-auto max-h-[88vh] w-[min(680px,calc(100%-2rem))] overflow-y-auto rounded-2xl border border-line bg-panel p-0 text-font shadow-2xl backdrop:bg-black/75" ref={manageRef}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-panel px-5 py-4">
          <div><p className="text-sm font-bold">Manage collaboration</p><p className="mt-0.5 text-xs capitalize text-muted">{post.title} · {post.status}</p></div>
          <button aria-label="Close management" className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-card hover:text-font" onClick={() => manageRef.current?.close()} type="button"><FiX /></button>
        </div>

        {completed ? (
          <div className="p-6"><p className="text-sm font-semibold">This collaboration is completed.</p><p className="mt-2 text-sm leading-6 text-muted">Its proof of work becomes verified after every participant confirms.</p></div>
        ) : (
          <div className="space-y-9 p-5 sm:p-6">
            <section>
              <h3 className="text-sm font-bold">Project details</h3>
              <p className="mt-1 text-xs text-muted">Keep the public collaboration card accurate and easy to scan.</p>
              <form action={updateCollaborationDetails} className="mt-4 grid gap-4 sm:grid-cols-2">
                <input name="id" type="hidden" value={post.id} />
                <div className="sm:col-span-2"><label className="label" htmlFor={`manage-title-${post.id}`}>Title</label><input className="field" defaultValue={post.title} id={`manage-title-${post.id}`} maxLength={100} minLength={5} name="title" required /></div>
                <div className="sm:col-span-2"><label className="label" htmlFor={`manage-description-${post.id}`}>Description</label><textarea className="field min-h-28" defaultValue={post.description} id={`manage-description-${post.id}`} maxLength={1200} minLength={10} name="description" required /></div>
                <div><label className="label" htmlFor={`manage-type-${post.id}`}>Type</label><select className="field" defaultValue={post.collaboration_type} id={`manage-type-${post.id}`} name="collaborationType"><option value="project">Project</option><option value="hackathon">Hackathon</option><option value="open_source">Open source</option><option value="startup">Startup</option><option value="study">Study group</option><option value="other">Other</option></select></div>
                <div><label className="label" htmlFor={`manage-campus-${post.id}`}>Campus reach</label><select className="field" defaultValue={post.campus_id ?? ""} id={`manage-campus-${post.id}`} name="campusId"><option value="">All NST campuses</option>{campuses.map((campus) => <option key={campus.id} value={campus.id}>{campus.name}</option>)}</select></div>
                <div><label className="label" htmlFor={`manage-skills-${post.id}`}>Required skills</label><input className="field" defaultValue={post.required_skills.join(", ")} id={`manage-skills-${post.id}`} name="requiredSkills" /></div>
                <div><label className="label" htmlFor={`manage-commitment-${post.id}`}>Commitment / duration</label><input className="field" defaultValue={post.commitment ?? ""} id={`manage-commitment-${post.id}`} maxLength={80} name="commitment" /></div>
                <FormSubmitButton className="button button-secondary justify-self-start sm:col-span-2" pendingLabel="Saving…">Save details</FormSubmitButton>
              </form>
            </section>

            <section className="border-t border-line pt-7">
              <h3 className="text-sm font-bold">Team size</h3>
              <p className="mt-1 text-xs text-muted">Update this as teammates join or leave.</p>
              <form action={updateCollaborationTeam} className="mt-4 flex flex-wrap items-end gap-3">
                <input name="id" type="hidden" value={post.id} />
                <label className="text-xs text-muted">Current members<input className="field mt-1 !w-28" defaultValue={post.team_current} max={50} min={1} name="teamCurrent" type="number" /></label>
                <label className="text-xs text-muted">Total capacity<input className="field mt-1 !w-28" defaultValue={post.team_capacity ?? ""} max={50} min={1} name="teamCapacity" type="number" /></label>
                <FormSubmitButton className="button button-secondary" pendingLabel="Updating…">Update team</FormSubmitButton>
              </form>
            </section>

            <section>
              <h3 className="text-sm font-bold">Joining status</h3>
              <p className="mt-1 text-xs text-muted">Open accepts new interest. Full and Closed hide the joining action.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {(["open", "full", "closed"] as const).map((status) => (
                  <form action={setCollaborationStatus} key={status}><input name="id" type="hidden" value={post.id} /><input name="status" type="hidden" value={status} /><FormSubmitButton className={`button !min-h-9 !px-3 !text-xs ${post.status === status ? "button-primary" : "button-secondary"}`} pendingLabel="Updating…">{post.status === status ? `${status[0].toUpperCase()}${status.slice(1)} · current` : status === "open" ? "Open for joining" : status === "full" ? "Mark team full" : "Close collaboration"}</FormSubmitButton></form>
                ))}
              </div>
            </section>

            {post.moderation_status === "published" && (
              <section className="border-t border-line pt-7">
                <h3 className="text-sm font-bold">Complete &amp; verify</h3>
                <p className="mt-1 max-w-lg text-xs leading-5 text-muted">When the work is finished, add the team and project details. Teammates confirm next, then verified proof appears on each profile.</p>
                <button className="button button-primary mt-4" onClick={openCompletion} type="button"><FiCheck /> Mark as Completed</button>
              </section>
            )}

            <section className="flex items-center justify-between gap-4 border-t border-line pt-7">
              <div><h3 className="text-sm font-bold">Delete collaboration</h3><p className="mt-1 text-xs text-muted">This cannot be undone.</p></div>
              <form action={deleteCollaboration}><input name="id" type="hidden" value={post.id} /><ConfirmedSubmitButton ariaLabel="Delete collaboration" className="button button-danger !min-h-10 !px-3" confirmLabel="Delete" description="This collaboration post will be permanently removed. This action cannot be undone." title={`Delete ${post.title}?`}><FiTrash2 /></ConfirmedSubmitButton></form>
            </section>
          </div>
        )}
      </dialog>

      <dialog className="m-auto max-h-[88vh] w-[min(620px,calc(100%-2rem))] overflow-y-auto rounded-2xl border border-line bg-panel p-0 text-font shadow-2xl backdrop:bg-black/75" ref={completionRef}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-panel px-5 py-4">
          <div><p className="text-sm font-bold">Complete collaboration</p><p className="mt-0.5 text-xs text-muted">Add proof now · teammates confirm next</p></div>
          <button aria-label="Close completion" className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-card hover:text-font" onClick={() => completionRef.current?.close()} type="button"><FiX /></button>
        </div>
        <form action={completeCollaboration} className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
          <input name="id" type="hidden" value={post.id} />
          <input name="participants" type="hidden" value={JSON.stringify(participants.map(({ username, role }) => ({ username, role })))} />
          <div className="sm:col-span-2"><h3 className="text-sm font-bold">Proof details</h3><p className="mt-1 text-xs text-muted">Describe what the team built and how you contributed.</p></div>
          <div><label className="label" htmlFor={`complete-role-${post.id}`}>Your role</label><input className="field" id={`complete-role-${post.id}`} maxLength={80} name="creatorRole" placeholder="Frontend developer" required /></div>
          <div><label className="label" htmlFor={`complete-duration-${post.id}`}>Project duration</label><input className="field" defaultValue={post.commitment ?? ""} id={`complete-duration-${post.id}`} maxLength={80} name="duration" placeholder="6 weeks" required /></div>
          <div className="sm:col-span-2"><label className="label" htmlFor={`complete-skills-${post.id}`}>Skills used</label><input className="field" defaultValue={post.required_skills.join(", ")} id={`complete-skills-${post.id}`} name="skillsUsed" placeholder="React, FastAPI" required /></div>
          <div className="sm:col-span-2"><label className="label" htmlFor={`complete-link-${post.id}`}>GitHub, demo, or project link</label><input className="field" id={`complete-link-${post.id}`} maxLength={2048} name="projectUrl" placeholder="https://github.com/..." type="url" /></div>
          <div className="sm:col-span-2"><label className="label" htmlFor={`complete-outcome-${post.id}`}>Outcome / summary <span className="font-normal text-muted">(optional)</span></label><textarea className="field min-h-24" id={`complete-outcome-${post.id}`} maxLength={500} name="outcome" placeholder="What did the team build or achieve?" /></div>

          <div className="sm:col-span-2">
            <label className="label" htmlFor={`participant-search-${post.id}`}>Verified participants</label>
            <div className="relative mt-1">
              <FiSearch className="pointer-events-none absolute left-3 top-3.5 text-muted" />
              <input autoComplete="off" className="field !pl-10" id={`participant-search-${post.id}`} onChange={(event) => search(event.target.value)} placeholder="Search verified students by name or username" value={query} />
            </div>
            {(results.length > 0 || isSearching) && (
              <div className="mt-2 space-y-1">
                {isSearching && <p className="py-3 text-xs text-muted">Searching…</p>}
                {!isSearching && results.filter((student) => !participants.some((participant) => participant.id === student.id)).map((student) => (
                  <button className="flex w-full items-center gap-3 py-3 text-left hover:text-primary" key={student.id} onClick={() => addParticipant(student)} type="button">
                    <span className="avatar !h-9 !w-9 !rounded-full">{student.avatar_url ? <AvatarImage alt={student.full_name} src={student.avatar_url} /> : initials(student.full_name)}</span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{student.full_name}</span><span className="block truncate text-xs text-muted">@{student.username}{student.campus_name ? ` · ${student.campus_name}` : ""}</span></span>
                    <FiUserPlus />
                  </button>
                ))}
              </div>
            )}
            <div className="mt-3 space-y-2">
              {participants.map((participant) => (
                <div className="flex flex-col gap-2 py-2 sm:flex-row sm:items-center" key={participant.id}>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{participant.full_name}</p><p className="truncate text-xs text-muted">@{participant.username}</p></div>
                  <input aria-label={`${participant.full_name}'s role`} className="field sm:!w-56" maxLength={80} onChange={(event) => setParticipants((current) => current.map((item) => item.id === participant.id ? { ...item, role: event.target.value } : item))} placeholder="Participant role" required value={participant.role} />
                  <button aria-label={`Remove ${participant.full_name}`} className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-card hover:text-danger" onClick={() => setParticipants((current) => current.filter((item) => item.id !== participant.id))} type="button"><FiX /></button>
                </div>
              ))}
              {!participants.length && <p className="py-2 text-xs text-muted">Add at least one verified teammate. Everyone must confirm before the proof is verified.</p>}
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-line pt-4 sm:col-span-2">
            <button className="button button-secondary" onClick={() => completionRef.current?.close()} type="button">Cancel</button>
            <FormSubmitButton className="button button-primary disabled:opacity-40" disabled={!participants.length || participants.some((participant) => participant.role.trim().length < 2)} pendingLabel="Submitting…">Submit for confirmation</FormSubmitButton>
          </div>
        </form>
      </dialog>
    </>
  );
}
