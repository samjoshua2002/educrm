/**
 * Personalisation / merge fields used across Communication Management.
 *
 * Scope merge fields: {{Name}} {{First_Name}} {{Program}} {{Date}} {{Link}}
 * {{Application_ID}} {{Application_No}} — matched case-insensitively.
 * Unknown fields are left untouched so a typo is visible instead of silently
 * becoming blank.
 */
export interface MergeContext {
  name?: string | null;
  firstName?: string | null;
  program?: string | null;
  applicationNo?: string | null;
  date?: string | null;
  link?: string | null;
  email?: string | null;
  phone?: string | null;
  institution?: string | null;
  /** Any extra key → value (keys matched lower-cased) */
  extra?: Record<string, string | null | undefined>;
}

export const SCOPE_MERGE_FIELDS: { tag: string; key: string; label: string; sample: string }[] = [
  { tag: '{{Name}}', key: 'name', label: 'Full Name', sample: 'Aarav Sharma' },
  { tag: '{{First_Name}}', key: 'first_name', label: 'First Name', sample: 'Aarav' },
  { tag: '{{Program}}', key: 'program', label: 'Program / Course', sample: 'PGDM 2026-28' },
  { tag: '{{Date}}', key: 'date', label: 'Date', sample: '20 Oct 2026' },
  { tag: '{{Link}}', key: 'link', label: 'Link (Application / Payment / Interview)', sample: 'https://portal.example.edu' },
  { tag: '{{Application_ID}}', key: 'application_id', label: 'Application ID', sample: 'APP-2026-00123' },
  { tag: '{{Application_No}}', key: 'application_no', label: 'Application Number', sample: 'APP-2026-00123' },
];

export function formatMergeDate(d: Date = new Date()): string {
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function buildMergeMap(ctx: MergeContext): Record<string, string> {
  const first = ctx.firstName || (ctx.name ? String(ctx.name).trim().split(/\s+/)[0] : '');
  const map: Record<string, string> = {
    name: ctx.name || '',
    full_name: ctx.name || '',
    student: ctx.name || '',
    first_name: first || '',
    firstname: first || '',
    program: ctx.program || '',
    course: ctx.program || '',
    application_id: ctx.applicationNo || '',
    application_no: ctx.applicationNo || '',
    applicationno: ctx.applicationNo || '',
    date: ctx.date || formatMergeDate(),
    link: ctx.link || '',
    email: ctx.email || '',
    phone: ctx.phone || '',
    institution: ctx.institution || '',
  };
  Object.entries(ctx.extra || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null) map[k.toLowerCase()] = String(v);
  });
  return map;
}

/** Renders {{Field}} merge tags. Single-brace {var} tags are left for the caller. */
export function renderMergeFields(text: string | null | undefined, ctx: MergeContext): string {
  if (!text) return '';
  const map = buildMergeMap(ctx);
  return text.replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, (match, key: string) => {
    const val = map[key.toLowerCase()];
    return val !== undefined && val !== '' ? val : match;
  });
}

/** Lists the {{Field}} tags used in a text. */
export function extractMergeFields(text: string | null | undefined): string[] {
  if (!text) return [];
  const out = new Set<string>();
  for (const m of text.matchAll(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g)) out.add(m[1]);
  return Array.from(out);
}
