import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiDelete, apiGet, apiPatch, apiPost } from '../lib/api'
import { SECTION_LABEL, SECTION_TYPES, entryTitle } from '../lib/sections'
import { EntryForm } from '../components/EntryForm'
import { Sortable } from '../components/Sortable'
import { Button, Card, Spinner, confirmAction, useToast } from '../components/ui'

export function CV() {
  const qc = useQueryClient()
  const toast = useToast()
  const { data: cv, isLoading } = useQuery({ queryKey: ['cv'], queryFn: () => apiGet('/cv/') })
  const [modal, setModal] = useState<null | { sectionId: number; sectionType: string; entry?: any }>(null)
  const refresh = () => qc.invalidateQueries({ queryKey: ['cv'] })

  const createCV = useMutation({ mutationFn: () => apiPost('/cv/'), onSuccess: refresh })
  const addSection = useMutation({
    mutationFn: (st: string) => apiPost('/cv/sections/', { section_type: st, title: SECTION_LABEL[st], order: 999 }),
    onSuccess: () => { refresh(); toast('Section added') },
    onError: (e: any) => toast(e.message, 'error'),
  })
  const delSection = useMutation({
    mutationFn: (id: number) => apiDelete(`/cv/sections/${id}/`),
    onSuccess: () => { refresh(); toast('Section removed') },
  })
  const saveEntry = useMutation({
    mutationFn: (p: { sectionId: number; entry?: any; data: any }) =>
      p.entry
        ? apiPatch(`/cv/sections/${p.sectionId}/entries/${p.entry.id}/`, { data: p.data, order: p.entry.order })
        : apiPost(`/cv/sections/${p.sectionId}/entries/`, { data: p.data, order: 999 }),
    onSuccess: () => { refresh(); setModal(null); toast('Saved') },
    onError: (e: any) => toast(e.message, 'error'),
  })
  const delEntry = useMutation({
    mutationFn: (p: { s: number; e: number }) => apiDelete(`/cv/sections/${p.s}/entries/${p.e}/`),
    onSuccess: () => { refresh(); toast('Deleted') },
  })

  if (isLoading) return <div className="p-8"><Spinner label="Loading…" /></div>
  if (!cv?.exists) return (
    <div className="p-8"><Card className="p-6 max-w-md">
      <h2 className="font-bold mb-2">Create your CV</h2>
      <p className="text-slate-500 text-sm mb-4">Your CV is the master record of everything you've done professionally.</p>
      <Button onClick={() => createCV.mutate()}>Create CV</Button>
    </Card></div>
  )

  const used = new Set(cv.sections.map((s: any) => s.section_type))
  const sectionsById: Record<number, any> = Object.fromEntries(cv.sections.map((s: any) => [s.id, s]))

  return (
    <div className="flex gap-4 p-4">
      {/* sidebar */}
      <Card className="w-56 shrink-0 p-3 h-fit">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Add section</div>
        {SECTION_TYPES.map((s) => (
          <button key={s.value} disabled={used.has(s.value) || addSection.isPending}
            onClick={() => addSection.mutate(s.value)}
            className="block w-full text-left text-sm px-2 py-1.5 rounded hover:bg-slate-100 disabled:text-slate-300 disabled:hover:bg-transparent">
            {s.label}{used.has(s.value) && ' ✓'}
          </button>
        ))}
      </Card>

      {/* main */}
      <div className="flex-1 min-w-0">
        <h1 className="text-xl font-bold mb-3" style={{ color: 'var(--color-primary)' }}>Curriculum Vitae</h1>
        {cv.sections.length === 0 && <p className="text-slate-500 text-sm">Add a section from the left to begin.</p>}
        <Sortable ids={cv.sections.map((s: any) => s.id)} onReorder={(ids) => apiPost('/cv/sections/reorder/', { ordered_ids: ids }).then(refresh)}>
          {(sid) => {
            const s = sectionsById[sid]
            return (
              <Card className="p-4 mb-1">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-semibold">{s.title}</h2>
                  <div className="flex gap-1">
                    <Button variant="outline" onClick={() => setModal({ sectionId: s.id, sectionType: s.section_type })}>+ Entry</Button>
                    <Button variant="ghost" onClick={() => { if (confirmAction(`Delete the "${s.title}" section and its entries?`)) delSection.mutate(s.id) }}>Delete</Button>
                  </div>
                </div>
                {s.entries.length === 0
                  ? <p className="text-slate-400 text-sm">No entries yet.</p>
                  : <Sortable ids={s.entries.map((e: any) => e.id)} onReorder={(ids) => apiPost(`/cv/sections/${s.id}/entries/reorder/`, { ordered_ids: ids }).then(refresh)}>
                    {(eid) => {
                      const e = s.entries.find((x: any) => x.id === eid)
                      return (
                        <div className="flex items-center justify-between border border-slate-100 rounded px-3 py-2 text-sm">
                          <span className="truncate">{entryTitle(s.section_type, e.data)}</span>
                          <div className="flex gap-1 shrink-0">
                            <Button variant="ghost" onClick={() => setModal({ sectionId: s.id, sectionType: s.section_type, entry: e })}>Edit</Button>
                            <Button variant="ghost" onClick={() => { if (confirmAction('Delete this entry?')) delEntry.mutate({ s: s.id, e: e.id }) }}>×</Button>
                          </div>
                        </div>
                      )
                    }}
                  </Sortable>}
              </Card>
            )
          }}
        </Sortable>
      </div>

      {/* entry modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 grid place-items-center p-4 z-40 no-print" onClick={() => setModal(null)}>
          <Card className="w-full max-w-2xl max-h-[88vh] overflow-auto p-5" >
            <div onClick={(e) => e.stopPropagation()}>
              <h3 className="font-bold mb-3">{modal.entry ? 'Edit' : 'New'} {SECTION_LABEL[modal.sectionType]} entry</h3>
              <EntryForm sectionType={modal.sectionType} initial={modal.entry?.data}
                saving={saveEntry.isPending}
                onCancel={() => setModal(null)}
                onSave={(data) => saveEntry.mutate({ sectionId: modal.sectionId, entry: modal.entry, data })} />
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
