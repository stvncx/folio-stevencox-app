// The 16 fixed LinkedIn-standard section types, and the field schema per type
// that drives the entry forms (matches backend data-models).

export interface FieldDef {
  key: string
  label: string
  type: 'text' | 'textarea' | 'rich' | 'monthyear' | 'checkbox' | 'bullets' | 'richlist'
  required?: boolean
}

export const SECTION_TYPES: { value: string; label: string }[] = [
  { value: 'contact', label: 'Contact' },
  { value: 'headline', label: 'Headline' },
  { value: 'about', label: 'About' },
  { value: 'experience', label: 'Experience' },
  { value: 'education', label: 'Education' },
  { value: 'skills', label: 'Skills' },
  { value: 'certifications', label: 'Licenses & Certifications' },
  { value: 'projects', label: 'Projects' },
  { value: 'publications', label: 'Publications' },
  { value: 'patents', label: 'Patents' },
  { value: 'courses', label: 'Courses' },
  { value: 'honors', label: 'Honors & Awards' },
  { value: 'volunteer', label: 'Volunteer Experience' },
  { value: 'languages', label: 'Languages' },
  { value: 'organizations', label: 'Organizations' },
  { value: 'featured', label: 'Featured' },
  { value: 'recommendations', label: 'Recommendations' },
]

export const SECTION_LABEL: Record<string, string> =
  Object.fromEntries(SECTION_TYPES.map((s) => [s.value, s.label]))

export const FIELDS: Record<string, FieldDef[]> = {
  contact: [
    { key: 'full_name', label: 'Full name', type: 'text', required: true },
    { key: 'location', label: 'Location (e.g. City, State)', type: 'text' },
    { key: 'email', label: 'Email', type: 'text' },
    { key: 'phone', label: 'Phone', type: 'text' },
    { key: 'website', label: 'Website / portfolio', type: 'text' },
    { key: 'linkedin', label: 'LinkedIn URL', type: 'text' },
  ],
  headline: [{ key: 'text', label: 'Headline', type: 'text', required: true }],
  about: [{ key: 'text', label: 'About', type: 'rich', required: true }],
  experience: [
    { key: 'job_title', label: 'Job title', type: 'text', required: true },
    { key: 'company', label: 'Company', type: 'text', required: true },
    { key: 'location', label: 'Location', type: 'text' },
    { key: 'start_date', label: 'Start (MM-YYYY)', type: 'monthyear', required: true },
    { key: 'is_current', label: 'I currently work here', type: 'checkbox', required: true },
    { key: 'end_date', label: 'End (MM-YYYY)', type: 'monthyear' },
    { key: 'descriptions', label: 'Descriptions (add alternatives — pick one per resume)', type: 'richlist' },
    { key: 'bullets', label: 'Accomplishments (selectable per resume)', type: 'bullets' },
  ],
  education: [
    { key: 'school', label: 'School', type: 'text', required: true },
    { key: 'degree', label: 'Degree', type: 'text', required: true },
    { key: 'field_of_study', label: 'Field of study', type: 'text' },
    { key: 'start_date', label: 'Start (MM-YYYY)', type: 'monthyear' },
    { key: 'end_date', label: 'End (MM-YYYY)', type: 'monthyear' },
    { key: 'grade', label: 'Grade', type: 'text' },
    { key: 'activities', label: 'Activities', type: 'text' },
    { key: 'description', label: 'Description', type: 'rich' },
  ],
  skills: [
    { key: 'name', label: 'Skill', type: 'text', required: true },
    { key: 'category', label: 'Category', type: 'text' },
    { key: 'proficiency', label: 'Proficiency', type: 'text' },
  ],
  certifications: [
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'issuing_organization', label: 'Issuing organization', type: 'text', required: true },
    { key: 'issue_date', label: 'Issue date (MM-YYYY)', type: 'monthyear' },
    { key: 'does_not_expire', label: 'Does not expire', type: 'checkbox', required: true },
    { key: 'expiration_date', label: 'Expiration (MM-YYYY)', type: 'monthyear' },
    { key: 'credential_id', label: 'Credential ID', type: 'text' },
    { key: 'credential_url', label: 'Credential URL', type: 'text' },
  ],
  projects: [
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'description', label: 'Description', type: 'rich' },
    { key: 'url', label: 'URL', type: 'text' },
    { key: 'start_date', label: 'Start (MM-YYYY)', type: 'monthyear' },
    { key: 'is_current', label: 'Ongoing', type: 'checkbox', required: true },
    { key: 'end_date', label: 'End (MM-YYYY)', type: 'monthyear' },
    { key: 'associated_with', label: 'Associated with', type: 'text' },
  ],
  publications: [
    { key: 'title', label: 'Title', type: 'text', required: true },
    { key: 'publisher', label: 'Publisher', type: 'text' },
    { key: 'publication_date', label: 'Date (MM-YYYY)', type: 'monthyear' },
    { key: 'url', label: 'URL', type: 'text' },
    { key: 'authors', label: 'Authors', type: 'text' },
    { key: 'description', label: 'Description', type: 'rich' },
  ],
  patents: [
    { key: 'title', label: 'Title', type: 'text', required: true },
    { key: 'patent_office', label: 'Patent office', type: 'text' },
    { key: 'status', label: 'Status', type: 'text' },
    { key: 'patent_number', label: 'Patent number', type: 'text' },
    { key: 'issue_date', label: 'Issue date (MM-YYYY)', type: 'monthyear' },
    { key: 'url', label: 'URL', type: 'text' },
    { key: 'inventors', label: 'Inventors', type: 'text' },
    { key: 'description', label: 'Description', type: 'rich' },
  ],
  courses: [
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'number', label: 'Number', type: 'text' },
    { key: 'associated_with', label: 'Associated with', type: 'text' },
  ],
  honors: [
    { key: 'title', label: 'Title', type: 'text', required: true },
    { key: 'issuer', label: 'Issuer', type: 'text' },
    { key: 'issue_date', label: 'Date (MM-YYYY)', type: 'monthyear' },
    { key: 'description', label: 'Description', type: 'rich' },
  ],
  volunteer: [
    { key: 'role', label: 'Role', type: 'text', required: true },
    { key: 'organization', label: 'Organization', type: 'text', required: true },
    { key: 'cause', label: 'Cause', type: 'text' },
    { key: 'start_date', label: 'Start (MM-YYYY)', type: 'monthyear' },
    { key: 'is_current', label: 'Currently volunteering', type: 'checkbox', required: true },
    { key: 'end_date', label: 'End (MM-YYYY)', type: 'monthyear' },
    { key: 'description', label: 'Description', type: 'rich' },
  ],
  languages: [
    { key: 'language', label: 'Language', type: 'text', required: true },
    { key: 'proficiency', label: 'Proficiency', type: 'text' },
  ],
  organizations: [
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'position', label: 'Position', type: 'text' },
    { key: 'start_date', label: 'Start (MM-YYYY)', type: 'monthyear' },
    { key: 'is_current', label: 'Current', type: 'checkbox', required: true },
    { key: 'end_date', label: 'End (MM-YYYY)', type: 'monthyear' },
    { key: 'description', label: 'Description', type: 'rich' },
  ],
  featured: [
    { key: 'title', label: 'Title', type: 'text', required: true },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'url', label: 'URL', type: 'text' },
    { key: 'media_type', label: 'Media type', type: 'text' },
  ],
  recommendations: [
    { key: 'recommender_name', label: 'Recommender', type: 'text', required: true },
    { key: 'recommender_title', label: 'Their title', type: 'text' },
    { key: 'relationship', label: 'Relationship', type: 'text' },
    { key: 'date', label: 'Date (MM-YYYY)', type: 'monthyear' },
    { key: 'text', label: 'Recommendation', type: 'rich', required: true },
  ],
}

// Normalise a date string to MM-YYYY (accepts legacy YYYY-MM and MM/YYYY).
export function toMonthYear(s?: unknown): string {
  if (!s || typeof s !== 'string') return ''
  let m = s.match(/^(\d{4})-(\d{1,2})$/)            // YYYY-MM (legacy)
  if (m) return `${m[2].padStart(2, '0')}-${m[1]}`
  m = s.match(/^(\d{1,2})[/-](\d{4})$/)             // MM-YYYY or MM/YYYY
  if (m) return `${m[1].padStart(2, '0')}-${m[2]}`
  return s
}

export function dateRange(data: Record<string, any>): string {
  const start = toMonthYear(data?.start_date)
  const end = data?.is_current ? 'Present' : toMonthYear(data?.end_date)
  return [start, end].filter(Boolean).join(' – ')
}

// --- Experience: company group with nested positions ----------------------
export interface Position {
  job_title: string
  location?: string
  start_date?: string
  end_date?: string
  is_current?: boolean
  descriptions?: string[]
  bullets?: string[]
  selected_description?: number | null   // topical selection
  selected_bullets?: number[]            // topical selection
}

export function emptyPosition(): Position {
  return { job_title: '', location: '', start_date: '', end_date: '', is_current: false, descriptions: [], bullets: [] }
}

// Accepts the new {company, positions[]} shape OR a legacy flat experience
// entry (one role) and always returns {company, positions[]}.
export interface Experience {
  company: string
  location: string                 // company-level location
  use_company_location: boolean    // apply company location to all positions
  positions: Position[]
}

export function normalizeExperience(data: any): Experience {
  const d = data || {}
  const conv = (p: any): Position => ({
    ...emptyPosition(), ...p,
    descriptions: Array.isArray(p.descriptions) ? p.descriptions : (p.description ? [p.description] : []),
    bullets: Array.isArray(p.bullets) ? p.bullets : [],
    start_date: toMonthYear(p.start_date), end_date: toMonthYear(p.end_date),
  })
  const base = { company: d.company || '', location: d.location || '', use_company_location: !!d.use_company_location }
  if (Array.isArray(d.positions)) return { ...base, positions: d.positions.map(conv) }
  const hasContent = d.job_title || d.description || (Array.isArray(d.descriptions) && d.descriptions.length) ||
    (Array.isArray(d.bullets) && d.bullets.length)
  return { ...base, positions: hasContent ? [conv(d)] : [emptyPosition()] }
}

// Effective location for a position, given its parent experience group.
export function positionLocation(exp: { location?: string; use_company_location?: boolean }, p: Position): string {
  return exp.use_company_location ? (exp.location || '') : (p.location || '')
}

// A short human label for an entry, for list rows.
export function entryTitle(sectionType: string, data: Record<string, unknown>): string {
  const d = data || {}
  const pick = (k: string) => (d[k] as string) || ''
  const withDates = (base: string) => { const dr = dateRange(d); return dr ? `${base}  (${dr})` : base }
  switch (sectionType) {
    case 'contact': return pick('full_name') || pick('email') || '(contact)'
    case 'headline': case 'about': return (pick('text') || '').replace(/<[^>]+>/g, '').slice(0, 80) || '(empty)'
    case 'experience': {
      const exp = normalizeExperience(d)
      const titles = exp.positions.map((p) => p.job_title).filter(Boolean)
      return exp.company ? (titles.length ? `${exp.company} — ${titles.join(', ')}` : exp.company) : '(company)'
    }
    case 'education': return withDates([pick('degree'), pick('school')].filter(Boolean).join(' · ') || '(degree)')
    case 'skills': return pick('name') || '(skill)'
    case 'languages': return pick('language') || '(language)'
    case 'recommendations': return pick('recommender_name') || '(recommender)'
    case 'volunteer': return withDates([pick('role'), pick('organization')].filter(Boolean).join(' · ') || '(role)')
    default: return pick('name') || pick('title') || '(entry)'
  }
}
