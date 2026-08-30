import { FiSearch, FiUsers } from "react-icons/fi";
import EmptyState from "@/app/components/empty-state";
import StudentResult from "@/app/components/student-result";
import { requireStudent } from "@/app/lib/auth";
import { getCampuses, getFollows, getStudents } from "@/app/lib/data";

type Search = { q?: string; campus?: string; skill?: string; interest?: string; year?: string };

export default async function DiscoverPage({ searchParams }: { searchParams: Promise<Search> }) {
  const filters = await searchParams;
  const { supabase, user } = await requireStudent();
  const [students, campuses, follows] = await Promise.all([
    getStudents(supabase, user.id),
    getCampuses(supabase),
    getFollows(supabase, user.id),
  ]);
  const normalized = Object.fromEntries(Object.entries(filters).map(([key, value]) => [key, value?.trim().toLowerCase()])) as Search;
  const filtered = students.filter((student) => {
    const searchable = [student.full_name, student.username, student.bio, student.goals, student.program, ...(student.skills?.map((item) => item.name) ?? []), ...(student.interests?.map((item) => item.name) ?? [])].filter(Boolean).join(" ").toLowerCase();
    return (!normalized.q || searchable.includes(normalized.q))
      && (!normalized.campus || student.campus?.slug === normalized.campus)
      && (!normalized.skill || student.skills?.some((item) => item.name.toLowerCase().includes(normalized.skill!)))
      && (!normalized.interest || student.interests?.some((item) => item.name.toLowerCase().includes(normalized.interest!)));
  });
  const following = new Set(follows.filter((item) => item.follower_id === user.id).map((item) => item.following_id));
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
    <div className="mx-auto max-w-[900px]">
      <header>
        <p className="eyebrow">Discover</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Find people</h1>
        <p className="mt-2 text-sm text-muted">Search the verified NST community by name, campus, skills, or interests.</p>
      </header>

      <form className="mt-7 border-y border-line py-5" method="get">
        <div className="relative">
          <FiSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={17} />
          <input
            autoComplete="off"
            className="field !min-h-12 !rounded-full !bg-panel !pl-11"
            defaultValue={filters.q}
            name="q"
            placeholder="Search by name, username, skill, or interest"
          />
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-[1.25fr_1fr_1fr_1fr_auto]">
          <select className="field" name="campus" defaultValue={filters.campus ?? ""}>
            <option value="">All campuses</option>
            {campuses.map((campus) => <option key={campus.id} value={campus.slug}>{campus.name}</option>)}
          </select>
          <input className="field" name="skill" defaultValue={filters.skill} placeholder="Skill" />
          <input className="field" name="interest" defaultValue={filters.interest} placeholder="Interest" />
          <select className="field" name="year" defaultValue={filters.year ?? ""}>
            <option value="">All years</option>
            {studyYears.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <button className="button button-primary" type="submit">Search</button>
        </div>
      </form>

      <div className="mt-7 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold">People</h2>
          <p className="mt-0.5 text-xs text-muted">{refined.length} result{refined.length === 1 ? "" : "s"}</p>
        </div>
        {Object.values(filters).some(Boolean) && <a className="text-xs font-bold text-secondary hover:text-font" href="/discover">Clear filters</a>}
      </div>
      {refined.length ? (
        <div className="mt-3 divide-y divide-line border-y border-line">
          {refined.map((student) => (
            <StudentResult key={student.id} student={student} currentId={user.id} isFollowing={following.has(student.id)} />
          ))}
        </div>
      ) : (
        <div className="mt-4"><EmptyState icon={<FiUsers size={20} />} title="No students found" copy="Try a broader search or remove one of the filters." /></div>
      )}
    </div>
  );
}
