import Link from "next/link";
import type { ReactNode } from "react";

type ResponsivePostLinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
  title?: string;
  "aria-label"?: string;
  "aria-current"?: "page";
};

export default function ResponsivePostLink({
  href,
  className = "",
  children,
  ...props
}: ResponsivePostLinkProps) {
  return (
    <>
      {/* Native navigation bypasses route interception for the mobile full page. */}
      <a {...props} className={`${className} responsive-post-link-mobile`} href={href}>
        {children}
      </a>
      <Link {...props} className={`${className} responsive-post-link-desktop`} href={href}>
        {children}
      </Link>
    </>
  );
}
