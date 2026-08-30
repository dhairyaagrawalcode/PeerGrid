import { FiSearch, FiUsers } from "react-icons/fi";
import EmptyState from "@/app/components/empty-state";
import StudentCard from "@/app/components/student-card";
import { requireStudent } from "@/app/lib/auth";
import { getCampuses, getConnections, getStudents } from "@/app/lib/data";

type Search = { q?: string; campus?: string; skill?: string; interest?: string; year?: string };

export default async function DiscoverPage({ searchParams }: { searchParams: Promise<Search> }) {
  const filters = await searchParams;
  const { supabase, user } = await requireStudent();
  const [students, campuses, connections] = await Promise.all([
    getStudents(supabase, user.id),
    getCampuses(supabase),
    getConnections(supabase, user.id),
  ]);
  const normalized = Object.fromEntries(Object.entries(filters).map(([key, value]) => [key, value?.trim().toLowerCase()])) as Search;
  const filtered = students.filter((student) => {
    const searchable = [student.full_name, student.username, student.bio, student.goals, student.program, ...(student.skills?.map((item) => item.name) ?? []), ...(student.interests?.map((item) => item.name) ?? [])].filter(Boolean).join(" ").toLowerCase();
    return (!normalized.q || searchable.includes(normalized.q))
      && (!normalized.campus || student.campus?.slug === normalized.campus)
      && (!normalized.skill || student.skills?.some((item) => item.name.toLowerCase().includes(normalized.skill!)))
      && (!normalized.interest || student.interests?.some((item) => item.name.toLowerCase().includes(normalized.interest!)));
  });
  const connectionMap = new Map(connections.map((item) => [item.requester_id === user.id ? item.recipient_id : item.requester_id, item]));
  const academicYear = new Date().getFullYear();
  const studyYears = [1, 2, 3, 4].map((year) => ({
    value: String(year),
    label: `${year}${year === 1 ? "st" : year === 2 ? "nd" : year === 3 ? "rd" : "th"} year`,
    graduationYear: academicYear + 5 - year,
  }));
  const selectedStudyYear = studyYears.find((item) => item.value === normalized.year);
  const refined = selectedStudyYear
    ? filtered.filter((student) => student.graduation_year === selectedStudyYear.graduationYear)
    : filtered;

  return (
    <div>
      <div><p className="eyebrow">Student discovery</p><h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Find the right peer</h1><p className="mt-2 text-sm text-muted">Search verified NST students by what they know, enjoy, and want to build.</p></div>
      <form className="surface mt-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5" method="get">
        <div className="relative sm:col-span-2 lg:col-span-5"><FiSearch className="absolute left-3.5 top-3.5 text-muted" /><input className="field !pl-10" name="q" defaultValue={filters.q} placeholder="Name, username, skill, or goal" /></div>
        <select className="field" name="campus" defaultValue={filters.campus ?? ""}><option value="">All campuses</option>{campuses.map((campus) => <option key={campus.id} value={campus.slug}>{campus.name}</option>)}</select>
        <input className="field" name="skill" defaultValue={filters.skill} placeholder="Skill e.g. React" />
        <input className="field" name="interest" defaultValue={filters.interest} placeholder="Interest e.g. GSoC" />
        <select className="field" name="year" defaultValue={filters.year ?? ""}><option value="">All years</option>{studyYears.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
        <button className="button button-primary" type="submit">Search</button>
      </form>
      <div className="mt-6 flex items-center justify-between"><p className="text-sm font-semibold">{refined.length} student{refined.length === 1 ? "" : "s"}</p>{Object.values(filters).some(Boolean) && <a className="text-xs font-bold text-muted hover:text-font" href="/discover">Clear filters</a>}</div>
      {refined.length ? <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{refined.map((student) => <StudentCard key={student.id} student={student} currentId={user.id} connection={connectionMap.get(student.id)} />)}</div> : <div className="mt-4"><EmptyState icon={<FiUsers size={21} />} title="No students match yet" copy="Try a broader search, remove one filter, or check back as more verified students join." /></div>}
    </div>
  );
}
