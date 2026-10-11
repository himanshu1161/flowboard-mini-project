import { Field, Label, Popover, PopoverButton, PopoverPanel, Switch } from '@headlessui/react'
import { FlaskConical } from 'lucide-react'
import { useSession } from '../../controllers/useSession'
import { cx, FOCUS_RING, POPOVER_PANEL } from '../common/styles'

const LATENCIES = [
  { value: 0, label: 'None' },
  { value: 350, label: 'Normal' },
  { value: 1200, label: 'Slow' },
]

/** Dev control: inject latency and random request failures into the store layer. */
export function SimulationControl() {
  const { simulation, setSimulation } = useSession()
  const on = simulation.failuresEnabled
  return (
    <Popover>
      <PopoverButton
        className={cx(
          'flex h-8 items-center gap-1.5 rounded-control px-2.5 text-xs font-medium transition-colors',
          on
            ? 'bg-warning-50 text-warning-700 ring-1 ring-warning-500/30 hover:bg-warning-50/70'
            : 'text-ink-muted hover:bg-sunken hover:text-ink data-open:bg-sunken',
          FOCUS_RING,
        )}
        title="Simulate network latency and failures"
      >
        <FlaskConical className="size-4" aria-hidden />
        <span className="hidden md:inline">{on ? `Failures ${Math.round(simulation.failureRate * 100)}%` : 'Simulate'}</span>
      </PopoverButton>
      <PopoverPanel anchor="bottom end" transition className={cx(POPOVER_PANEL, 'w-72 space-y-4 p-4')}>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-ink">Network simulation</p>
          <p className="text-xs text-ink-muted">
            The store fakes a server round-trip. Turn on failures to see rollbacks, error toasts and retries.
          </p>
        </div>

        <Field className="flex items-center justify-between gap-3">
          <Label className="text-sm text-ink-soft">Random failures</Label>
          <Switch
            checked={on}
            onChange={(failuresEnabled) => setSimulation({ failuresEnabled })}
            className={cx(
              'group relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-pill bg-line-strong transition-colors data-checked:bg-warning-500',
              FOCUS_RING,
            )}
          >
            <span className="inline-block size-4 translate-x-0.5 rounded-pill bg-white shadow-card transition-transform group-data-checked:translate-x-[1.125rem]" />
          </Switch>
        </Field>

        <Field disabled={!on} className="space-y-1.5 data-disabled:opacity-50">
          <div className="flex items-center justify-between">
            <Label className="text-sm text-ink-soft">Failure rate</Label>
            <span className="text-xs font-medium text-ink tabular-nums">{Math.round(simulation.failureRate * 100)}%</span>
          </div>
          <input
            type="range"
            min={10}
            max={100}
            step={10}
            disabled={!on}
            value={Math.round(simulation.failureRate * 100)}
            onChange={(e) => setSimulation({ failureRate: Number(e.target.value) / 100 })}
            className="w-full accent-warning-500"
            aria-label="Failure rate"
          />
        </Field>

        <div className="space-y-1.5">
          <span className="text-sm text-ink-soft">Latency</span>
          <div role="radiogroup" aria-label="Latency" className="grid grid-cols-3 gap-1 rounded-control bg-sunken p-0.5">
            {LATENCIES.map((l) => (
              <button
                key={l.value}
                type="button"
                role="radio"
                aria-checked={simulation.latencyMs === l.value}
                onClick={() => setSimulation({ latencyMs: l.value })}
                className={cx(
                  'h-7 rounded-md text-xs font-medium transition-colors',
                  simulation.latencyMs === l.value ? 'bg-surface text-ink shadow-card' : 'text-ink-muted hover:text-ink',
                  FOCUS_RING,
                )}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </PopoverPanel>
    </Popover>
  )
}
