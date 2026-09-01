"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { FiRefreshCw } from "react-icons/fi";

export default function ApprovalRefresh() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      className="button button-primary w-full"
      disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
      type="button"
    >
      <FiRefreshCw className={pending ? "animate-spin" : ""} />
      {pending ? "Checking…" : "Check approval status"}
    </button>
  );
}

