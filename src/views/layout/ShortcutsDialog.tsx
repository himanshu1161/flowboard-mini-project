import { Kbd } from '../common/Badges'
import { Modal } from '../common/Modal'

const SHORTCUTS: Array<[string, string]> = [
  ['N', 'New task'],
  ['/', 'Search tasks'],
  ['B', 'Board view'],
  ['L', 'List view'],
  ['[', 'Toggle sidebar'],
  ['Esc', 'Close drawer / dialog'],
  ['Enter', 'Open focused card or row'],
  ['Space', 'Pick up / drop a focused card (then arrow keys)'],
  ['?', 'Show this help'],
]

export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Keyboard shortcuts" size="sm">
      <ul className="divide-y divide-line">
        {SHORTCUTS.map(([key, label]) => (
          <li key={key} className="flex items-center justify-between py-2 text-sm text-ink-soft">
            {label}
            <Kbd>{key}</Kbd>
          </li>
        ))}
      </ul>
    </Modal>
  )
}
