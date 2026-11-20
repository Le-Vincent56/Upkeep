import type { CatalogIndex } from '../../catalog/catalogIndex';
import { ManaSymbols } from '../../ui/ManaSymbols';
import type { DeckDetail } from './contracts';
import styles from './DeckHeader.module.css';
import { colorSymbols, deckFacts, headerArt } from './describe';

interface DeckHeaderProps {
  readonly detail: DeckDetail;
  readonly catalog: CatalogIndex;
  readonly copies: number;
}

export function DeckHeader({ detail, catalog, copies }: DeckHeaderProps) {
  const art = headerArt(detail, catalog);
  const colors = colorSymbols(detail.colors);

  return (
    <header className={styles.header}>
      {art !== null && (
        <div
          className={styles.art}
          style={{ backgroundImage: `url("${art.artCropUrl}")` }}
          aria-hidden="true"
        />
      )}
      <div className={styles.text}>
        <h1 className={styles.name}>{detail.name}</h1>
        <p className={styles.gamePlan}>{detail.gamePlan}</p>
        <p className={styles.facts}>
          <span className={styles.colors}>
            <ManaSymbols codes={colors.codes} label={colors.label} />
          </span>
          {deckFacts(detail, copies)}
        </p>
      </div>
      {art !== null && <p className={styles.credit}>Art: {art.artist}</p>}
    </header>
  );
}
