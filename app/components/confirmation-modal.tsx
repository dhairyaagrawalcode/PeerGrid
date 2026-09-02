"use client";
import { useEffect, useRef } from "react";
import { FiLoader, FiX } from "react-icons/fi";

export default function ConfirmationModal({ open, title, description, confirmLabel, pending = false, destructive = true, onCancel, onConfirm }: { open: boolean; title: string; description: string; confirmLabel: string; pending?: boolean; destructive?: boolean; onCancel: () => void; onConfirm: () => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) { if (event.key === "Escape" && !pending) onCancel(); }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onCancel, open, pending]);
  if (!open) return null;
  return <div aria-label={title} aria-modal="true" className="fixed inset-0 z-[100] grid place-items-center bg-black/75 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) onCancel(); }} role="dialog"><div className="w-full max-w-sm rounded-2xl border border-line bg-panel p-5 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><h2 className="text-base font-bold">{title}</h2><p className="mt-2 text-sm leading-6 text-muted">{description}</p></div><button aria-label="Close confirmation" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-card hover:text-font" disabled={pending} onClick={onCancel} type="button"><FiX /></button></div><div className="mt-6 flex justify-end gap-2"><button className="button button-secondary" disabled={pending} onClick={onCancel} ref={cancelRef} type="button">Cancel</button><button className={`button ${destructive ? "button-danger" : "button-primary"}`} disabled={pending} onClick={onConfirm} type="button">{pending && <FiLoader className="animate-spin" />}{pending ? `${confirmLabel}…` : confirmLabel}</button></div></div></div>;
}
