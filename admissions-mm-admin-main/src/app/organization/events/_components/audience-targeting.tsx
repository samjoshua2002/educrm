"use client";

import * as React from "react";
import { Loader2, Mail, Phone, Users } from "lucide-react";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAnalyticsFilterOptions } from "@/hooks/use-analytics";
import { useAudiencePreview } from "@/hooks/use-events";
import type { AudienceTargeting } from "@/types/events";

/** Audience segments understood by the backend (events/event-delivery.service.ts). */
export const AUDIENCE_SEGMENTS = [
  { id: "all", label: "Everyone (All Staff + Students)" },
  { id: "staff", label: "All Staff" },
  { id: "student", label: "Enrolled Students" },
  { id: "lead", label: "Leads (by stage / source)" },
  { id: "applicant", label: "Applicants (by application status)" },
  { id: "org_admin", label: "Admins" },
  { id: "counselor", label: "Counselors" },
  { id: "lead_manager", label: "Lead Managers" },
  { id: "application_manager", label: "Application Managers" },
  { id: "exam_manager", label: "Exam Managers / Evaluators" },
];

export type TargetingValue = Required<Pick<AudienceTargeting, "targetAudience">> &
  Pick<AudienceTargeting, "targetLeadStages" | "targetLeadSources" | "targetApplicationStatuses" | "targetAcademicSession" | "targetBranchIds">;

export const EMPTY_TARGETING: TargetingValue = {
  targetAudience: ["all"],
  targetLeadStages: [],
  targetLeadSources: [],
  targetApplicationStatuses: [],
  targetAcademicSession: undefined,
  targetBranchIds: [],
};

/** Builds the API payload: segment-specific filters are dropped when their segment is not selected. */
export function targetingPayload(v: TargetingValue) {
  const aud = v.targetAudience;
  return {
    targetAudience: aud,
    targetLeadStages: aud.includes("lead") ? v.targetLeadStages || [] : [],
    targetLeadSources: aud.includes("lead") ? v.targetLeadSources || [] : [],
    targetApplicationStatuses: aud.includes("applicant") ? v.targetApplicationStatuses || [] : [],
    targetAcademicSession: v.targetAcademicSession || undefined,
    targetBranchIds: v.targetBranchIds || [],
  };
}

const humanize = (s: string) => s.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function Chips({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: { value: string; label: string; count?: number }[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-[12px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">{label}</Label>
      {options.length === 0 ? (
        <span className="text-[12px] text-muted-foreground">No values recorded yet</span>
      ) : (
        <div className="flex flex-wrap gap-2">
          {options.map((o) => {
            const on = selected.some((s) => s.toLowerCase() === o.value.toLowerCase());
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => onToggle(o.value)}
                className={`px-3 py-1 rounded-[6px] text-[12px] font-medium border transition-colors ${
                  on ? "bg-primary text-primary-foreground border-primary" : "bg-muted/30 text-muted-foreground border-input hover:bg-muted/60"
                }`}
              >
                {o.label}
                {o.count !== undefined && <span className="ml-1 opacity-70">({o.count})</span>}
              </button>
            );
          })}
        </div>
      )}
      <span className="text-[11px] text-muted-foreground">{selected.length ? `${selected.length} selected` : "None selected = all"}</span>
    </div>
  );
}

export function AudienceTargetingSection({
  value,
  onChange,
  courseId,
}: {
  value: TargetingValue;
  onChange: (v: TargetingValue) => void;
  /** Program filter chosen elsewhere on the form ("all" = none) */
  courseId?: string;
}) {
  const { data: opts } = useAnalyticsFilterOptions();
  const aud = value.targetAudience;

  const toggleSegment = (id: string) => {
    let next: string[];
    if (id === "all") next = ["all"];
    else {
      const rest = aud.filter((r) => r !== "all");
      next = rest.includes(id) ? rest.filter((r) => r !== id) : [...rest, id];
      if (next.length === 0) next = ["all"];
    }
    onChange({ ...value, targetAudience: next });
  };

  const toggleIn = (key: "targetLeadStages" | "targetLeadSources" | "targetApplicationStatuses" | "targetBranchIds", v: string) => {
    const cur = value[key] || [];
    const has = cur.some((x) => x.toLowerCase() === v.toLowerCase());
    onChange({ ...value, [key]: has ? cur.filter((x) => x.toLowerCase() !== v.toLowerCase()) : [...cur, v] });
  };

  // Debounced audience preview
  const payload = React.useMemo(
    () => ({ ...targetingPayload(value), targetCourseId: courseId && courseId !== "all" ? courseId : undefined }),
    [value, courseId],
  );
  const [debounced, setDebounced] = React.useState(payload);
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(payload), 500);
    return () => clearTimeout(t);
  }, [payload]);
  const { data: preview, isFetching } = useAudiencePreview(debounced);

  return (
    <section className="flex flex-col gap-5 py-6">
      <div className="flex flex-col gap-1">
        <p className="text-[16px] font-medium text-foreground">Target Audience</p>
        <p className="text-[14px] text-muted-foreground">
          Reach staff (by role / branch), enrolled students, leads (by stage / source / program) and applicants (by application status / program).
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {AUDIENCE_SEGMENTS.map((seg) => {
          const on = aud.includes(seg.id);
          return (
            <label
              key={seg.id}
              className={`border border-input h-[42px] rounded-[8px] text-[12px] flex items-center px-3 gap-2.5 cursor-pointer transition-colors ${
                on ? "bg-muted/40 font-medium text-foreground" : "text-muted-foreground hover:bg-muted/20"
              }`}
            >
              <input type="checkbox" checked={on} onChange={() => toggleSegment(seg.id)} className="size-4 rounded accent-primary cursor-pointer" />
              <span>{seg.label}</span>
            </label>
          );
        })}
      </div>

      {aud.includes("lead") && (
        <div className="flex flex-col gap-4 rounded-[8px] border border-input p-4">
          <Chips
            label="Lead stage"
            options={(opts?.leadStatuses || []).map((s) => ({ value: s.status, label: humanize(s.status), count: s.count }))}
            selected={value.targetLeadStages || []}
            onToggle={(v) => toggleIn("targetLeadStages", v)}
          />
          <Chips
            label="Lead source"
            options={(opts?.leadSources || []).map((s) => ({ value: s, label: s }))}
            selected={value.targetLeadSources || []}
            onToggle={(v) => toggleIn("targetLeadSources", v)}
          />
        </div>
      )}

      {aud.includes("applicant") && (
        <div className="flex flex-col gap-4 rounded-[8px] border border-input p-4">
          <Chips
            label="Application status"
            options={(opts?.applicationStatuses || []).filter((s) => s.status).map((s) => ({ value: s.status, label: humanize(s.status), count: s.count }))}
            selected={value.targetApplicationStatuses || []}
            onToggle={(v) => toggleIn("targetApplicationStatuses", v)}
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Chips
          label="Branch"
          options={(opts?.branches || []).map((b) => ({ value: b.id, label: b.name }))}
          selected={value.targetBranchIds || []}
          onToggle={(v) => toggleIn("targetBranchIds", v)}
        />
        <div className="flex flex-col gap-2">
          <Label className="text-[12px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">Academic session</Label>
          <Select
            value={value.targetAcademicSession || "all"}
            onValueChange={(v) => onChange({ ...value, targetAcademicSession: v === "all" ? undefined : v })}
          >
            <SelectTrigger className="border border-input h-[40px] rounded-[8px] text-[12px] w-full">
              <SelectValue placeholder="All sessions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sessions</SelectItem>
              {(opts?.academicSessions || []).map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-[8px] bg-muted/30 border border-input p-4 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-[13px] font-medium text-foreground">
          <Users className="size-4" />
          Estimated reach
          {isFetching && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
        </div>
        {preview ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[12px]">
              <Reach label="Staff" value={preview.staff} />
              <Reach label="Students" value={preview.students} />
              <Reach label="Leads" value={preview.leads} />
              <Reach label="Applicants" value={preview.applicants} />
            </div>
            <div className="flex flex-wrap gap-4 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><Mail className="size-3" /> {preview.uniqueEmails} unique emails</span>
              <span className="flex items-center gap-1"><Phone className="size-3" /> {preview.uniquePhones} unique phones</span>
              <span>{preview.portalAccounts} with a portal login (in-app)</span>
            </div>
          </>
        ) : (
          <span className="text-[12px] text-muted-foreground">Calculating…</span>
        )}
      </div>
    </section>
  );
}

function Reach({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-card border border-input rounded-[6px] px-3 py-2 flex flex-col">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-[16px] font-semibold text-foreground">{value ?? 0}</span>
    </div>
  );
}
