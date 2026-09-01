export type ModerationDecision = {
  status: "published" | "held" | "rejected";
  reason: string | null;
};

export function moderateContent(content: string): ModerationDecision {
  const normalized = content.toLowerCase().replace(/\s+/g, " ").trim();
  if (/(kill yourself|i will kill you|rape you|send nudes|child porn|n[i1]gg[e3]r)/i.test(normalized)) {
    return { status: "rejected", reason: "Clearly abusive or inappropriate content" };
  }
  if (/\b(fuck|bitch|asshole|cunt|porn|nudes)\b/i.test(normalized)) {
    return { status: "held", reason: "Potentially abusive or inappropriate language" };
  }
  const linkCount = normalized.match(/https?:\/\/|www\./g)?.length ?? 0;
  if (
    linkCount >= 3
    || /(bit\.ly|tinyurl\.com|t\.me\/|wa\.me\/|xn--|https?:\/\/[0-9]{1,3}(\.[0-9]{1,3}){3})/i.test(normalized)
    || /(guaranteed returns|double your money|buy followers|free crypto|limited time offer)/i.test(normalized)
    || /(.)\1{11,}/i.test(normalized)
  ) {
    return { status: "held", reason: "Possible spam or suspicious link" };
  }
  return { status: "published", reason: null };
}
