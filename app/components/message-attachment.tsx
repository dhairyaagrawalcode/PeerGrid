"use client";

/* Signed private message-media URLs cannot be optimized safely by Next's image proxy. */
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import { FiAlertCircle, FiDownload, FiFileText, FiLoader } from "react-icons/fi";
import type { SupabaseClient } from "@supabase/supabase-js";
import { readableAttachmentSize } from "@/app/lib/message-attachment";
import type { MessageAttachmentKind } from "@/app/types";

export default function MessageAttachment({ kind, mime, name, path, size, supabase }: {
  kind: MessageAttachmentKind;
  mime: string;
  name: string;
  path: string;
  size: number | null;
  supabase: SupabaseClient;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [nearViewport, setNearViewport] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node || nearViewport) return;
    if (typeof IntersectionObserver === "undefined") {
      const timer = setTimeout(() => setNearViewport(true), 0);
      return () => clearTimeout(timer);
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setNearViewport(true); observer.disconnect(); }
    }, { rootMargin: "400px 0px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [nearViewport]);

  useEffect(() => {
    if (!nearViewport) return;
    let cancelled = false;
    void supabase.storage.from("message-media").createSignedUrl(path, 120).then(({ data, error: signedError }) => {
      if (cancelled) return;
      if (signedError || !data?.signedUrl) setError(true);
      else setUrl(data.signedUrl);
    });
    return () => { cancelled = true; };
  }, [nearViewport, path, supabase]);

  return <div className="message-attachment min-w-0" ref={containerRef}>
    {error ? <div className="flex max-w-72 items-center gap-2 rounded-xl border border-line bg-panel p-3 text-xs text-muted"><FiAlertCircle className="shrink-0" />This attachment is unavailable.</div>
      : !url ? <div className="flex max-w-72 items-center gap-2 rounded-xl border border-line bg-panel p-3 text-xs text-muted"><FiLoader className={`shrink-0 ${nearViewport ? "animate-spin" : ""}`} />{nearViewport ? "Loading attachment…" : "Attachment"}</div>
        : kind === "image" ? <a aria-label={`Open ${name}`} className="block overflow-hidden rounded-2xl border border-line bg-black/20" href={url} rel="noreferrer" target="_blank"><img alt={name} className="block h-auto max-h-[min(56vh,440px)] w-auto max-w-[min(78vw,420px)] object-contain" decoding="async" src={url} /></a>
          : kind === "video" ? <div className="overflow-hidden rounded-2xl border border-line bg-black"><video className="block h-auto max-h-[min(56vh,440px)] w-auto max-w-[min(78vw,420px)] object-contain" controls playsInline preload="metadata" src={url} /></div>
            : <a className="flex max-w-72 min-w-0 items-center gap-3 rounded-2xl border border-line bg-panel p-3 hover:border-muted" download={name} href={url}><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-card text-subtle"><FiFileText size={19} /></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-font">{name}</span><span className="mt-1 block truncate text-[10px] text-muted">{mime === "application/pdf" ? "PDF" : "Document"}{size ? ` · ${readableAttachmentSize(size)}` : ""} · Open</span></span><FiDownload className="shrink-0 text-muted" /></a>}
  </div>;
}
