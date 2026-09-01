import { Fragment } from "react";

const urlPattern = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;
const trailingPunctuation = /[),.!?;:]+$/;

export default function PostBody({ text, className = "" }: { text: string; className?: string }) {
  const parts: Array<{ text: string; href?: string }> = [];
  let cursor = 0;

  for (const match of text.matchAll(urlPattern)) {
    const index = match.index ?? 0;
    if (index > cursor) parts.push({ text: text.slice(cursor, index) });
    const matched = match[0];
    const punctuation = matched.match(trailingPunctuation)?.[0] ?? "";
    const value = punctuation ? matched.slice(0, -punctuation.length) : matched;
    parts.push({
      text: value,
      href: value.toLowerCase().startsWith("www.") ? `https://${value}` : value,
    });
    if (punctuation) parts.push({ text: punctuation });
    cursor = index + matched.length;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor) });

  return (
    <p className={`whitespace-pre-wrap break-words ${className}`}>
      {parts.map((part, index) => part.href ? (
        <a className="break-all text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary" href={part.href} key={`${part.href}-${index}`} rel="noopener noreferrer" target="_blank">{part.text}</a>
      ) : <Fragment key={`text-${index}`}>{part.text}</Fragment>)}
    </p>
  );
}
