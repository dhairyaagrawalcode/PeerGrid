"use client";
import { FiLoader } from "react-icons/fi";
import { useFormStatus } from "react-dom";
export default function FormSubmitButton({ children, pendingLabel, className = "button button-primary", disabled = false }: { children: React.ReactNode; pendingLabel: string; className?: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return <button aria-disabled={pending || disabled} className={className} disabled={pending || disabled} type="submit">{pending ? <><FiLoader className="animate-spin" />{pendingLabel}</> : children}</button>;
}
