import { useId, useRef, type Ref } from 'react';
import { Button } from '../../ui/Button';
import { ChoiceSelect } from '../../ui/ChoiceSelect';
import type { GroupBy, SortBy, StatusFilter, ViewChoices, ViewMode } from './arrangeRows';
import type { DeckSummary } from './contracts';
import styles from './DeckControls.module.css';
import { keepTogetherLabel, showingLabel, STATUS_LABELS } from './describe';
import { useDisclosureDismiss } from './useDisclosureDismiss';

const GROUP_LABELS: Record<GroupBy, string> = { cardType: 'Card type', section: 'Section' };
const SORT_LABELS: Record<SortBy, string> = { manaValue: 'Mana value', name: 'Name' };
const FILTER_LABELS: Record<StatusFilter, string> = { all: 'All cards', ...STATUS_LABELS };
const VIEW_LABELS: Record<ViewMode, string> = { list: 'List', grid: 'Grid' };

interface DeckControlProps {
  readonly choices: ViewChoices;
  readonly view: ViewMode;
  readonly onChoices: (choices: ViewChoices) => void;
  readonly onView: (view: ViewMode) => void;
  readonly shownCopies: number;
  readonly deckCopies: number;
  readonly offeredDecks: readonly DeckSummary[];
  readonly requestedProtectedIds: readonly string[];
  readonly onProtectedChange: (protectedDeckIds: readonly string[]) => void;
  readonly replanError: string | null;
  readonly adding: boolean;
  readonly onStartAdding: () => void;
  readonly addButtonRef: Ref<HTMLButtonElement>;
}

export function DeckControls({
  choices,
  view,
  onChoices,
  onView,
  shownCopies,
  deckCopies,
  offeredDecks,
  requestedProtectedIds,
  onProtectedChange,
  replanError,
  adding,
  onStartAdding,
  addButtonRef,
}: DeckControlProps) {
  const viewLabelId = useId();
  const keepRef = useRef<HTMLDetailsElement>(null);
  useDisclosureDismiss(keepRef);
  const views = Object.keys(VIEW_LABELS) as ViewMode[];
  const protectedNames = offeredDecks
    .filter((deck) => requestedProtectedIds.includes(deck.id))
    .map((deck) => deck.name);
  const keepLabel = keepTogetherLabel(protectedNames, offeredDecks.length);

  function toggle(deckId: string, keep: boolean) {
    onProtectedChange(
      offeredDecks
        .filter((deck) => (deck.id === deckId ? keep : requestedProtectedIds.includes(deck.id)))
        .map((deck) => deck.id),
    );
  }

  return (
    <section className={styles.controls} aria-label="List controls">
      <div className={styles.row}>
        {offeredDecks.length === 0 ? (
          <p className={styles.keep}>{keepLabel}</p>
        ) : (
          <details className={styles.keep} ref={keepRef}>
            <summary>{keepLabel}</summary>
            <ul className={styles.decks}>
              {offeredDecks.map((deck) => (
                <li key={deck.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={requestedProtectedIds.includes(deck.id)}
                      onChange={(event) => toggle(deck.id, event.target.checked)}
                    />
                    {deck.name}
                  </label>
                </li>
              ))}
            </ul>
          </details>
        )}
        <ChoiceSelect
          label="Group by"
          value={choices.groupBy}
          labels={GROUP_LABELS}
          onChange={(groupBy) => onChoices({ ...choices, groupBy })}
        />
        <ChoiceSelect
          label="Sort by"
          value={choices.sortBy}
          labels={SORT_LABELS}
          onChange={(sortBy) => onChoices({ ...choices, sortBy })}
        />
        <ChoiceSelect
          label="Filter"
          value={choices.filter}
          labels={FILTER_LABELS}
          onChange={(filter) => onChoices({ ...choices, filter })}
        />
        <div className={styles.view} role="group" aria-labelledby={viewLabelId}>
          <span id={viewLabelId}>View</span>
          <span aria-hidden="true">·</span>
          {views.map((mode) => (
            <button
              key={mode}
              type="button"
              className={styles.toggle}
              aria-pressed={view === mode}
              onClick={() => onView(mode)}
            >
              {VIEW_LABELS[mode]}
            </button>
          ))}
        </div>
        {!adding && (
          <Button
            ref={addButtonRef}
            weight="outline"
            className={styles.add}
            onClick={onStartAdding}
          >
            Add to deck
          </Button>
        )}
      </div>

      {choices.filter !== 'all' && (
        <div className={styles.active}>
          <button
            type="button"
            className={styles.chip}
            aria-label={`Remove filter: ${FILTER_LABELS[choices.filter]}`}
            onClick={() => onChoices({ ...choices, filter: 'all' })}
          >
            {FILTER_LABELS[choices.filter]}
            <span aria-hidden="true">✕</span>
          </button>
          <p className={styles.showing}>{showingLabel(shownCopies, deckCopies)}</p>
        </div>
      )}

      {replanError !== null && (
        <p className={styles.error} role="alert">
          Couldn't update the plan · {replanError}
        </p>
      )}
    </section>
  );
}
