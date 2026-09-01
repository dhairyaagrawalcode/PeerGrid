import type { ReactNode } from "react";
import Brand from "./brand";

export default function AuthShell({ eyebrow, title, copy, children }: { eyebrow: string; title: string; copy: string; children: ReactNode }) {
  return (
    <main className="grid min-h-screen bg-bg text-font lg:grid-cols-[.9fr_1.1fr]">
      <section className="flex items-center justify-center p-5 sm:p-8">
        <div className="w-full max-w-md">
          <Brand />
          <div className="mt-12">
            <p className="eyebrow">{eyebrow}</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{title}</h1>
            <p className="mt-3 text-sm leading-6 text-muted">{copy}</p>
          </div>
          {children}
        </div>
      </section>
      <aside className="relative hidden overflow-hidden border-l border-line bg-panel lg:flex lg:items-center lg:justify-center">
        <div className="absolute inset-x-0 top-0 h-px bg-primary" />
        <div className="relative max-w-md p-10">
          <p className="text-3xl font-black leading-tight tracking-tight">Your campus is full of people worth knowing.</p>
          <p className="mt-4 leading-7 text-muted">Find teammates, mentors, builders, and friends across all four NST campuses—inside one verified network.</p>
          <div className="mt-8 grid grid-cols-2 gap-3 text-sm">
            {["Bangalore", "Pune", "Delhi NCR", "Hyderabad"].map((campus) => <span className="surface !rounded-xl !bg-panel p-3" key={campus}>NST {campus}</span>)}
          </div>
        </div>
      </aside>
    </main>
  );
}
