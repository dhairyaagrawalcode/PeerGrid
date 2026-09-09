import type { MessageAttachmentKind } from "@/app/types";

export const MESSAGE_ATTACHMENT_MAX_BYTES = 25 * 1024 * 1024;

const mimeKinds = new Map<string, MessageAttachmentKind>([
  ["image/jpeg", "image"],
  ["image/png", "image"],
  ["image/webp", "image"],
  ["image/gif", "image"],
  ["video/mp4", "video"],
  ["video/webm", "video"],
  ["video/quicktime", "video"],
  ["application/pdf", "document"],
  ["application/msword", "document"],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "document"],
  ["application/vnd.ms-powerpoint", "document"],
  ["application/vnd.openxmlformats-officedocument.presentationml.presentation", "document"],
  ["application/vnd.ms-excel", "document"],
  ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "document"],
  ["text/plain", "document"],
  ["text/csv", "document"],
]);

export const MESSAGE_ATTACHMENT_ACCEPT = [...mimeKinds.keys()].join(",");

export function getMessageAttachmentKind(mime: string) {
  return mimeKinds.get(mime.toLowerCase()) ?? null;
}

export function sanitizeMessageFilename(name: string) {
  const normalized = name.normalize("NFKC").replace(/[\u0000-\u001f\u007f/\\]+/g, "-").trim();
  return (normalized || "attachment").slice(0, 180);
}

export function validateMessageAttachment(file: Pick<File, "name" | "size" | "type">) {
  const kind = getMessageAttachmentKind(file.type);
  if (!kind) return { error: "Choose a JPG, PNG, WebP, GIF, MP4, WebM, MOV, PDF, Office, text, or CSV file." } as const;
  if (file.size < 1 || file.size > MESSAGE_ATTACHMENT_MAX_BYTES) return { error: "Message attachments can be up to 25 MB." } as const;
  return { kind, name: sanitizeMessageFilename(file.name), mime: file.type.toLowerCase() } as const;
}

export function readableAttachmentSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.ceil(bytes / 1024))} KB`;
}
