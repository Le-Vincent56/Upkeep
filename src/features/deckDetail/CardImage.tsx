import { useState } from 'react';
import styles from './CardImage.module.css';
import type { DeckRow } from './deckRows';

interface CardImageProps {
  readonly row: DeckRow;
  readonly className?: string;
}

export function CardImage({ row, className }: CardImageProps) {
  const [failed, setFailed] = useState(false);
  const image = row.displayPrinting?.images[0];

  if (image === undefined || failed) {
    return (
      <div className={[styles.placeholder, className].filter(Boolean).join(' ')}>
        <span className={styles.placeholderName}>{row.name}</span>
        <span className={styles.placeholderType}>{row.typeLine}</span>
      </div>
    );
  }

  return (
    <img
      className={[styles.image, className].filter(Boolean).join(' ')}
      src={image.normal}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
