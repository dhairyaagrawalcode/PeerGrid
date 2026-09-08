"use client";

/* eslint-disable @next/next/no-img-element -- Decrypted attachment previews are short-lived local object URLs. */

import { useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { FiAlertCircle, FiDownload, FiFileText, FiLoader } from "react-icons/fi";
import { decryptMessageAttachment } from "@/app/lib/e2ee";
import { MESSAGE_ATTACHMENT_MAX_BYTES, readableAttachmentSize } from "@/app/lib/message-attachment";
import type { EncryptedMessageAttachment, MessageAttachmentKind } from "@/app/types";

export default function EncryptedMessageAttachment({ attachment, conversationId, messageId, storedKind, storedPath, storedSize, supabase }: {
  attachment: EncryptedMessageAttachment;
  conversationId: string;
  messageId: string;
  storedKind: MessageAttachmentKind | null;
  storedPath: string | null;
  storedSize: number | null;
  supabase: SupabaseClient;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [nearViewport, setNearViewport] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { key, kind, mime, name, nonce, path, size } = attachment;

  useEffect(() => {
    const node = containerRef.current;
    if (!node || nearViewport) return;
    if (typeof IntersectionObserver === "undefined") {
      const timer = setTimeout(() => setNearViewport(true), 0);
      return () => clearTimeout(timer);
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setNearViewport(true);
        observer.disconnect();
      }
    }, { rootMargin: "400px 0px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [nearViewport]);

  useEffect(() => {
    if (!nearViewport) return;
    let objectUrl: string | null = null;
    let cancelled = false;
    const controller = new AbortController();
    void (async () => {
      try {
        setError(false);
        setUrl(null);
        const descriptor = { version: 1 as const, key, kind, mime, name, nonce, path, size };
        if (path !== storedPath || kind !== storedKind || size !== storedSize) throw new Error("Attachment metadata mismatch");
        const { data, error: signedUrlError } = await supabase.storage.from("message-media").createSignedUrl(path, 120);
        if (signedUrlError || !data?.signedUrl) throw signedUrlError ?? new Error("Missing attachment URL");
        const response = await fetch(data.signedUrl, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("Attachment download failed");
        const encrypted = new Uint8Array(await response.arrayBuffer());
        if (encrypted.byteLength > MESSAGE_ATTACHMENT_MAX_BYTES + 64) throw new Error("Attachment is too large");
        let plaintext: Uint8Array;
        try {
          plaintext = await decryptMessageAttachment({ attachment: descriptor, conversationId, messageId, encrypted });
        } finally {
          encrypted.fill(0);
        }
        if (cancelled) { plaintext.fill(0); return; }
        objectUrl = URL.createObjectURL(new Blob([plaintext as BlobPart], { type: mime }));
        plaintext.fill(0);
        setUrl(objectUrl);
      } catch (caught) {
        if (!cancelled && !(caught instanceof DOMException && caught.name === "AbortError")) setError(true);
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [conversationId, key, kind, messageId, mime, name, nearViewport, nonce, path, size, storedKind, storedPath, storedSize, supabase]);

  return <div ref={containerRef}>
    {error ? <div className="flex max-w-72 items-center gap-2 rounded-xl border border-line bg-panel p-3 text-xs text-muted"><FiAlertCircle className="shrink-0" />This encrypted attachment is unavailable.</div>
      : !url ? <div className="flex max-w-72 items-center gap-2 rounded-xl border border-line bg-panel p-3 text-xs text-muted"><FiLoader className={`shrink-0 ${nearViewport ? "animate-spin" : ""}`} />{nearViewport ? "Decrypting attachment…" : "Encrypted attachment"}</div>
        : attachment.kind === "image" ? <a aria-label={`Open ${attachment.name}`} className="block overflow-hidden rounded-2xl border border-line bg-black/20" href={url} rel="noreferrer" target="_blank"><img alt={attachment.name} className="h-auto max-h-[min(56vh,440px)] w-auto max-w-[min(78vw,420px)] object-contain" decoding="async" src={url} /></a>
          : attachment.kind === "video" ? <div className="overflow-hidden rounded-2xl border border-line bg-black"><video className="h-auto max-h-[min(56vh,440px)] w-auto max-w-[min(78vw,420px)] object-contain" controls playsInline preload="metadata" src={url} /></div>
            : <a className="flex max-w-72 items-center gap-3 rounded-2xl border border-line bg-panel p-3 hover:border-muted" download={attachment.name} href={url}><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-card text-subtle"><FiFileText size={19} /></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-font">{attachment.name}</span><span className="mt-1 block text-[10px] text-muted">{readableAttachmentSize(attachment.size)} · Download</span></span><FiDownload className="shrink-0 text-muted" /></a>}
  </div>;
}
