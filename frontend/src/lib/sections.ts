// The 16 fixed LinkedIn-standard section types, and the field schema per type
// that drives the entry forms (matches backend data-models).

export interface FieldDef {
  key: string
  label: string
  type: 'text' | 'textarea' | 'rich' | 'month' | 'checkbox' | 'bullets' | 'richlist'
  required?: boolean
}

export const SECTION_TYPES: { value: string; label: string }[] = [
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
  headline: [{ key: 'text', label: 'Headline', type: 'text', required: true }],
  about: [{ key: 'text', label: 'About', type: 'rich', required: true }],
  experience: [
    { key: 'job_title', label: 'Job title', type: 'text', required: true },
    { key: 'company', label: 'Company', type: 'text', required: true },
    { key: 'location', label: 'Location', type: 'text' },
    { key: 'start_date', label: 'Start (YYYY-MM)', type: 'month', required: true },
    { key: 'is_current', label: 'I currently work here', type: 'checkbox', required: true },
    { key: 'end_date', label: 'End (YYYY-MM)', type: 'month' },
    { key: 'descriptions', label: 'Descriptions (add alternatives — pick one per resume)', type: 'richlist' },
    { key: 'bullets', label: 'Accomplishments (selectable per resume)', type: 'bullets' },
  ],
  education: [
    { key: 'school', label: 'School', type: 'text', required: true },
    { key: 'degree', label: 'Degree', type: 'text', required: true },
    { key: 'field_of_study', label: 'Field of study', type: 'text' },
    { key: 'start_date', label: 'Start (YYYY-MM)', type: 'month' },
    { key: 'end_date', label: 'End (YYYY-MM)', type: 'month' },
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
    { key: 'issue_date', label: 'Issue date (YYYY-MM)', type: 'month' },
    { key: 'does_not_expire', label: 'Does not expire', type: 'checkbox', required: true },
    { key: 'expiration_date', label: 'Expiration (YYYY-MM)', type: 'month' },
    { key: 'credential_id', label: 'Credential ID', type: 'text' },
    { key: 'credential_url', label: 'Credential URL', type: 'text' },
  ],
  projects: [
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'description', label: 'Description', type: 'rich' },
    { key: 'url', label: 'URL', type: 'text' },
    { key: 'start_date', label: 'Start (YYYY-MM)', type: 'month' },
    { key: 'is_current', label: 'Ongoing', type: 'checkbox', required: true },
    { key: 'end_date', label: 'End (YYYY-MM)', type: 'month' },
    { key: 'associated_with', label: 'Associated with', type: 'text' },
  ],
  publications: [
    { key: 'title', label: 'Title', type: 'text', required: true },
    { key: 'publisher', label: 'Publisher', type: 'text' },
    { key: 'publication_date', label: 'Date (YYYY-MM)', type: 'month' },
    { key: 'url', label: 'URL', type: 'text' },
    { key: 'authors', label: 'Authors', type: 'text' },
    { key: 'description', label: 'Description', type: 'rich' },
  ],
  patents: [
    { key: 'title', label: 'Title', type: 'text', required: true },
    { key: 'patent_office', label: 'Patent office', type: 'text' },
    { key: 'status', label: 'Status', type: 'text' },
    { key: 'patent_number', label: 'Patent number', type: 'text' },
    { key: 'issue_date', label: 'Issue date (YYYY-MM)', type: 'month' },
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
    { key: 'issue_date', label: 'Date (YYYY-MM)', type: 'month' },
    { key: 'description', label: 'Description', type: 'rich' },
  ],
  volunteer: [
    { key: 'role', label: 'Role', type: 'text', required: true },
    { key: 'organization', label: 'Organization', type: 'text', required: true },
    { key: 'cause', label: 'Cause', type: 'text' },
    { key: 'start_date', label: 'Start (YYYY-MM)', type: 'month' },
    { key: 'is_current', label: 'Currently volunteering', type: 'checkbox', required: true },
    { key: 'end_date', label: 'End (YYYY-MM)', type: 'month' },
    { key: 'description', label: 'Description', type: 'rich' },
  ],
  languages: [
    { key: 'language', label: 'Language', type: 'text', required: true },
    { key: 'proficiency', label: 'Proficiency', type: 'text' },
  ],
  organizations: [
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'position', label: 'Position', type: 'text' },
    { key: 'start_date', label: 'Start (YYYY-MM)', type: 'month' },
    { key: 'is_current', label: 'Current', type: 'checkbox', required: true },
    { key: 'end_date', label: 'End (YYYY-MM)', type: 'month' },
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
    { key: 'date', label: 'Date (YYYY-MM)', type: 'month' },
    { key: 'text', label: 'Recommendation', type: 'rich', required: true },
  ],
}

// A short human label for an entry, for list rows.
export function entryTitle(sectionType: string, data: Record<string, unknown>): string {
  const d = data || {}
  const pick = (k: string) => (d[k] as string) || ''
  switch (sectionType) {
    case 'headline': case 'about': return (pick('text') || '').replace(/<[^>]+>/g, '').slice(0, 80) || '(empty)'
    case 'experience': return [pick('job_title'), pick('company')].filter(Boolean).join(' · ') || '(role)'
    case 'education': return [pick('degree'), pick('school')].filter(Boolean).join(' · ') || '(degree)'
    case 'skills': return pick('name') || '(skill)'
    case 'languages': return pick('language') || '(language)'
    case 'recommendations': return pick('recommender_name') || '(recommender)'
    case 'volunteer': return [pick('role'), pick('organization')].filter(Boolean).join(' · ') || '(role)'
    default: return pick('name') || pick('title') || '(entry)'
  }
}
