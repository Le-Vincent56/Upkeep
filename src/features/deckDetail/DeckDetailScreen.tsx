import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDependencies } from '../../app/dependencies';
import { useInspectorSlot } from '../../app/inspectorSlot';
import type { DeckEdit } from '../../decks/edits';
import type { DeckEntry, Section } from '../../decks/types';
import { AddToDeckBand } from './AddToDeckBand';
import { accentProps } from './accent';
import {
  arrangeRows,
  DEFAULT_VIEW_CHOICES,
  type StatusFilter,
  type ViewChoices,
  type ViewMode,
} from './arrangeRows';
import { BuildSummary } from './BuildSummary';
import type { EditError, ReadyDeckBuild } from './deckBuildState';
import { DeckCards, type Landed, type PinSource } from './DeckCards';
import { DeckControls } from './DeckControls';
import styles from './DeckDetailScreen.module.css';
import { DeckHeader } from './DeckHeader';
import { DeckInspector } from './DeckInspector';
import type { DeckRow } from './deckRows';
import { displayNames, headerArt } from './describe';
import { askedValues, entryOfRow, togglePin } from './inspector';
import { offeredDecks } from './loadDeckBuild';
import { useDeckBuild } from './useDeckBuild';
import type { AddOutcome } from './deckBuildRequests';

interface Pin {
  readonly entryId: string;
  readonly card: DeckRow;
  readonly removed: { readonly entry: DeckEntry; readonly at: number } | null;
  readonly focusKey: number | null;
  readonly errorBefore: EditError | null;
}

function focusListRow(entryId: string | null) {
  const column = document.querySelector('[data-screen-column]');
  const row =
    (entryId === null
      ? null
      : column?.querySelector<HTMLElement>(`li[data-entry-id="${CSS.escape(entryId)}"]`)) ??
    column?.querySelector<HTMLElement>('li[data-entry-id][tabindex="0"]');
  row?.focus();
}

interface ReadyDeckProps {
  readonly state: ReadyDeckBuild;
  readonly onProtectedChange: (protectedDeckIds: readonly string[]) => void;
  readonly onEdit: (edit: DeckEdit) => void;
  readonly onAddCard: (entry: DeckEntry) => Promise<AddOutcome>;
}

function ReadyDeck({ state, onProtectedChange, onEdit, onAddCard }: ReadyDeckProps) {
  const { catalog } = useDependencies();
  const slot = useInspectorSlot();
  const [choices, setChoices] = useState<ViewChoices>(DEFAULT_VIEW_CHOICES);
  const [view, setView] = useState<ViewMode>('list');
  const [pin, setPin] = useState<Pin | null>(null);
  const [adding, setAdding] = useState(false);
  const [section, setSection] = useState<Section>('main');
  const [landed, setLanded] = useState<Landed | null>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const focusAddButton = useRef(false);

  useEffect(() => {
    if (adding || !focusAddButton.current) return;

    focusAddButton.current = false;
    addButtonRef.current?.focus();
  }, [adding]);

  const { build } = state;
  const names = useMemo(() => displayNames(build.detail), [build.detail]);
  const arrangement = useMemo(
    () => arrangeRows(build.rows, build.plannedDeck.counts, choices),
    [build, choices],
  );

  const accent = headerArt(build.detail, catalog)?.accent ?? null;
  const pinnedRow =
    pin === null ? null : (build.rows.find((row) => row.entryId === pin.entryId) ?? null);

  function setFilter(filter: StatusFilter) {
    setChoices((current) => ({ ...current, filter }));
  }

  function pinRow(entryId: string, via: PinSource) {
    const card = build.rows.find((row) => row.entryId === entryId);
    if (card === undefined) return;

    setPin((current) => {
      if (via === 'pointer' && togglePin(current?.entryId ?? null, entryId) === null) return null;

      const focusKey = via === 'keyboard' ? (current?.focusKey ?? 0) + 1 : null;
      return { entryId, card, removed: null, focusKey, errorBefore: state.editError };
    });
  }

  function closeBand() {
    focusAddButton.current = true;
    setAdding(false);
  }

  function markLanded(entryId: string) {
    setLanded((current) => ({ entryId, count: (current?.count ?? 0) + 1 }));
  }

  function unpin() {
    const entryId = pin?.entryId ?? null;
    setPin(null);
    focusListRow(entryId);
  }

  function remove(row: DeckRow) {
    const at = build.rows.findIndex((candidate) => candidate.entryId === row.entryId);
    setPin((current) =>
      current === null ? null : { ...current, card: row, removed: { entry: entryOfRow(row), at } },
    );
    onEdit({ kind: 'removeEntry', entryId: row.entryId });
  }

  function putBack() {
    const removed = pin?.removed;
    if (pin === null || removed === undefined || removed === null) return;

    const alreadyAsked = state.pendingEdits.some(
      (edit) => edit.kind === 'addEntry' && edit.entry.id === removed.entry.id,
    );
    if (alreadyAsked) return;

    onEdit({ kind: 'addEntry', entry: removed.entry, at: removed.at });
    setPin({ ...pin, focusKey: (pin.focusKey ?? 0) + 1 });
  }

  // The spec clears an edit error on the next pin, so one raised before this pin stays hidden.
  const editError =
    pin !== null && state.editError !== pin.errorBefore && state.editError?.entryId === pin.entryId
      ? state.editError.message
      : null;

  return (
    <div className={styles.deck} {...accentProps(accent)}>
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
        adding={adding}
        onStartAdding={() => setAdding(true)}
        addButtonRef={addButtonRef}
      />
      {adding && (
        <AddToDeckBand
          catalog={catalog}
          section={section}
          onSection={setSection}
          onAdd={onAddCard}
          onLanded={markLanded}
          onClose={closeBand}
        />
      )}
      <DeckCards
        arrangement={arrangement}
        filter={choices.filter}
        view={view}
        names={names}
        catalog={catalog}
        pinnedEntryId={pin?.entryId ?? null}
        landed={landed}
        onLandedEnd={() => setLanded(null)}
        onPin={pinRow}
        onUnpin={() => setPin(null)}
        onClearFilters={() => setFilter('all')}
      />
      {pin !== null &&
        slot !== null &&
        createPortal(
          <DeckInspector
            row={pinnedRow}
            card={pinnedRow ?? pin.card}
            removed={pin.removed !== null}
            asked={pinnedRow === null ? null : askedValues(pinnedRow, state.pendingEdits)}
            error={editError}
            names={names}
            catalog={catalog}
            accent={accent}
            focusKey={pin.focusKey}
            onEdit={onEdit}
            onRemove={() => {
              if (pinnedRow !== null) remove(pinnedRow);
            }}
            onPutBack={putBack}
            onUnpin={unpin}
          />,
          slot,
        )}
    </div>
  );
}

export function DeckDetailScreen({ deckId }: { readonly deckId: string }) {
  const { state, setProtected, edit, addCard } = useDeckBuild(deckId);

  return (
    <main className={styles.screen}>
      {state.status === 'loading' && <p className={styles.notice}>Opening deck…</p>}
      {state.status === 'failed' && (
        <p className={styles.notice} role="alert">
          Couldn't open this deck · {state.message}
        </p>
      )}
      {state.status === 'ready' && (
        <ReadyDeck
          state={state}
          onProtectedChange={setProtected}
          onEdit={edit}
          onAddCard={addCard}
        />
      )}
    </main>
  );
}
