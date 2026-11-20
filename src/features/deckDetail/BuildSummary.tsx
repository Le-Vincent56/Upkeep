import type { Counts } from '../../planning/types';
import type { StatusFilter } from './arrangeRows';
import styles from './BuildSummary.module.css';
import { STATUS_LABELS, type AllocationStatus } from './describe';

const STATUSES: readonly AllocationStatus[] = ['inBox', 'toMove', 'toAcquire'];

interface BuildSummaryProps {
  readonly counts: Counts;
  readonly filter: StatusFilter;
  readonly onFilter: (filter: StatusFilter) => void;
}

export function BuildSummary({ counts, filter, onFilter }: BuildSummaryProps) {
  return (
    <section className={styles.summary} aria-label="Build" data-filtered={filter !== 'all'}>
      {STATUSES.map((status) => (
        <button
          key={status}
          type="button"
          className={styles.part}
          data-status={status}
          data-empty={counts[status] === 0}
          style={{ flexGrow: Math.max(counts[status], 1) }}
          aria-pressed={filter === status}
          onClick={() => onFilter(filter === status ? 'all' : status)}
        >
          <span className={styles.bar} />
          <span className={styles.caption}>
            <span className={styles.count}>{counts[status]}</span> {STATUS_LABELS[status]}
          </span>
        </button>
      ))}
    </section>
  );
}
