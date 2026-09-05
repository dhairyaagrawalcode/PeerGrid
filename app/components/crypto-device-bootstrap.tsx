"use client";

import { useEffect, useMemo } from "react";
import { createClient } from "@/app/lib/supabase/client";

export default function CryptoDeviceBootstrap({ userId }: { userId: string }) {
  const supabase = useMemo(() => createClient(), []);
  useEffect(() => {
    // Keep device registration, but split sodium out of non-messaging page JS.
    // MessageThread independently ensures the device before encrypting/decrypting.
    let disposed = false;
    const timer = setTimeout(() => {
      void import("@/app/lib/e2ee").then(({ ensureCryptoDevice }) => {
        if (!disposed) return ensureCryptoDevice(userId, supabase);
      }).catch(() => {
        // MessageThread presents an actionable error if a user opens DMs.
      });
    }, 250);
    return () => { disposed = true; clearTimeout(timer); };
  }, [supabase, userId]);
  return null;
}
