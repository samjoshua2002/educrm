import { ReactNode } from "react";

// Minimal layout for fully public, unauthenticated routes (e.g. the public
// student application form). Renders no sidebar, no header, and enforces
// no authentication — just the page content.
export default function PublicApplicationLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return <>{children}</>;
}
