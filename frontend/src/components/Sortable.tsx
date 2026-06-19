import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ReactNode } from 'react'

function Row({ id, children }: { id: number; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="flex items-start gap-2">
      <span {...attributes} {...listeners} className="cursor-grab select-none text-slate-400 pt-2" title="Drag to reorder">⠿</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}

export function Sortable({ ids, onReorder, children }: {
  ids: number[]
  onReorder: (orderedIds: number[]) => void
  children: (id: number) => ReactNode
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter}
      onDragEnd={({ active, over }) => {
        if (over && active.id !== over.id) {
          onReorder(arrayMove(ids, ids.indexOf(active.id as number), ids.indexOf(over.id as number)))
        }
      }}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2">
          {ids.map((id) => <Row key={id} id={id}>{children(id)}</Row>)}
        </div>
      </SortableContext>
    </DndContext>
  )
}
