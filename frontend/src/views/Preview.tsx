import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '../lib/api'
import {
  dateRange, displayMonthYear, normalizeExperience, positionLocation, selectedBullets, selectedDescription,
} from '../lib/sections'
import { Button, Spinner } from '../components/ui'

const stripP = (s: string) => (s || '').replace(/<\/?p>/g, '')

function ContactHeader({ data }: { data: any }) {
  const bits = [data.location, data.email, data.phone, data.website].filter(Boolean)
  return (
    <div className="text-center mb-4">
      <div className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>{data.full_name}</div>
      {bits.length > 0 && <div className="text-sm text-slate-600 mt-1">{bits.join('  ·  ')}</div>}
      {data.linkedin && (
        <div className="text-sm mt-0.5">
          <a href={data.linkedin} style={{ color: 'var(--color-accent)' }}>{data.linkedin}</a>
        </div>
      )}
    </div>
  )
}

function ExperienceEntry({ data }: { data: any }) {
  const exp = normalizeExperience(data)
  return (
    <div className="mb-3">
      <div className="flex justify-between items-baseline">
        <span className="font-semibold">{exp.company}</span>
        {exp.use_company_location && exp.location && <span className="text-sm text-slate-500">{exp.location}</span>}
      </div>
      {exp.positions.map((p, i) => {
        const desc = selectedDescription(p)
        const bullets = selectedBullets(p)
        const loc = positionLocation(exp, p)
        return (
          <div key={i} className="ml-3 mt-1">
            <div className="flex justify-between items-baseline">
              <span className="italic">{p.job_title}{loc && !exp.use_company_location ? ` — ${loc}` : ''}</span>
              {dateRange(p) && <span className="text-sm text-slate-500">{dateRange(p)}</span>}
            </div>
            {desc && <div className="text-sm mt-0.5" dangerouslySetInnerHTML={{ __html: desc }} />}
            {bullets.length > 0 && (
              <ul className="list-disc ml-5 text-sm mt-0.5">
                {bullets.map((b, j) => <li key={j} dangerouslySetInnerHTML={{ __html: stripP(b) }} />)}
              </ul>
            )}
          </div>
        )
      })}
    </div>
  )
}

function Entry({ type, data }: { type: string; data: any }) {
  const meta = (...xs: (string | undefined)[]) => xs.filter(Boolean).join(' · ')
  switch (type) {
    case 'about': return <div className="text-sm" dangerouslySetInnerHTML={{ __html: data.text || '' }} />
    case 'experience': return <ExperienceEntry data={data} />
    case 'education': return (
      <div className="mb-2"><div className="flex justify-between items-baseline">
        <span><span className="font-semibold">{data.degree}</span>{data.field_of_study ? `, ${data.field_of_study}` : ''} — {data.school}</span>
        {dateRange(data) && <span className="text-sm text-slate-500">{dateRange(data)}</span>}</div>
        {data.description && <div className="text-sm" dangerouslySetInnerHTML={{ __html: data.description }} />}</div>
    )
    case 'certifications': return <div className="mb-1 text-sm"><span className="font-semibold">{data.name}</span> — {meta(data.issuing_organization, data.issue_date ? displayMonthYear(data.issue_date) : '')}</div>
    case 'projects': return <div className="mb-2"><span className="font-semibold">{data.name}</span>{data.description && <div className="text-sm" dangerouslySetInnerHTML={{ __html: data.description }} />}</div>
    case 'languages': return <span className="text-sm">{data.language}{data.proficiency ? ` (${data.proficiency})` : ''}</span>
    case 'volunteer': return <div className="mb-1 text-sm"><span className="font-semibold">{data.role}</span> — {meta(data.organization, dateRange(data))}</div>
    case 'recommendations': return <div className="mb-2 text-sm"><div dangerouslySetInnerHTML={{ __html: data.text || '' }} /><div className="text-slate-500">— {meta(data.recommender_name, data.recommender_title)}</div></div>
    default: return <div className="mb-1 text-sm"><span className="font-semibold">{data.title || data.name || ''}</span>{data.description ? ` — ${String(data.description).replace(/<[^>]+>/g, '')}` : ''}</div>
  }
}

export function ResumeView({ sections }: { sections: any[] }) {
  const active = sections.filter((s) => s.is_active !== false)
  const contact = active.find((s) => s.section_type === 'contact')?.entries?.[0]
  const headline = active.find((s) => s.section_type === 'headline')?.entries?.[0]
  const body = active.filter((s) => !['contact', 'headline'].includes(s.section_type) && s.entries.length)

  return (
    <div className="resume-sheet bg-white mx-auto p-10 shadow-sm" style={{ maxWidth: '820px' }}>
      {contact ? <ContactHeader data={contact.data} /> : null}
      {headline?.data?.text && <div className="text-center text-slate-600 mb-4" style={{ color: 'var(--color-accent)' }}>{headline.data.text}</div>}
      {body.map((s) => (
        <section key={s.id} className="mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wide border-b pb-1 mb-2" style={{ color: 'var(--color-accent)', borderColor: 'var(--color-accent)' }}>{s.title}</h2>
          {s.section_type === 'skills'
            ? <p className="text-sm">{s.entries.map((e: any) => e.data.name).filter(Boolean).join('  ·  ')}</p>
            : s.section_type === 'languages'
              ? <p className="text-sm">{s.entries.map((e: any) => `${e.data.language}${e.data.proficiency ? ` (${e.data.proficiency})` : ''}`).join('  ·  ')}</p>
              : s.entries.map((e: any) => <Entry key={e.id} type={s.section_type} data={e.data} />)}
        </section>
      ))}
    </div>
  )
}

export function TopicalPreview() {
  const { id } = useParams()
  const { data: t, isLoading } = useQuery({ queryKey: ['topical', Number(id)], queryFn: () => apiGet(`/topical/${id}/`) })
  if (isLoading) return <div className="p-8"><Spinner label="Loading…" /></div>
  return (
    <div className="bg-slate-100 min-h-full">
      <div className="no-print flex items-center justify-between max-w-3xl mx-auto px-4 pt-4">
        <Link to={`/topical/${id}`} className="text-sm text-slate-500">← Back to editor</Link>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>Print / Save PDF</Button>
        </div>
      </div>
      <div className="resume-wrap py-6 px-4">
        <ResumeView sections={t.sections || []} />
      </div>
    </div>
  )
}

export function CustomPreview() {
  const { id, cid } = useParams()
  const { data: c, isLoading } = useQuery({ queryKey: ['customDetail', Number(cid)], queryFn: () => apiGet(`/topical/${id}/custom/${cid}/`) })
  if (isLoading) return <div className="p-8"><Spinner label="Loading…" /></div>
  return (
    <div className="bg-slate-100 min-h-full">
      <div className="no-print flex items-center justify-between max-w-3xl mx-auto px-4 pt-4">
        <Link to={`/topical/${id}/custom/${cid}`} className="text-sm text-slate-500">← Back to editor</Link>
        <Button variant="outline" onClick={() => window.print()}>Print / Save PDF</Button>
      </div>
      <div className="resume-wrap py-6 px-4">
        <ResumeView sections={c.sections || []} />
      </div>
    </div>
  )
}
