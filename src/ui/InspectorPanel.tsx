import { useId, type KeyboardEvent, type ReactNode, type Ref } from 'react';
import styles from './InspectorPanel.module.css';

interface InspectorPanelProps {
  readonly title: string;
  readonly titleRef?: Ref<HTMLHeadingElement>;
  readonly media?: ReactNode;
  readonly onUnpin: () => void;
  readonly onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void;
  readonly children: ReactNode;
}

export function InspectorPanel({
  title,
  titleRef,
  media,
  onUnpin,
  onKeyDown,
  children,
}: InspectorPanelProps) {
  const titleId = useId();

  return (
    <section className={styles.panel} aria-labelledby={titleId} onKeyDown={onKeyDown}>
      <button
        type="button"
        className={styles.unpin}
        aria-label={`Unpin ${title}`}
        onClick={onUnpin}
      >
        Unpin <span aria-hidden="true">✕</span>
      </button>
      {media}
      <h2 id={titleId} ref={titleRef} tabIndex={-1} className={styles.title}>
        {title}
      </h2>
      {children}
    </section>
  );
}
