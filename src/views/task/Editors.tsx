import { useRef, useState } from 'react'
import type { Result } from '../../models/types'
import { DESCRIPTION_MAX, validateTitle } from '../../models/validation'
import { InlineError } from '../common/States'
import { cx } from '../common/styles'

type Commit = (value: string) => Promise<Result<unknown> | undefined> | void

/**
 * Local draft that follows the stored value while the user isn't editing,
 * and snaps back to it if a save fails. (State is adjusted during render —
 * React's recommended alternative to syncing props into state with an effect.)
 */
function useDraft(value: string, focused: boolean) {
  const [draft, setDraft] = useState(value)
  const [synced, setSynced] = useState(value)
  if (value !== synced) {
    setSynced(value)
    if (!focused) setDraft(value)
  }
  const commitWith = async (commit: Commit, next: string) => {
    const result = await commit(next)
    if (result?.error) setDraft(value)
  }
  return { draft, setDraft, commitWith }
}

/**
 * Inline title editor: commits on blur / Enter, Escape reverts (without closing
 * the drawer) when there are unsaved edits. Validation mirrors the store rule.
 */
export function TitleEditor({ value, max, onCommit }: { value: string; max: number; onCommit: Commit }) {
  const [focused, setFocused] = useState(false)
  const { draft, setDraft, commitWith } = useDraft(value, focused)
  const ref = useRef<HTMLTextAreaElement>(null)

  const error = validateTitle(draft)
  const commit = () => {
    if (draft.trim() === value) return
    if (error) return setDraft(value) // invalid edits are discarded on blur
    void commitWith(onCommit, draft)
  }

  return (
    <div>
      <textarea
        ref={ref}
        value={draft}
        rows={1}
        aria-label="Task title"
        aria-invalid={!!error}
        aria-describedby={error ? 'title-error' : undefined}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false)
          commit()
        }}
        onChange={(e) => setDraft(e.target.value.replace(/\n/g, ''))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            ref.current?.blur()
          }
          if (e.key === 'Escape' && draft !== value) {
            e.preventDefault()
            e.stopPropagation()
            setDraft(value)
            requestAnimationFrame(() => ref.current?.blur())
          }
        }}
        className={cx(
          '-mx-2 block w-[calc(100%+1rem)] resize-none rounded-control border border-transparent px-2 py-1 text-xl leading-snug font-semibold text-ink outline-none field-sizing-content hover:bg-sunken focus:border-brand-500 focus:bg-surface focus:ring-2 focus:ring-brand-100',
          error && focused && 'border-danger-500 focus:border-danger-500 focus:ring-danger-100',
        )}
      />
      {focused && (
        <div className="mt-1 flex items-center justify-between gap-2">
          {error ? <InlineError id="title-error">{error.message}</InlineError> : <span className="text-xs text-ink-faint">Enter to save · Esc to cancel</span>}
          <span className={cx('text-xs tabular-nums', draft.trim().length > max ? 'font-semibold text-danger-600' : 'text-ink-faint')}>
            {draft.trim().length}/{max}
          </span>
        </div>
      )}
    </div>
  )
}

export function DescriptionEditor({ value, onCommit }: { value: string; onCommit: Commit }) {
  const [focused, setFocused] = useState(false)
  const { draft, setDraft, commitWith } = useDraft(value, focused)
  const ref = useRef<HTMLTextAreaElement>(null)

  const tooLong = draft.length > DESCRIPTION_MAX

  return (
    <section aria-label="Description" className="space-y-1.5">
      <h3 className="text-xs font-semibold tracking-wide text-ink-muted uppercase">Description</h3>
      <textarea
        ref={ref}
        value={draft}
        placeholder="Add more detail…"
        aria-label="Task description"
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false)
          if (draft !== value && !tooLong) void commitWith(onCommit, draft)
        }}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) ref.current?.blur()
          if (e.key === 'Escape' && draft !== value) {
            e.preventDefault()
            e.stopPropagation()
            setDraft(value)
            requestAnimationFrame(() => ref.current?.blur())
          }
        }}
        className="block min-h-24 w-full resize-none rounded-control border border-line bg-surface px-3 py-2 text-sm leading-relaxed text-ink-soft outline-none field-sizing-content placeholder:text-ink-faint hover:border-line-strong focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />
      {focused && (
        <div className="flex justify-between text-xs text-ink-faint">
          <span>Plain text · ⌘/Ctrl + Enter to save</span>
          {tooLong && <InlineError>Too long ({draft.length.toLocaleString()} / {DESCRIPTION_MAX.toLocaleString()})</InlineError>}
        </div>
      )}
    </section>
  )
}
