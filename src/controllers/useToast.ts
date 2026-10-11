import { useCallback, useMemo } from 'react'
import { errorTitle } from '../models/errors'
import type { AppError, ErrorCode, Result } from '../models/types'
import { useAppDispatch, type AppThunk } from '../store'
import { toastAdded, toastDismissed, type ToastKind } from '../store/slices/ui'

/**
 * Toast callbacks are functions, which don't belong in Redux state —
 * so they live in this module-level registry, keyed by toast id.
 */
const actions = new Map<string, () => void>()
let counter = 0

export function runToastAction(id: string) {
  actions.get(id)?.()
  actions.delete(id)
}

export function forgetToastAction(id: string) {
  actions.delete(id)
}

export interface ToastAction {
  label: string
  onClick: () => void
}

export function useToast() {
  const dispatch = useAppDispatch()

  const show = useCallback(
    (kind: ToastKind, title: string, message?: string, action?: ToastAction) => {
      const id = `toast_${++counter}`
      if (action) actions.set(id, action.onClick)
      dispatch(toastAdded({ id, kind, title, message, actionLabel: action?.label }))
      return id
    },
    [dispatch],
  )

  return useMemo(
    () => ({
      success: (title: string, message?: string, action?: ToastAction) => show('success', title, message, action),
      info: (title: string, message?: string, action?: ToastAction) => show('info', title, message, action),
      error: (error: AppError, action?: ToastAction) => show('error', errorTitle(error), error.message, action),
      dismiss: (id: string) => {
        forgetToastAction(id)
        dispatch(toastDismissed(id))
      },
    }),
    [show, dispatch],
  )
}

export interface RunOptions<T> {
  /** Success toast. Omit for silent success (e.g. field edits with inline "Saved"). */
  success?: string | ((data: T) => string)
  successAction?: (data: T) => ToastAction | undefined
  /** Offer "Retry" on network failures. Defaults to true. */
  retry?: boolean
  /** Error codes the caller renders inline (e.g. form validation) — no toast for those. */
  inlineErrors?: ErrorCode[]
}

/**
 * Runs a store operation and turns its Result into consistent UI feedback:
 * error toast (with Retry for network failures) or an optional success toast.
 */
export function useRun() {
  const dispatch = useAppDispatch()
  const toast = useToast()

  return useCallback(
    // Named so "Retry" can re-run the same operation with the same options.
    async function run<T>(thunk: () => AppThunk<Promise<Result<T>>>, options: RunOptions<T> = {}): Promise<Result<T>> {
      const result = await dispatch(thunk())
      if (result.error) {
        if (options.inlineErrors?.includes(result.error.code)) return result
        const canRetry = options.retry !== false && result.error.code === 'NETWORK'
        toast.error(result.error, canRetry ? { label: 'Retry', onClick: () => void run(thunk, options) } : undefined)
      } else if (options.success) {
        const data = result.data as T
        const title = typeof options.success === 'function' ? options.success(data) : options.success
        toast.success(title, undefined, options.successAction?.(data))
      }
      return result
    },
    [dispatch, toast],
  )
}
