import styles from './StatusMark.module.css';

export type MarkStatus = 'inBox' | 'toMove' | 'toAcquire';

export function StatusMark({ status }: { readonly status: MarkStatus }) {
  return <span className={styles.mark} data-status={status} aria-hidden="true" />;
}
