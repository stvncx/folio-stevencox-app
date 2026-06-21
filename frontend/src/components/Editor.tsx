import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { Link } from '@tiptap/extension-link'
import { useEffect } from 'react'

const Btn = ({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button type="button" onMouseDown={(e) => { e.preventDefault(); onClick() }}
    className={`px-2 py-1 text-xs rounded border ${active ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-slate-300 text-slate-700'}`}>
    {children}
  </button>
)

export function RichEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Table.configure({ resizable: true }),
      TableRow, TableCell, TableHeader,
      Link.configure({ openOnClick: false }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  })

  // Keep external value in sync if it changes wholesale (e.g. AI fill).
  useEffect(() => {
    if (editor && value !== editor.getHTML()) editor.commands.setContent(value || '', { emitUpdate: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  if (!editor) return null
  return (
    <div className="border border-slate-300 rounded">
      <div className="flex flex-wrap gap-1 p-1 border-b border-slate-200 bg-slate-50">
        <Btn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><b>B</b></Btn>
        <Btn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><i>I</i></Btn>
        <Btn active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>• List</Btn>
        <Btn active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1. List</Btn>
        <Btn onClick={() => editor.chain().focus().insertTable({ rows: 2, cols: 2, withHeaderRow: true }).run()}>Table</Btn>
        <Btn onClick={() => editor.chain().focus().addRowAfter().run()}>+Row</Btn>
        <Btn onClick={() => editor.chain().focus().deleteRow().run()}>−Row</Btn>
        <Btn onClick={() => editor.chain().focus().addColumnAfter().run()}>+Col</Btn>
        <Btn onClick={() => editor.chain().focus().deleteColumn().run()}>−Col</Btn>
        <Btn onClick={() => { const url = window.prompt('Link URL'); if (url) editor.chain().focus().setLink({ href: url }).run() }}>Link</Btn>
        <Btn onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}>Clear</Btn>
      </div>
      <EditorContent editor={editor} className="tiptap" />
    </div>
  )
}

// Minimal single-line editor for a bullet: bold/italic only, with native
// Ctrl/Cmd+B and Ctrl/Cmd+I hotkeys plus tiny B/I buttons.
export function BulletEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const editor = useEditor({
    extensions: [StarterKit.configure({
      heading: false, bulletList: false, orderedList: false, listItem: false,
      blockquote: false, codeBlock: false, horizontalRule: false, strike: false, code: false,
    })],
    content: value || '',
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  })
  useEffect(() => {
    if (editor && value !== editor.getHTML()) editor.commands.setContent(value || '', { emitUpdate: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
  if (!editor) return null
  return (
    <div className="flex-1 border border-slate-300 rounded flex items-stretch bg-white">
      <EditorContent editor={editor} className="tiptap-bullet flex-1" />
      <div className="flex items-center gap-0.5 px-1 border-l border-slate-200">
        <button type="button" title="Bold (Ctrl/Cmd+B)" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run() }}
          className={`w-6 h-6 text-xs rounded ${editor.isActive('bold') ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'}`}><b>B</b></button>
        <button type="button" title="Italic (Ctrl/Cmd+I)" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run() }}
          className={`w-6 h-6 text-xs rounded ${editor.isActive('italic') ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'}`}><i>I</i></button>
      </div>
    </div>
  )
}
