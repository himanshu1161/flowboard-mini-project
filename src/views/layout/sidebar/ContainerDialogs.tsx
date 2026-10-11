import { Radio, RadioGroup } from '@headlessui/react'
import { Eye, EyeOff, Globe, Lock } from 'lucide-react'
import { useState } from 'react'
import { useArchiveSummary, useContainer, useMemberAccess } from '../../../controllers/useContainerInsights'
import { INLINE_FORM_ERRORS, type SidebarController } from '../../../controllers/useSidebarController'
import type { GrantMode, Visibility } from '../../../models/types'
import { NAME_MAX, validateName } from '../../../models/validation'
import { Avatar } from '../../common/Avatar'
import { Button } from '../../common/Button'
import { pluralize } from '../../common/format'
import { ConfirmDialog, Modal } from '../../common/Modal'
import { InlineError } from '../../common/States'
import { cx, FOCUS_RING } from '../../common/styles'

const VISIBILITY_OPTIONS: Array<{ value: Visibility; label: string; hint: string; icon: typeof Globe }> = [
  { value: 'public', label: 'Public', hint: 'Every member can see it unless denied.', icon: Globe },
  { value: 'private', label: 'Private', hint: 'Only members with an explicit allow.', icon: Lock },
]

function VisibilityPicker({ value, onChange }: { value: Visibility; onChange: (v: Visibility) => void }) {
  return (
    <RadioGroup value={value} onChange={onChange} aria-label="Visibility" className="grid grid-cols-2 gap-2">
      {VISIBILITY_OPTIONS.map((opt) => (
        <Radio
          key={opt.value}
          value={opt.value}
          className={cx(
            'flex cursor-pointer flex-col gap-1 rounded-control border border-line p-2.5 transition-colors hover:border-line-strong data-checked:border-brand-500 data-checked:bg-brand-50 data-checked:ring-1 data-checked:ring-brand-500',
            FOCUS_RING,
          )}
        >
          <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
            <opt.icon className="size-3.5" aria-hidden /> {opt.label}
          </span>
          <span className="text-xs text-ink-muted">{opt.hint}</span>
        </Radio>
      ))}
    </RadioGroup>
  )
}

export function CreateContainerDialog({ ctl }: { ctl: SidebarController }) {
  const dialog = ctl.dialog?.kind === 'create' ? ctl.dialog : null
  const [name, setName] = useState('')
  const [visibility, setVisibility] = useState<Visibility>('public')
  const [touched, setTouched] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  // Fresh form for every open (state adjusted during render, no effect).
  const [openedFor, setOpenedFor] = useState(dialog)
  if (dialog !== openedFor) {
    setOpenedFor(dialog)
    if (dialog) {
      setName('')
      setVisibility('public')
      setTouched(false)
      setServerError(null)
    }
  }

  const error = validateName(name)
  const submit = async () => {
    setTouched(true)
    if (error) return
    const result = await ctl.create(name, visibility)
    // Form-level problems render inline; everything else is already toasted by the controller.
    if (result?.error && INLINE_FORM_ERRORS.includes(result.error.code)) setServerError(result.error.message)
  }

  return (
    <Modal
      open={!!dialog}
      onClose={() => ctl.setDialog(null)}
      title={`New ${dialog?.type ?? ''}`}
      description={dialog && <>Inside <span className="font-medium text-ink-soft">{dialog.parent.name}</span></>}
      footer={
        <>
          <Button onClick={() => ctl.setDialog(null)} disabled={ctl.busy}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} loading={ctl.busy}>
            Create {dialog?.type}
          </Button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-ink-soft">Name</span>
          <input
            autoFocus
            value={name}
            maxLength={NAME_MAX + 20}
            onChange={(e) => {
              setName(e.target.value)
              setServerError(null)
            }}
            placeholder={dialog?.type === 'space' ? 'e.g. Engineering' : dialog?.type === 'folder' ? 'e.g. Q3 Launch' : 'e.g. Backlog'}
            aria-invalid={touched && (!!error || !!serverError)}
            className={cx(
              'h-9 w-full rounded-control border px-3 text-sm outline-none placeholder:text-ink-faint focus:ring-2',
              touched && (error || serverError) ? 'border-danger-500 focus:ring-danger-100' : 'border-line focus:border-brand-500 focus:ring-brand-100',
            )}
          />
          {touched && error && <InlineError>{error.message}</InlineError>}
          {serverError && <InlineError>{serverError}</InlineError>}
        </label>
        <div className="space-y-1.5">
          <span className="text-sm font-medium text-ink-soft">Visibility</span>
          <VisibilityPicker value={visibility} onChange={setVisibility} />
        </div>
        {dialog?.type === 'list' && (
          <p className="text-xs text-ink-muted">New lists start with the statuses To do, In progress and Done.</p>
        )}
        <button type="submit" className="hidden" tabIndex={-1} aria-hidden />
      </form>
    </Modal>
  )
}

const GRANT_OPTIONS: Array<{ value: GrantMode | null; label: string }> = [
  { value: null, label: 'Inherit' },
  { value: 'allow', label: 'Allow' },
  { value: 'deny', label: 'Deny' },
]

export function ShareDialog({ ctl }: { ctl: SidebarController }) {
  const container = ctl.dialog?.kind === 'share' ? ctl.dialog.container : null
  const members = useMemberAccess(container?.id ?? null)
  // The dialog holds the container as it was when opened; read visibility live from the store.
  const liveVisibility = useContainer(container?.id ?? null)?.visibility ?? 'public'

  return (
    <Modal
      open={!!container}
      onClose={() => ctl.setDialog(null)}
      title={<>Sharing · {container?.name}</>}
      description="Admins always have full access. Grants are inherited by everything inside."
      footer={<Button onClick={() => ctl.setDialog(null)}>Done</Button>}
    >
      {container && (
        <div className="space-y-5">
          <div className="space-y-1.5">
            <span className="text-sm font-medium text-ink-soft">Visibility</span>
            <VisibilityPicker value={liveVisibility} onChange={(v) => void ctl.changeVisibility(container.id, v)} />
          </div>
          <div className="space-y-1.5">
            <span className="text-sm font-medium text-ink-soft">Members</span>
            <ul className="divide-y divide-line rounded-control border border-line">
              {members.map(({ user, grant, canView }) => (
                <li key={user.id} className="flex items-center gap-3 px-3 py-2.5">
                  <Avatar user={user} size="md" />
                  <div className="min-w-0 flex-1 leading-tight">
                    <p className="truncate text-sm font-medium text-ink">{user.name}</p>
                    <p className={cx('flex items-center gap-1 text-xs', canView ? 'text-success-700' : 'text-ink-muted')}>
                      {canView ? <Eye className="size-3" aria-hidden /> : <EyeOff className="size-3" aria-hidden />}
                      {canView ? 'Can see this' : 'Hidden'}
                    </p>
                  </div>
                  <div role="radiogroup" aria-label={`Access for ${user.name}`} className="flex rounded-control bg-sunken p-0.5">
                    {GRANT_OPTIONS.map((opt) => (
                      <button
                        key={opt.label}
                        type="button"
                        role="radio"
                        aria-checked={grant === opt.value}
                        onClick={() => grant !== opt.value && void ctl.changeGrant(container.id, user.id, opt.value)}
                        className={cx(
                          'h-7 rounded-md px-2.5 text-xs font-medium transition-colors',
                          grant === opt.value
                            ? opt.value === 'deny'
                              ? 'bg-surface text-danger-600 shadow-card'
                              : 'bg-surface text-ink shadow-card'
                            : 'text-ink-muted hover:text-ink',
                          FOCUS_RING,
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </Modal>
  )
}

export function ArchiveConfirm({ ctl }: { ctl: SidebarController }) {
  const container = ctl.dialog?.kind === 'archive' ? ctl.dialog.container : null
  const summary = useArchiveSummary(container)
  const what =
    container?.type === 'list'
      ? `its ${pluralize(summary.tasks, 'task')}`
      : `${pluralize(summary.lists, 'list')} and ${pluralize(summary.tasks, 'task')} inside it`
  return (
    <ConfirmDialog
      open={!!container}
      onClose={() => ctl.setDialog(null)}
      onConfirm={() => void ctl.archive()}
      loading={ctl.busy}
      title={`Archive “${container?.name}”?`}
      description={<>This hides the {container?.type} and {what} for everyone. Nothing is deleted, and an admin can restore it from <b>Archived</b>.</>}
      confirmLabel="Archive"
    />
  )
}
