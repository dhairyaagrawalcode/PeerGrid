"use client";

import { useActionState, useState } from "react";
import { FiEdit3, FiLoader } from "react-icons/fi";
import { createCollaboration, type CreateCollaborationState } from "@/app/actions/collaborations";
import type { Campus } from "@/app/types";

const initialValues = { title: "", description: "", collaborationType: "project", requiredSkills: "", teamCurrent: "1", teamCapacity: "", commitment: "", campusId: "" };

async function submitCollaboration(_: CreateCollaborationState, formData: FormData): Promise<CreateCollaborationState> {
  return await createCollaboration(formData) ?? null;
}

export default function CollaborationCreateForm({ campuses }: { campuses: Campus[] }) {
  const [state, action, pending] = useActionState(submitCollaboration, null);
  const [values, setValues] = useState(initialValues);
  function update(name: keyof typeof initialValues, value: string) { setValues((current) => ({ ...current, [name]: value })); }

  return <form action={action} aria-busy={pending} className="surface scroll-mt-24 p-5 xl:sticky xl:top-20" id="new">
    <div className="flex items-center gap-2"><FiEdit3 className="text-secondary" /><h2 className="font-bold">Create a collaboration</h2></div>
    <fieldset className="mt-5 space-y-4 disabled:opacity-70" disabled={pending}>
      <div><label className="label" htmlFor="title">Title</label><input className="field" id="title" name="title" minLength={5} maxLength={100} onChange={(event) => update("title", event.target.value)} placeholder="Need 2 students for SIH" required value={values.title} /></div>
      <div><label className="label" htmlFor="description">What are you building?</label><textarea className="field" id="description" name="description" minLength={10} maxLength={1200} onChange={(event) => update("description", event.target.value)} placeholder="Share the idea, current progress, and the kind of collaborator you need." required value={values.description} /></div>
      <div><label className="label" htmlFor="collaborationType">Type</label><select className="field" id="collaborationType" name="collaborationType" onChange={(event) => update("collaborationType", event.target.value)} value={values.collaborationType}><option value="project">Project</option><option value="hackathon">Hackathon</option><option value="open_source">Open source</option><option value="startup">Startup</option><option value="study">Study group</option><option value="other">Other</option></select></div>
      <div><label className="label" htmlFor="requiredSkills">Required skills</label><input className="field" id="requiredSkills" name="requiredSkills" onChange={(event) => update("requiredSkills", event.target.value)} placeholder="React, FastAPI, product design" value={values.requiredSkills} /><p className="mt-1.5 text-xs text-muted">Up to 12, separated with commas.</p></div>
      <div className="grid grid-cols-2 gap-3"><div><label className="label" htmlFor="teamCurrent">Current team</label><input className="field" id="teamCurrent" name="teamCurrent" type="number" min={1} max={50} onChange={(event) => update("teamCurrent", event.target.value)} required value={values.teamCurrent} /></div><div><label className="label" htmlFor="teamCapacity">Capacity</label><input className="field" id="teamCapacity" name="teamCapacity" type="number" min={1} max={50} onChange={(event) => update("teamCapacity", event.target.value)} placeholder="4" required value={values.teamCapacity} /></div></div>
      <div><label className="label" htmlFor="commitment">Commitment / duration</label><input className="field" id="commitment" name="commitment" maxLength={80} onChange={(event) => update("commitment", event.target.value)} placeholder="6 weeks · 4 hours/week" value={values.commitment} /></div>
      <div><label className="label" htmlFor="campusId">Campus reach</label><select className="field" id="campusId" name="campusId" onChange={(event) => update("campusId", event.target.value)} value={values.campusId}><option value="">All NST campuses</option>{campuses.map((campus) => <option key={campus.id} value={campus.id}>{campus.name}</option>)}</select></div>
      {state?.error && <p className="rounded-xl border border-danger/20 bg-danger/10 p-3 text-sm text-danger" role="alert">{state.error}</p>}
      <button className="button button-primary w-full" disabled={pending} type="submit">{pending ? <><FiLoader className="animate-spin" />Publishing…</> : "Publish open call"}</button>
    </fieldset>
  </form>;
}
