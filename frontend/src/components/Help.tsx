import { useState } from 'react'
import { useLocation } from 'react-router-dom'

type HelpEntry = { match: RegExp; title: string; intro: string; items: [string, string][] }

// Ordered most-specific first; the first matching pattern wins.
const HELP: HelpEntry[] = [
  {
    match: /^\/dashboard/, title: 'Dashboard',
    intro: 'Your job-search home base — a single view of how many applications you have, where they stand, what is coming up, and how the companies you have analyzed stack up.',
    items: [
      ['Total applications', 'The number of job applications you are tracking.'],
      ['Status cards', 'How many applications sit in each stage — Saved, Applied, Phone Screen, Interview, Offer, Rejected, Withdrawn.'],
      ['Company fit', 'A breakdown of AI fit ratings (Strong / Moderate / Weak) across the companies you have run an analysis on.'],
      ['Upcoming dates', 'Follow-up dates and offer deadlines, soonest first. Click a row to open that application.'],
      ['Recent activity', 'The latest activity logged across all your applications. Click a row to open the application.'],
      ['Manage all applications →', 'Jumps to the full Applications list.'],
    ],
  },
  {
    match: /^\/topical\/\d+\/custom\/\d+\/preview/, title: 'Custom Resume Preview',
    intro: 'See exactly how this job-tailored resume will look as a finished document, and print or save it as a PDF to send.',
    items: [
      ['Resume page', 'A formatted, read-only render of this custom resume — what it looks like as a document.'],
      ['Print / Save PDF', 'Opens your browser print dialog; choose “Save as PDF” to export. Editing controls are hidden in print.'],
      ['← Back to editor', 'Returns to the custom resume editor.'],
    ],
  },
  {
    match: /^\/topical\/\d+\/custom\/new/, title: 'New Custom Resume',
    intro: 'Create a job-specific version of a resume — either AI-tailored to a particular posting, or copied from your topical resume so you can edit it by hand.',
    items: [
      ['Generate with AI', 'Creates a resume tailored to a specific job posting using your topical resume as the source. Needs the position description.'],
      ['Position description', 'Paste a link (Fetch pulls the text), upload a PDF (text is extracted), or paste the text directly.'],
      ['Copy from a source', 'Create a custom resume without AI: copy your curated topical resume, or duplicate an existing custom resume, then edit it by hand.'],
      ['New title', 'The name for the resume being created.'],
    ],
  },
  {
    match: /^\/topical\/\d+\/custom\/\d+/, title: 'Custom Resume Editor',
    intro: 'Hand-tune one job-specific resume: rename it, add or remove sections and entries, reorder everything, and preview or print the result.',
    items: [
      ['Name field', 'Click to rename this custom resume; it saves when you click away.'],
      ['Add section (left)', 'Adds a new section of the chosen type to this resume.'],
      ['Section cards', 'Each section of the resume. Drag to reorder; “Delete” removes the section and its entries.'],
      ['+ Entry', 'Adds a new entry to that section using the proper form (experience uses the company → positions form).'],
      ['Edit / × on an entry', 'Edit opens the entry form; × deletes the entry. Drag entries to reorder within a section.'],
      ['Preview', 'Opens the formatted, printable version of this resume.'],
      ['Back', 'Returns to the list of custom resumes for this topical resume.'],
    ],
  },
  {
    match: /^\/topical\/\d+\/custom/, title: 'Custom Resumes',
    intro: 'All the job-tailored resumes built from this topical resume, in one place — open one to edit, or create a new one.',
    items: [
      ['Custom resume list', 'Every custom (job-tailored) resume under this topical resume. Click one to edit it.'],
      ['New', 'Create another custom resume (AI-tailored or copied).'],
    ],
  },
  {
    match: /^\/topical\/\d+\/preview/, title: 'Resume Preview',
    intro: 'A formatted, read-only view of this topical resume — what it looks like with the descriptions and bullets you selected — ready to print or save as a PDF.',
    items: [
      ['Resume page', 'A formatted, read-only render of this topical resume, using your selected descriptions, checked bullets, dates and theme.'],
      ['Print / Save PDF', 'Opens the print dialog; choose “Save as PDF” to export.'],
      ['← Back to editor', 'Returns to the topical resume editor.'],
    ],
  },
  {
    match: /^\/topical\/\d+/, title: 'Topical Resume Editor',
    intro: 'Build a focused resume for a type of role by pulling relevant entries from your CV, then choosing which description and bullets to show for each job. This becomes the base for AI-tailored custom resumes.',
    items: [
      ['Left panel (CV entries)', 'Your master CV content. Click an entry to add it to this topical resume.'],
      ['Right panel (sections)', 'The sections and entries included in this resume. Drag to reorder; toggle a section active/inactive.'],
      ['Experience selection', 'For each company/position, choose one description (radio) and check which bullets to include — mix and match per resume.'],
      ['Edit / × on an entry', 'Edit opens the entry; × removes it from this topical resume (your CV is untouched).'],
      ['Preview', 'Opens the formatted, printable version.'],
      ['Custom resumes →', 'Manage job-tailored versions built from this resume.'],
    ],
  },
  {
    match: /^\/topical/, title: 'Resumes (Topical)',
    intro: 'Your collection of role-focused resumes. Each topical resume targets a kind of job and holds its own job-tailored custom versions underneath it.',
    items: [
      ['Topical resume cards', 'Each is a focused resume for a type of role, built by selecting from your CV.'],
      ['Custom resumes (under each card)', 'Job-tailored versions of that resume. Click one to open it, or “+ New custom resume”.'],
      ['Edit', 'Open the topical resume editor.'],
      ['Preview', 'Formatted, printable view of the topical resume.'],
      ['Delete', 'Removes the topical resume and all its custom resumes.'],
      ['+ New / Add', 'Create a new topical resume.'],
    ],
  },
  {
    match: /^\/cv/, title: 'CV (Master Profile)',
    intro: 'Your complete career record — the single source of truth that every resume is built from. Put everything here once; you pick and choose from it when building targeted resumes.',
    items: [
      ['Add section (left)', 'Add any of the standard sections (Contact, Headline, About, Experience, Education, Skills, …) to your master CV.'],
      ['Section cards', 'Your full career history. This is the source everything else is built from. Drag to reorder.'],
      ['+ Entry', 'Add an entry. Experience entries are a company with one or more positions, each with multiple alternative descriptions and selectable bullets.'],
      ['Edit / ×', 'Edit or delete an entry. Drag entries to reorder.'],
      ['Dates', 'Entered and shown as MM-YYYY.'],
    ],
  },
  {
    match: /^\/applications\/new/, title: 'New Application',
    intro: 'Start tracking a job you want to apply for. Capture the basics now; you can add the resume, cover letter, contacts, and company analysis on the detail page afterward.',
    items: [
      ['Company / Position', 'The employer and role you are applying for.'],
      ['Status', 'Where this application stands (Saved, Applied, Interview, …).'],
      ['Position description', 'Paste a link (Fetch), upload a PDF, or paste the text. Saved with the application and used for AI tailoring.'],
      ['Create', 'Saves the application and opens its detail page.'],
    ],
  },
  {
    match: /^\/applications\/\d+/, title: 'Application Detail',
    intro: 'Everything about one job application in one place: its status and key dates, the linked resume, the position description, an AI company/fit analysis, your cover letter, contacts, and a log of activity.',
    items: [
      ['Position / Company (top)', 'Click either to edit it inline; saves when you click away.'],
      ['Tabs', 'Overview, Cover Letter, Contacts, and Activity for this application.'],
      ['Status / Applied / Follow-up', 'Track the stage and key dates (follow-up dates appear on the Dashboard).'],
      ['Linked custom resume', 'Attach the tailored resume you sent; required for AI cover-letter generation.'],
      ['Position description', 'The job posting — paste a link, upload a PDF, or type it.'],
      ['Company link & AI analysis', 'Add the company URL, pick a research depth (Quick/Standard/Deep, roughly $0.05–$0.15 — more searches = more thorough), then “AI analysis” researches the company on the web and assesses fit (based on your Profile). The result shows below.'],
      ['Cover Letter tab', 'Write or AI-generate a cover letter for this role.'],
      ['Contacts tab', 'Recruiters, hiring managers and others tied to this application.'],
      ['Activity tab', 'Log calls, emails, interviews and notes — these feed the Dashboard’s recent activity.'],
    ],
  },
  {
    match: /^\/applications/, title: 'Applications',
    intro: 'The master list of every job you are tracking. Filter by stage, see fit ratings at a glance, and open any application to manage it.',
    items: [
      ['Status filter chips', 'Filter the table to one stage, or “All”.'],
      ['Table rows', 'Each tracked application. Click the company to open it.'],
      ['Fit column', 'The AI fit rating (Strong / Moderate / Weak) once you run a company analysis; “—” means not analyzed yet.'],
      ['+ Add', 'Create a new application.'],
    ],
  },
  {
    match: /^\/profile/, title: 'My Profile',
    intro: 'Tell the app who you are and what you want from a job. This information powers the AI fit assessment that judges how well a company suits you — the more you fill in, the sharper it gets.',
    items: [
      ['About me', 'Who you are professionally — background, strengths, what you are looking for.'],
      ['Job preferences', 'Remote/hybrid, company size, industry, compensation, location, etc.'],
      ['What I find fulfilling', 'The kind of work and impact that energizes you.'],
      ['Generate / Regenerate questions', 'Produces up to 10 AI questions to pin down your personality and values. Regenerating keeps answers to questions that remain.'],
      ['Question answers', 'Your answers — these and the fields above drive the company fit assessment.'],
      ['Save profile', 'Stores everything on this page.'],
    ],
  },
  {
    match: /^\/settings\/theme/, title: 'Theme',
    intro: 'Control the look of your resumes and the app — set the colors and an optional custom font used across your documents.',
    items: [
      ['Primary / Accent color', 'The colors used across your resumes and the app interface.'],
      ['Font upload', 'Upload a custom font (.ttf/.otf/.woff) to use in your documents.'],
      ['Save', 'Applies the theme.'],
    ],
  },
]

export function HelpButton() {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const entry = HELP.find((h) => h.match.test(pathname))
  return (
    <>
      <button onClick={() => setOpen(true)} title="Help for this page" aria-label="Help for this page"
        className="w-8 h-8 shrink-0 rounded-full border border-slate-300 text-slate-600 hover:bg-slate-50 flex items-center justify-center font-semibold">?</button>
      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end no-print" onClick={() => setOpen(false)}>
          <div className="bg-white w-full max-w-md h-full overflow-auto p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-bold" style={{ color: 'var(--color-primary)' }}>{entry ? entry.title : 'Help'}</h2>
              <button onClick={() => setOpen(false)} aria-label="Close" className="text-slate-400 hover:text-slate-700 text-2xl leading-none">×</button>
            </div>
            {entry ? (
              <>
                <p className="text-sm text-slate-700 mb-4">{entry.intro}</p>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">What each element does</p>
                <dl className="space-y-3">
                  {entry.items.map(([el, desc], i) => (
                    <div key={i} className="border-b border-slate-100 pb-3 last:border-0">
                      <dt className="text-sm font-semibold text-slate-800">{el}</dt>
                      <dd className="text-sm text-slate-600 mt-0.5">{desc}</dd>
                    </div>
                  ))}
                </dl>
              </>
            ) : <p className="text-sm text-slate-500">No help is available for this page yet.</p>}
          </div>
        </div>
      )}
    </>
  )
}
