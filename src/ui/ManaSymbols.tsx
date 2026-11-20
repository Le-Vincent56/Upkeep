import { useState } from 'react';
import { manaSymbolUrl } from '../catalog/manaSymbols';
import styles from './ManaSymbols.module.css';

interface ManaSymbolProps {
  readonly codes: readonly string[];
  readonly label: string;
}

export function ManaSymbols({ codes, label }: ManaSymbolProps) {
  const [failed, setFailed] = useState<ReadonlySet<string>>(new Set());

  return (
    <span className={styles.symbols} role="img" aria-label={label}>
      {codes.map((code, index) =>
        failed.has(code) ? (
          <span key={index} className={styles.text}>{`{${code}}`}</span>
        ) : (
          <img
            key={index}
            className={styles.symbol}
            src={manaSymbolUrl(code)}
            alt=""
            loading="lazy"
            onError={() => setFailed((current) => new Set(current).add(code))}
          />
        ),
      )}
    </span>
  );
}
