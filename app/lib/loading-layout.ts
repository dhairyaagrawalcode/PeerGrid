export type PageSkeletonKind = "feed" | "profile" | "discover" | "collaborate" | "messages" | "thread" | "post" | "edit-profile" | "notifications" | "connections" | "report" | "generic";

// Both the auth-shell and shared route fallback resolve the destination layout.
// Match nested routes before their parent (e.g. edit vs. profile).
export function getLoadingLayout(pathname: string): PageSkeletonKind {
  const segments = pathname.split("/").filter(Boolean);
  switch (segments[0]) {
    case "feed": return "feed";
    case "profile": return segments[1] === "edit" ? "edit-profile" : "profile";
    case "students": return "profile";
    case "discover": return "discover";
    case "collaborate":
    case "collaboration": return "collaborate";
    case "messages": return segments[1] ? "thread" : "messages";
    case "post": return "post";
    case "notifications": return "notifications";
    case "connections": return "connections";
    case "report-problem": return "report";
    default: return "generic";
  }
}
