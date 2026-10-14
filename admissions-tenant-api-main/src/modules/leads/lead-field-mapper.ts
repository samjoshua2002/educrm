/**
 * Maps loosely-structured inbound payloads (webhooks, partner APIs, CSV rows,
 * Facebook/LinkedIn field data, chatbot transcripts) onto the standard
 * "Fields to capture" of the scope.
 */

export interface CapturedLeadInput {
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  dateOfBirth?: string | null;
  studentId?: string | null;
  channelSource?: string | null;
  formName?: string | null;
  formId?: string | null;
  courseId?: string | null;
  programInterest?: string | null;
  intake?: string | null;
  intakeSessionId?: string | null;
  branchId?: string | null;
  source?: string | null;
  sourceDetail?: string | null;
  sourceType?: string | null;
  subSource?: string | null;
  campaignId?: string | null;
  campaignName?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmTerm?: string | null;
  utmContent?: string | null;
  gclid?: string | null;
  fbclid?: string | null;
  submissionUrl?: string | null;
  referrerUrl?: string | null;
  testType?: string | null;
  testScore?: number | null;
  gpa?: number | null;
  workExperienceYears?: number | null;
  assignedTo?: string | null;
  followUpStatus?: string | null;
  nextFollowUpAt?: string | Date | null;
  status?: string | null;
  engagement?: Record<string, number>;
  rawPayload?: Record<string, any>;
}

const ALIASES: Record<keyof CapturedLeadInput | string, string[]> = {
  firstName: ['first_name', 'firstname', 'fname', 'given_name', 'first'],
  lastName: ['last_name', 'lastname', 'lname', 'surname', 'family_name', 'last'],
  fullName: ['full_name', 'fullname', 'name', 'student_name', 'candidate_name', 'applicant_name', 'your_name'],
  email: ['email', 'email_address', 'emailid', 'email_id', 'mail', 'work_email'],
  phone: ['phone', 'phone_number', 'mobile', 'mobile_number', 'mobile_no', 'contact', 'contact_number', 'phone_no', 'whatsapp', 'whatsapp_number', 'telephone'],
  country: ['country', 'country_of_residence', 'nationality_country'],
  state: ['state', 'province', 'region', 'state_province'],
  city: ['city', 'town', 'location', 'current_city'],
  dateOfBirth: ['dob', 'date_of_birth', 'birth_date', 'birthdate', 'birthday'],
  studentId: ['student_id', 'studentid', 'unique_id', 'registration_id', 'enrollment_id', 'portal_lead_id', 'application_number'],
  programInterest: ['program', 'programme', 'course', 'course_interest', 'program_interest', 'interested_program', 'interested_course', 'course_name', 'program_name', 'specialization'],
  intake: ['intake', 'session', 'intake_session', 'academic_session', 'batch', 'term', 'admission_session'],
  formName: ['form_name', 'formname', 'form'],
  channelSource: ['channel_source', 'channel'],
  sourceType: ['source_type'],
  subSource: ['sub_source', 'subsource', 'platform'],
  campaignName: ['campaign_name', 'ad_group', 'adgroup', 'ad_name', 'adset_name'],
  utmSource: ['utm_source'],
  utmMedium: ['utm_medium'],
  utmCampaign: ['utm_campaign', 'campaign'],
  utmTerm: ['utm_term'],
  utmContent: ['utm_content'],
  gclid: ['gclid'],
  fbclid: ['fbclid'],
  submissionUrl: ['page_url', 'url', 'landing_page', 'landing_page_url', 'submission_url', 'source_url', 'page'],
  referrerUrl: ['referrer', 'referer', 'referrer_url', 'http_referer'],
  testType: ['test_type', 'exam', 'entrance_exam', 'test'],
  testScore: ['test_score', 'gmat', 'gre', 'gmat_score', 'gre_score', 'gmat_gre_score', 'score', 'entrance_score', 'exam_score'],
  gpa: ['gpa', 'cgpa', 'grade_point_average'],
  workExperienceYears: ['work_experience', 'work_experience_years', 'experience', 'experience_years', 'years_of_experience', 'work_ex', 'total_experience'],
};

export function normalizeKey(key: string): string {
  return String(key)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

const str = (v: any): string | null => {
  if (v === null || v === undefined) return null;
  if (Array.isArray(v)) v = v.filter((x) => x !== null && x !== undefined && x !== '').join(', ');
  const s = String(v).trim();
  return s === '' ? null : s;
};

const num = (v: any): number | null => {
  const s = str(v);
  if (s === null) return null;
  const n = Number(s.replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : null;
};

/** Accepts YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, MM/DD/YYYY (US when first part > 12 impossible) */
export function parseDate(v: any): string | null {
  const s = str(v);
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (m) {
    let d = Number(m[1]);
    let mo = Number(m[2]);
    if (mo > 12 && d <= 12) [d, mo] = [mo, d];
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    return `${m[3]}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  const dt = new Date(s);
  return Number.isNaN(dt.getTime()) ? null : dt.toISOString().slice(0, 10);
}

/** Maps a flat key/value object onto CapturedLeadInput. Unknown keys go to rawPayload. */
export function mapPayload(payload: Record<string, any>): CapturedLeadInput {
  const flat: Record<string, any> = {};
  for (const [k, v] of Object.entries(payload || {})) {
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      // one level of nesting (e.g. { utm: { utm_source } } or { contact: { email } })
      for (const [k2, v2] of Object.entries(v)) flat[normalizeKey(k2)] = v2;
    } else {
      flat[normalizeKey(k)] = v;
    }
  }

  const pick = (field: string): any => {
    // direct camelCase key wins
    if (payload && payload[field] !== undefined && typeof payload[field] !== 'object') return payload[field];
    for (const alias of ALIASES[field] || []) {
      if (flat[alias] !== undefined && flat[alias] !== '') return flat[alias];
    }
    return undefined;
  };

  const out: CapturedLeadInput = {
    firstName: str(pick('firstName')),
    lastName: str(pick('lastName')),
    fullName: str(pick('fullName')),
    email: str(pick('email'))?.toLowerCase() ?? null,
    phone: str(pick('phone')),
    country: str(pick('country')),
    state: str(pick('state')),
    city: str(pick('city')),
    dateOfBirth: parseDate(pick('dateOfBirth')),
    studentId: str(pick('studentId')),
    programInterest: str(pick('programInterest')),
    intake: str(pick('intake')),
    formName: str(pick('formName')),
    channelSource: str(pick('channelSource')),
    sourceType: str(pick('sourceType')),
    subSource: str(pick('subSource')),
    campaignName: str(pick('campaignName')),
    utmSource: str(pick('utmSource')),
    utmMedium: str(pick('utmMedium')),
    utmCampaign: str(pick('utmCampaign')),
    utmTerm: str(pick('utmTerm')),
    utmContent: str(pick('utmContent')),
    gclid: str(pick('gclid')),
    fbclid: str(pick('fbclid')),
    submissionUrl: str(pick('submissionUrl')),
    referrerUrl: str(pick('referrerUrl')),
    testType: str(pick('testType')),
    testScore: num(pick('testScore')),
    gpa: num(pick('gpa')),
    workExperienceYears: num(pick('workExperienceYears')),
    rawPayload: payload,
  };

  // infer test type from the column it came from
  if (!out.testType && out.testScore !== null) {
    if (flat.gmat !== undefined || flat.gmat_score !== undefined) out.testType = 'GMAT';
    else if (flat.gre !== undefined || flat.gre_score !== undefined) out.testType = 'GRE';
  }
  return splitName(out);
}

export function splitName(input: CapturedLeadInput): CapturedLeadInput {
  if ((!input.firstName || !input.lastName) && input.fullName) {
    const parts = input.fullName.trim().split(/\s+/);
    if (!input.firstName) input.firstName = parts[0] || null;
    if (!input.lastName && parts.length > 1) input.lastName = parts.slice(1).join(' ');
  }
  return input;
}

/** Minimal RFC 4180 CSV parser (quotes, escaped quotes, CRLF, BOM). */
export function parseCsv(text: string): Record<string, string>[] {
  const src = (text || '').replace(/^﻿/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') inQuotes = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  const nonEmpty = rows.filter((r) => r.some((c) => c.trim() !== ''));
  if (nonEmpty.length < 2) return [];
  const header = nonEmpty[0].map((h) => h.trim());
  return nonEmpty.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    header.forEach((h, idx) => {
      if (h) obj[h] = (r[idx] ?? '').trim();
    });
    return obj;
  });
}
