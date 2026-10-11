import { useEffect } from 'react'

export interface ShortcutHandlers {
  focusSearch: () => void
  newTask: () => void
  boardView: () => void
  listView: () => void
  toggleSidebar: () => void
  showHelp: () => void
}

function isTyping(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

/** Global single-key shortcuts. Ignored while typing or when a dialog is open. */
export function useShortcuts(handlers: ShortcutHandlers, enabled = true) {
  useEffect(() => {
    if (!enabled) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return
      if (document.querySelector('[role="dialog"]')) return
      const map: Record<string, () => void> = {
        '/': handlers.focusSearch,
        n: handlers.newTask,
        b: handlers.boardView,
        l: handlers.listView,
        '[': handlers.toggleSidebar,
        '?': handlers.showHelp,
      }
      const handler = map[e.key]
      if (handler) {
        e.preventDefault()
        handler()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handlers, enabled])
}
