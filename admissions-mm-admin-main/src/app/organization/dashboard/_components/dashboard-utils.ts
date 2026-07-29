import { type Application } from "@/data/mock-applications";

export function formatDate(dateStr: string): string {
  if (!dateStr) return "N/A";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch (e) {
    return dateStr;
  }
}

export function matchesSearch(app: Application, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    (app.name?.toLowerCase().includes(q) ?? false) ||
    (app.email?.toLowerCase().includes(q) ?? false) ||
    (app.applicationNo?.toLowerCase().includes(q) ?? false)
  );
}

export function matchesProgram(app: Application, program: string): boolean {
  return !program || app.program === program;
}

export function matchesCampus(app: Application, campus: string): boolean {
  return !campus || app.campus === campus;
}

export function matchesStatus(app: Application, status: string): boolean {
  if (status === "all") return true;
  let mappedStatus = "Pending";
  if (app.formStatus === "Accepted") mappedStatus = "Verified";
  else if (app.formStatus === "Rejected") mappedStatus = "Rejected";
  return mappedStatus === status;
}

export function getBadgeStyles(mappedStatus: string): string {
  if (mappedStatus === "Verified") {
    return "bg-[#D1FAE5] text-[#065F46]";
  }
  if (mappedStatus === "Rejected") {
    return "bg-[#FFE4E6] text-[#9F1239]";
  }
  return "bg-[#FEF3C7] text-[#92400e]";
}
