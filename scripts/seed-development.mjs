import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const confirmed = process.env.PEERGRID_SEED_CONFIRM === "yes";
const requestedCount = Number(process.env.PEERGRID_SEED_USERS ?? 250);
const userCount = Math.min(Math.max(Number.isFinite(requestedCount) ? requestedCount : 250, 10), 1000);
const emailDomain = process.env.PEERGRID_SEED_EMAIL_DOMAIN;

if (!url || !serviceRoleKey || !emailDomain) {
  throw new Error("Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and PEERGRID_SEED_EMAIL_DOMAIN.");
}
if (!confirmed || process.env.NODE_ENV === "production") {
  throw new Error("Development seed blocked. Set PEERGRID_SEED_CONFIRM=yes outside production.");
}
if (!/^(localhost|127\.0\.0\.1)$/.test(new URL(url).hostname) && process.env.PEERGRID_ALLOW_REMOTE_SEED !== "yes") {
  throw new Error("Remote seed blocked. Set PEERGRID_ALLOW_REMOTE_SEED=yes only for a disposable staging project.");
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const firstNames = ["Aarav", "Aditi", "Arjun", "Diya", "Ishaan", "Kavya", "Meera", "Rohan", "Sana", "Vihaan"];
const lastNames = ["Agarwal", "Gupta", "Iyer", "Jain", "Kapoor", "Mehta", "Nair", "Patel", "Rao", "Sharma"];
const programs = ["BTech CSE", "BTech AI ML", "BTech Data Science", "BTech Cybersecurity"];
const skills = ["React", "TypeScript", "Python", "UI Design", "FastAPI", "PostgreSQL", "Machine Learning", "Flutter"];
const statuses = ["Open to projects", "Looking for a hackathon team", "Learning in public", "Open to open-source collaboration"];
const runId = Date.now().toString(36);

const { data: campusRows, error: campusError } = await supabase.from("campuses").select("id").eq("is_active", true);
if (campusError || !campusRows?.length) throw campusError ?? new Error("No campuses found.");

const users = [];
for (let index = 0; index < userCount; index += 1) {
  const fullName = `${firstNames[index % firstNames.length]} ${lastNames[Math.floor(index / firstNames.length) % lastNames.length]}`;
  const email = `seed-${runId}-${index}@${emailDomain}`;
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: `Seed-${runId}-${index}-Aa1!`,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error || !data.user) throw error ?? new Error(`Could not create ${email}`);
  users.push({ id: data.user.id, fullName, index });
}

const profileRows = users.map(({ id, fullName, index }) => ({
  id,
  full_name: fullName,
  username: `seed_${runId}_${index}`.slice(0, 30),
  campus_id: campusRows[index % campusRows.length].id,
  graduation_year: 2027 + (index % 4),
  program: programs[index % programs.length],
  current_status: statuses[index % statuses.length],
  bio: `Interested in ${skills[index % skills.length]} and student-led projects.`,
  goals: "Looking for peers to build practical projects with.",
  is_verified: true,
}));
const approvalRows = users.map(({ id, index }) => ({
  user_id: id,
  email: `seed-${runId}-${index}@${emailDomain}`,
  status: "approved",
  reviewed_at: new Date().toISOString(),
}));

for (let index = 0; index < profileRows.length; index += 200) {
  const { error: profileError } = await supabase.from("profiles").upsert(profileRows.slice(index, index + 200));
  if (profileError) throw profileError;
  const { error: approvalError } = await supabase.from("student_approvals").upsert(approvalRows.slice(index, index + 200));
  if (approvalError) throw approvalError;
}

const { error: skillUpsertError } = await supabase
  .from("skills")
  .upsert(skills.map((name) => ({ name })), { onConflict: "name", ignoreDuplicates: true });
if (skillUpsertError) throw skillUpsertError;
const { data: skillRows, error: skillReadError } = await supabase.from("skills").select("id, name").in("name", skills);
if (skillReadError) throw skillReadError;
const skillIds = new Map((skillRows ?? []).map((skill) => [String(skill.name), skill.id]));
const profileSkills = users.flatMap((user) => [0, 1].map((offset) => ({
  profile_id: user.id,
  skill_id: skillIds.get(skills[(user.index + offset) % skills.length]),
})));
const canHelp = users.map((user) => ({
  profile_id: user.id,
  skill_id: skillIds.get(skills[user.index % skills.length]),
}));
const needsHelp = users.map((user) => ({
  profile_id: user.id,
  skill_id: skillIds.get(skills[(user.index + 2) % skills.length]),
}));
for (const [table, rows] of [["profile_skills", profileSkills], ["profile_can_help", canHelp], ["profile_needs_help", needsHelp]]) {
  for (let index = 0; index < rows.length; index += 500) {
    const { error } = await supabase.from(table).insert(rows.slice(index, index + 500));
    if (error) throw error;
  }
}

const follows = [];
for (let index = 0; index < users.length; index += 1) {
  for (let step = 1; step <= Math.min(8, users.length - 1); step += 1) {
    follows.push({ follower_id: users[index].id, following_id: users[(index + step) % users.length].id });
  }
}
const posts = users.flatMap((user) => [0, 1, 2].map((postIndex) => ({
  author_id: user.id,
  body: `${user.fullName} is sharing seed post ${postIndex + 1}: building with ${skills[(user.index + postIndex) % skills.length]}.`,
  created_at: new Date(Date.now() - (user.index * 3 + postIndex) * 60000).toISOString(),
})));
const collaborations = users.filter((_, index) => index % 5 === 0).map((user) => ({
  author_id: user.id,
  campus_id: campusRows[user.index % campusRows.length].id,
  title: `Looking for a ${skills[user.index % skills.length]} collaborator`,
  description: "Building a student project and looking for one or two peers to validate and ship the first version.",
  tags: [skills[user.index % skills.length], skills[(user.index + 1) % skills.length]],
  collaboration_type: ["project", "hackathon", "open_source", "startup"][user.index % 4],
  required_skills: [skills[user.index % skills.length], skills[(user.index + 1) % skills.length]],
  team_current: 2,
  team_capacity: 4,
  commitment: "4 weeks · 4 hours/week",
}));

for (const [table, rows] of [["follows", follows], ["social_posts", posts], ["collaboration_posts", collaborations]]) {
  for (let index = 0; index < rows.length; index += 500) {
    const { error } = await supabase.from(table).insert(rows.slice(index, index + 500));
    if (error) throw error;
  }
}

const conversationRows = [];
for (let index = 0; index + 1 < users.length; index += 4) {
  const pair = [users[index].id, users[index + 1].id].sort();
  conversationRows.push({ participant_low: pair[0], participant_high: pair[1] });
}
const { data: conversations, error: conversationError } = await supabase
  .from("conversations")
  .insert(conversationRows)
  .select("id, participant_low, participant_high");
if (conversationError) throw conversationError;

// Direct messages are intentionally not server-seeded. E2EE payloads must be
// created and signed by a registered user device; generating them with the
// service role would violate the product's encryption boundary.
console.info(`Created ${users.length} development users, ${posts.length} posts, ${follows.length} follows, and ${(conversations ?? []).length} empty conversations (run ${runId}).`);
