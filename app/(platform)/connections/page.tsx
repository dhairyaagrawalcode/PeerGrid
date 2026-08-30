import { FiInbox, FiUsers } from "react-icons/fi";
import EmptyState from "@/app/components/empty-state";
import StudentCard from "@/app/components/student-card";
import { requireStudent } from "@/app/lib/auth";
import { getConnections, getStudents } from "@/app/lib/data";

export default async function ConnectionsPage() {
  const { supabase, user } = await requireStudent();
  const [records, students] = await Promise.all([getConnections(supabase, user.id), getStudents(supabase, user.id)]);
  const byId = new Map(students.map((student) => [student.id, student]));
  const withStudent = records.map((connection) => ({ connection, student: byId.get(connection.requester_id === user.id ? connection.recipient_id : connection.requester_id) })).filter((item) => item.student);
  const incoming = withStudent.filter(({ connection }) => connection.status === "pending" && connection.recipient_id === user.id);
  const accepted = withStudent.filter(({ connection }) => connection.status === "accepted");
  const outgoing = withStudent.filter(({ connection }) => connection.status === "pending" && connection.requester_id === user.id);

  return (
    <div>
      <p className="eyebrow">Your network</p><h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Connections</h1><p className="mt-2 text-sm text-muted">Requests and verified students you have connected with.</p>
      <section className="mt-7"><h2 className="flex items-center gap-2 font-bold"><FiInbox className="text-secondary" /> Requests <span className="chip">{incoming.length}</span></h2>{incoming.length ? <div className="mt-4 grid gap-4 sm:grid-cols-2">{incoming.map(({ student, connection }) => <StudentCard key={connection.id} student={student!} currentId={user.id} connection={connection} />)}</div> : <p className="mt-3 text-sm text-muted">No new requests.</p>}</section>
      <section className="mt-9"><h2 className="flex items-center gap-2 font-bold"><FiUsers className="text-primary" /> Connected <span className="chip">{accepted.length}</span></h2>{accepted.length ? <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{accepted.map(({ student, connection }) => <StudentCard key={connection.id} student={student!} currentId={user.id} connection={connection} />)}</div> : <div className="mt-4"><EmptyState icon={<FiUsers size={21} />} title="Start building your network" copy="Discover students with shared skills and interests, then send a connection request." action={<a className="button button-primary" href="/discover">Discover students</a>} /></div>}</section>
      {outgoing.length > 0 && <section className="mt-9"><h2 className="font-bold">Sent requests <span className="chip ml-2">{outgoing.length}</span></h2><div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{outgoing.map(({ student, connection }) => <StudentCard key={connection.id} student={student!} currentId={user.id} connection={connection} />)}</div></section>}
    </div>
  );
}

