"use client";

import { useEffect, useMemo } from "react";
import { ensureCryptoDevice } from "@/app/lib/e2ee";
import { createClient } from "@/app/lib/supabase/client";

export default function CryptoDeviceBootstrap({ userId }: { userId: string }) {
  const supabase = useMemo(() => createClient(), []);
  useEffect(() => {
    void ensureCryptoDevice(userId, supabase).catch(() => {
      // MessageThread presents an actionable error if a user opens DMs.
    });
  }, [supabase, userId]);
  return null;
}
