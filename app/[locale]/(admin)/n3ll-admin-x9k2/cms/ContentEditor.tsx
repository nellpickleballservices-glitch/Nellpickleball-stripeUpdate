'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect } from 'react'

interface ContentEditorProps {
  content: string
  onChange: (html: string) => void
}

export function ContentEditor({ content, onChange }: ContentEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content,
    immediatelyRender: false,
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML())
    },
  })

  // Sync content when language tab changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content)
    }
  }, [content, editor])

  if (!editor) return null

  const btn = (
    label: string,
    action: () => void,
    isActive: boolean
  ) => (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault() // keep editor focused so the command has an active selection
        action()
      }}
      className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
        isActive
          ? 'text-blue-700 bg-blue-50'
          : 'text-gray-600 hover:text-midnight hover:bg-gray-100'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 p-2 bg-gray-50 border-b border-gray-200">
        {btn('B', () => editor.chain().focus().toggleBold().run(), editor.isActive('bold'))}
        {btn('I', () => editor.chain().focus().toggleItalic().run(), editor.isActive('italic'))}
        {btn('H2', () => editor.chain().focus().toggleHeading({ level: 2 }).run(), editor.isActive('heading', { level: 2 }))}
        {btn('H3', () => editor.chain().focus().toggleHeading({ level: 3 }).run(), editor.isActive('heading', { level: 3 }))}
        {btn('UL', () => editor.chain().focus().toggleBulletList().run(), editor.isActive('bulletList'))}
        {btn('OL', () => editor.chain().focus().toggleOrderedList().run(), editor.isActive('orderedList'))}
        <div className="border-l border-gray-300 mx-1" />
        {btn('Undo', () => editor.chain().focus().undo().run(), false)}
        {btn('Redo', () => editor.chain().focus().redo().run(), false)}
      </div>

      {/* Editor content */}
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none p-4 min-h-[200px] text-gray-900 [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[200px]"
      />
    </div>
  )
}
