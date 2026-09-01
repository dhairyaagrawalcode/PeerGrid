"use client";

import { useEffect } from "react";
import { recordCollaborationViews } from "@/app/actions/recommendations";

export default function CollaborationViewTracker({ ids }: { ids: string[] }) {
  useEffect(() => {
    void recordCollaborationViews(ids);
  }, [ids]);

  return null;
}
