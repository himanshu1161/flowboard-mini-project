import { useState } from 'react'
import { TITLE_MAX } from '../../models/validation'
import { Button } from '../common/Button'

/** Inline composer: Enter adds the task and closes; Esc cancels. On failure it stays open with the text. */
export function QuickAdd({ onSubmit, onClose }: { onSubmit: (title: string) => Promise<boolean>; onClose: () => void }) {
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!title.trim()) return onClose()
    setSaving(true)
    const ok = await onSubmit(title)
    if (ok) return onClose()
    setSaving(false)
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
      className="space-y-2 rounded-card border border-brand-200 bg-surface p-2 shadow-card"
    >
      <textarea
        autoFocus
        rows={2}
        value={title}
        maxLength={TITLE_MAX}
        disabled={saving}
        onChange={(e) => setTitle(e.target.value.replace(/\n/g, ''))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            void submit()
          }
          if (e.key === 'Escape') onClose()
        }}
        onBlur={() => !title.trim() && onClose()}
        placeholder="Task title…"
        aria-label="New task title"
        className="block w-full resize-none text-sm text-ink outline-none placeholder:text-ink-faint"
      />
      <div className="flex items-center justify-end gap-1.5">
        <Button size="sm" variant="ghost" onClick={onClose} onMouseDown={(e) => e.preventDefault()}>
          Cancel
        </Button>
        <Button size="sm" variant="primary" type="submit" loading={saving} onMouseDown={(e) => e.preventDefault()}>
          Add
        </Button>
      </div>
    </form>
  )
}
