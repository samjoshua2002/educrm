"use client";

import * as React from "react";
import { Loader2, Plus, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRecipientSearch, type RecipientOption } from "@/hooks/use-communications";
import { cn } from "@/lib/utils";
import { pill } from "./comm-ui";

export interface PickedRecipient {
  key: string;
  applicationId?: string;
  leadId?: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  kind: "Applicant" | "Lead" | "Manual";
}

function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** Search applicants / leads and add them as recipients; manual numbers / emails allowed. */
export function RecipientPicker({
  value,
  onChange,
  multiple = true,
  mode = "email",
}: {
  value: PickedRecipient[];
  onChange: (v: PickedRecipient[]) => void;
  multiple?: boolean;
  /** 'email' shows the email, 'phone' shows the mobile number */
  mode?: "email" | "phone";
}) {
  const [q, setQ] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const debounced = useDebounced(q);
  const { data = [], isFetching } = useRecipientSearch(debounced);

  const add = (r: RecipientOption | PickedRecipient) => {
    const item: PickedRecipient = {
      key: r.key,
      applicationId: r.applicationId,
      leadId: r.leadId,
      name: r.name,
      email: r.email,
      phone: r.phone,
      kind: r.kind,
    };
    if (value.some((v) => v.key === item.key)) return;
    onChange(multiple ? [...value, item] : [item]);
    setQ("");
    if (!multiple) setOpen(false);
  };

  const manual = q.trim();
  const manualValid = mode === "email" ? /\S+@\S+\.\S+/.test(manual) : manual.replace(/\D+/g, "").length >= 7;

  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((r) => (
            <span key={r.key} className={cn(pill.blue, "inline-flex items-center gap-1.5 py-1")}>
              {r.name}
              <span className="opacity-70">{mode === "email" ? r.email || "no email" : r.phone || "no phone"}</span>
              <button type="button" className="cursor-pointer" onClick={() => onChange(value.filter((v) => v.key !== r.key))}>
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <Input
          className="h-10 pr-10"
          placeholder={`Search applicants / leads by name, app no, ${mode === "email" ? "email" : "phone"}…`}
          value={q}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground pointer-events-none">
          {isFetching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
        </div>
        {open && (
          <div className="absolute z-50 mt-1 w-full max-h-[260px] overflow-y-auto rounded-md border border-border bg-popover shadow-md">
            {manual && manualValid && (
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/50 cursor-pointer"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() =>
                  add({
                    key: `manual:${manual}`,
                    name: manual,
                    email: mode === "email" ? manual : null,
                    phone: mode === "phone" ? manual : null,
                    kind: "Manual",
                  })
                }
              >
                <Plus className="size-4 text-primary" /> Use “{manual}”
              </button>
            )}
            {data.length === 0 && !isFetching && <p className="px-3 py-3 text-xs text-muted-foreground">No applicants or leads found.</p>}
            {data.map((r) => (
              <button
                key={r.key}
                type="button"
                className="flex w-full items-start justify-between gap-2 px-3 py-2 text-left hover:bg-muted/50 cursor-pointer"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => add(r)}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{r.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {[r.applicationNo, mode === "email" ? r.email : r.phone, r.program].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <span className={r.kind === "Applicant" ? pill.purple : pill.cyan}>{r.kind}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {multiple && value.length > 1 && (
        <Button type="button" variant="ghost" size="sm" className="self-start h-7 text-xs" onClick={() => onChange([])}>
          Clear all ({value.length})
        </Button>
      )}
    </div>
  );
}
