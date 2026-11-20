import { useMemo, useState, type CSSProperties } from 'react';
import { useDependencies } from '../../app/dependencies';
import {
  arrangeRows,
  DEFAULT_VIEW_CHOICES,
  type StatusFilter,
  type ViewChoices,
  type ViewMode,
} from './arrangeRows';
import { BuildSummary } from './BuildSummary';
import type { ReadyDeckBuild } from './deckBuildState';
import { DeckCards } from './DeckCards';
import { DeckControls } from './DeckControls';
import styles from './DeckDetailScreen.module.css';
import { DeckHeader } from './DeckHeader';
import { displayNames, headerArt } from './describe';
import { offeredDecks } from './loadDeckBuild';
import { useDeckBuild } from './useDeckBuild';

interface ReadyDeckProps {
  readonly state: ReadyDeckBuild;
  readonly onProtectedChange: (protectedDeckIds: readonly string[]) => void;
}

function ReadyDeck({ state, onProtectedChange }: ReadyDeckProps) {
  const { catalog } = useDependencies();
  const [choices, setChoices] = useState<ViewChoices>(DEFAULT_VIEW_CHOICES);
  const [view, setView] = useState<ViewMode>('list');

  const { build } = state;
  const names = useMemo(() => displayNames(build.detail), [build.detail]);
  const arrangement = useMemo(
    () => arrangeRows(build.rows, build.plannedDeck.counts, choices),
    [build, choices],
  );

  const accent = headerArt(build.detail, catalog)?.accent ?? null;
  const accentStyle = accent === null ? undefined : ({ '--color-accent': accent } as CSSProperties);

  function setFilter(filter: StatusFilter) {
    setChoices((current) => ({ ...current, filter }));
  }

  /* data-accent makes tokens.css derive --color-status-move again from this accent; set both together. */
  return (
    <div className={styles.deck} style={accentStyle} data-accent={accent === null ? undefined : ''}>
      <DeckHeader
        detail={build.detail}
        catalog={catalog}
        copies={build.plannedDeck.counts.demand}
      />
      <BuildSummary
        counts={build.plannedDeck.counts}
        filter={choices.filter}
        onFilter={setFilter}
      />
      <DeckControls
        choices={choices}
        view={view}
        onChoices={setChoices}
        onView={setView}
        shownCopies={arrangement.shownCopies}
        deckCopies={arrangement.deckCopies}
        offeredDecks={offeredDecks(build.detail)}
        requestedProtectedIds={state.requestedProtectedIds}
        onProtectedChange={onProtectedChange}
        replanError={state.replanError}
      />
      <DeckCards
        arrangement={arrangement}
        filter={choices.filter}
        view={view}
        names={names}
        catalog={catalog}
        onClearFilters={() => setFilter('all')}
      />
    </div>
  );
}

export function DeckDetailScreen({ deckId }: { readonly deckId: string }) {
  const { state, setProtected } = useDeckBuild(deckId);

  return (
    <main className={styles.screen}>
      {state.status === 'loading' && <p className={styles.notice}>Opening deck…</p>}
      {state.status === 'failed' && (
        <p className={styles.notice} role="alert">
          Couldn't open this deck · {state.message}
        </p>
      )}
      {state.status === 'ready' && <ReadyDeck state={state} onProtectedChange={setProtected} />}
    </main>
  );
}
