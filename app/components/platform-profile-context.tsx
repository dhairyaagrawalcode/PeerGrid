"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { StudentProfile } from "@/app/types";

const PlatformProfileContext = createContext<StudentProfile | null>(null);

export function PlatformProfileProvider({ profile, children }: { profile: StudentProfile; children: ReactNode }) {
  return <PlatformProfileContext.Provider value={profile}>{children}</PlatformProfileContext.Provider>;
}

export function usePlatformProfile() {
  const profile = useContext(PlatformProfileContext);
  if (!profile) throw new Error("Platform profile is unavailable.");
  return profile;
}
