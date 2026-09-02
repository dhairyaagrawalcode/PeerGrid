"use client";
import { useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import ConfirmationModal from "./confirmation-modal";

export default function ConfirmedSubmitButton({ children, className, title, description, confirmLabel, ariaLabel }: { children: ReactNode; className: string; title: string; description: string; confirmLabel: string; ariaLabel?: string }) {
  const { pending } = useFormStatus();
  const [open, setOpen] = useState(false);
  const submitRef = useRef<HTMLButtonElement>(null);
  return <><button aria-label={ariaLabel} className={className} disabled={pending} onClick={() => setOpen(true)} type="button">{children}</button><button className="hidden" ref={submitRef} tabIndex={-1} type="submit" /><ConfirmationModal confirmLabel={confirmLabel} description={description} onCancel={() => { if (!pending) setOpen(false); }} onConfirm={() => submitRef.current?.click()} open={open} pending={pending} title={title} /></>;
}
