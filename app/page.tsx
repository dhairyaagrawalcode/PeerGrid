import Link from "next/link";
import {
  FiArrowRight,
  FiCheckCircle,
  FiCompass,
  FiLayers,
  FiShield,
  FiUsers,
} from "react-icons/fi";
import Brand from "@/app/components/brand";

const campuses = ["Bangalore", "Pune", "Delhi NCR", "Hyderabad"];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-bg text-font">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_50%_0%,rgba(108,99,255,0.2),transparent_58%)]" />
      <header className="relative z-10 mx-auto flex h-18 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Brand />
        
      </header>

      <section className="relative z-10 mx-auto grid max-w-6xl gap-12 px-5 pb-20 pt-14 sm:px-8 md:pt-24 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
        <div>
          <div className="eyebrow mb-5">
            <FiShield /> Verified NST students only
          </div>
          <h1 className="max-w-3xl text-5xl font-black leading-[1.02] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
            Find your people. <span className="gradient-text">Build what&apos;s next.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-muted sm:text-lg">
            PeerGrid helps NST students discover peers by campus, skills,
            interests, projects, and the goals they are chasing right now.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link className="button button-primary" href="/auth/signup">
              Join with college email <FiArrowRight />
            </Link>
            <Link className="button button-secondary" href="/auth/login">
              I already have an account
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-2">
            {campuses.map((campus) => (
              <span className="chip" key={campus}>
                <FiCheckCircle /> NST {campus}
              </span>
            ))}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-lg">
          <div className="absolute -inset-8 rounded-full bg-primary/10 blur-3xl" />
          <div className="surface relative overflow-hidden p-5 sm:p-7">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="eyebrow !mb-0">Discovery preview</p>
                <h2 className="mt-2 text-xl font-bold">React builders in Bangalore</h2>
              </div>
              <FiCompass className="text-secondary" size={24} />
            </div>
            <div className="space-y-3">
              {[
                ["01", "React developers", "NST Bangalore", "React", "Frontend"],
                ["02", "Students interested in GSoC", "All NST campuses", "Open source", "GSoC"],
                ["03", "People exploring startups", "NST Pune", "Startups", "Product"],
              ].map(([initial, name, detail, tagA, tagB]) => (
                <div className="rounded-2xl border border-white/6 bg-white/[0.025] p-4" key={name}>
                  <div className="flex items-center gap-3">
                    <div className="avatar">{initial}</div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{name}</p>
                      <p className="truncate text-xs text-muted">{detail}</p>
                    </div>
                    <span className="status-dot" />
                  </div>
                  <div className="mt-3 flex gap-2">
                    <span className="tag">{tagA}</span>
                    <span className="tag">{tagB}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/6 bg-white/[0.015]">
        <div className="mx-auto grid max-w-6xl gap-5 px-5 py-12 sm:px-8 md:grid-cols-3">
          {[
            [FiUsers, "Discover peers", "Search verified students by campus, skill, interest, or goal."],
            [FiLayers, "Find collaborators", "Post what you are building and the teammates you need."],
            [FiShield, "Trust the network", "College-email verification keeps PeerGrid focused and useful."],
          ].map(([Icon, title, copy]) => {
            const ItemIcon = Icon as typeof FiUsers;
            return (
              <article className="rounded-2xl p-5" key={String(title)}>
                <ItemIcon className="mb-4 text-secondary" size={22} />
                <h3 className="font-bold">{String(title)}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{String(copy)}</p>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
