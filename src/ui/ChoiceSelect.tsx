import { useId } from 'react';
import styles from './ChoiceSelect.module.css';

interface ChoiceSelectProps<T extends string> {
  readonly label: string;
  readonly value: T;
  readonly labels: Record<T, string>;
  readonly onChange: (value: T) => void;
}

export function ChoiceSelect<T extends string>({
  label,
  value,
  labels,
  onChange,
}: ChoiceSelectProps<T>) {
  const id = useId();
  const options = Object.keys(labels) as T[];

  return (
    <div className={styles.control}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <span className={styles.separator} aria-hidden="true">
        ·
      </span>
      <select
        id={id}
        className={styles.select}
        value={value}
        onChange={(event) => {
          const next = options.find((option) => option === event.target.value);
          if (next !== undefined) onChange(next);
        }}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {labels[option]}
          </option>
        ))}
      </select>
    </div>
  );
}
