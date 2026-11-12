import type { Option } from '../../domain/options'
import styles from './Filters.module.css'

interface Props {
  label: string
  options: readonly Option[]
  /** The selected value, or null when none of the chips is selected. */
  value: string | null
  onChange: (value: string) => void
  /** "switch" joins the chips into one segmented control (mode, view). */
  variant?: 'chips' | 'switch'
}

/**
 * A row of toggle chips where exactly one is on. Each chip is a button with
 * aria-pressed, which screen readers announce as "pressed / not pressed".
 */
export function ChipGroup({ label, options, value, onChange, variant = 'chips' }: Props) {
  const isSwitch = variant === 'switch'
  return (
    <div className={isSwitch ? styles.switch : styles.chips} role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={isSwitch ? styles.switchOption : `${styles.chip} ${option.value === '' ? styles.anyChip : ''}`}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
