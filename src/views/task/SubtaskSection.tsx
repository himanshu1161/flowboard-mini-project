import { CheckCircle2, Circle, Plus } from 'lucide-react'
import { useState } from 'react'
import type { useTaskController } from '../../controllers/useTaskController'
import { AvatarStack } from '../common/Avatar'
import { DueDate } from '../common/Badges'
import { Button } from '../common/Button'
import { cx, FOCUS_RING } from '../common/styles'

type Controller = ReturnType<typeof useTaskController>

export function SubtaskSection({ controller }: { controller: Controller }) {
  const { subtasks, users, isDone } = controller
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const done = subtasks.filter(isDone).length

  const submit = async () => {
    if (!draft.trim()) return setAdding(false)
    setSaving(true)
    const result = await controller.addSubtask(draft)
    setSaving(false)
    if (result?.data) setDraft('')
  }

  return (
    <section aria-label="Subtasks" className="space-y-2">
      <div className="flex items-center gap-3">
        <h3 className="text-xs font-semibold tracking-wide text-ink-muted uppercase">Subtasks</h3>
        {subtasks.length > 0 && (
          <>
            <span className="text-xs text-ink-faint tabular-nums">
              {done}/{subtasks.length}
            </span>
            {/* Segmented progress — avoids inline width styles. */}
            <div className="flex h-1.5 flex-1 gap-0.5" aria-hidden>
              {subtasks.map((s) => (
                <span key={s.id} className={cx('flex-1 rounded-pill', isDone(s) ? 'bg-success-500' : 'bg-line')} />
              ))}
            </div>
          </>
        )}
      </div>

      {subtasks.length > 0 && (
        <ul className="divide-y divide-line overflow-hidden rounded-control border border-line">
          {subtasks.map((sub) => {
            const complete = isDone(sub)
            return (
              <li key={sub.id} className="group flex items-center gap-2 bg-surface px-2 py-1.5 transition-colors hover:bg-canvas">
                <button
                  type="button"
                  onClick={() => controller.toggleSubtask(sub)}
                  aria-label={complete ? `Mark “${sub.title}” as not done` : `Mark “${sub.title}” as done`}
                  className={cx('rounded-pill p-0.5 text-ink-faint transition-colors hover:text-success-500', FOCUS_RING)}
                >
                  {complete ? <CheckCircle2 className="size-4 text-success-500" /> : <Circle className="size-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => controller.open(sub.id)}
                  className={cx(
                    'min-w-0 flex-1 truncate rounded px-1 text-left text-sm hover:underline',
                    complete ? 'text-ink-faint line-through' : 'text-ink-soft',
                    FOCUS_RING,
                  )}
                >
                  {sub.title}
                </button>
                <DueDate iso={sub.dueDate} done={complete} />
                <AvatarStack users={users.filter((u) => sub.assigneeIds.includes(u.id))} size="xs" />
              </li>
            )
          })}
        </ul>
      )}

      {adding ? (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
          className="flex items-center gap-2"
        >
          <input
            autoFocus
            value={draft}
            maxLength={500}
            disabled={saving}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.stopPropagation()
                setAdding(false)
                setDraft('')
              }
            }}
            onBlur={() => !draft.trim() && setAdding(false)}
            placeholder="Subtask title, then Enter"
            aria-label="New subtask title"
            className="h-8 flex-1 rounded-control border border-line px-2.5 text-sm outline-none placeholder:text-ink-faint focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
          <Button type="submit" size="sm" variant="primary" loading={saving}>
            Add
          </Button>
        </form>
      ) : (
        <Button variant="ghost" size="sm" icon={Plus} onClick={() => setAdding(true)} className="-ml-2">
          Add subtask
        </Button>
      )}
    </section>
  )
}
