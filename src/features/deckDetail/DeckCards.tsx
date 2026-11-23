import { useMemo, useRef } from 'react';
import type { CatalogIndex } from '../../catalog/catalogIndex';
import { manaSymbolCodes } from '../../catalog/manaSymbols';
import { ManaSymbols } from '../../ui/ManaSymbols';
import { StatusMark } from '../../ui/StatusMark';
import type { Arrangement, ShownRow, StatusFilter, ViewMode } from './arrangeRows';
import { CardImage } from './CardImage';
import { CardPopup } from './CardPopup';
import styles from './DeckCards.module.css';
import type { DeckRow } from './deckRows';
import {
  filteredLine,
  manaCostLabel,
  popupLines,
  rowNeeds,
  rowSuffix,
  rowTone,
  statusSummary,
  type DisplayNames,
} from './describe';
import { stopOrder } from './listFocus';
import { useCardPopup } from './useCardPopup';
import { useListFocus } from './useListFocus';

const SINGLE_COLUMN_BELOW = 14;

interface RowProps {
  readonly shown: ShownRow;
  readonly filter: StatusFilter;
  readonly names: DisplayNames;
  readonly catalog: CatalogIndex;
}

function RowTitle({ row }: { readonly row: DeckRow }) {
  return (
    <p className={styles.title}>
      <span className={styles.name}>{row.name}</span>
      <span className={styles.suffix}>{rowSuffix(row)}</span>
    </p>
  );
}

function RowStatus({ shown, filter, names, catalog }: RowProps) {
  const { row } = shown;

  if (filter !== 'all') {
    return (
      <ul className={styles.lines}>
        {shown.allocations.map((allocation, index) => (
          <li key={index}>
            <StatusMark status={allocation.status} />
            {filteredLine(allocation, row, names, catalog)}
          </li>
        ))}
      </ul>
    );
  }

  if (rowTone(row) === 'idea') return <p className={styles.idea}>{statusSummary(row)}</p>;

  const needs = rowNeeds(row);
  return (
    <>
      {needs.length > 0 && (
        <ul className={styles.needs} aria-hidden="true">
          {needs.map((need) => (
            <li key={need.status}>
              <StatusMark status={need.status} />
              {need.text}
            </li>
          ))}
        </ul>
      )}
      <span className="visuallyHidden">{statusSummary(row)}</span>
    </>
  );
}

interface StopProps extends RowProps {
  readonly isStop: boolean;
  readonly isPinned: boolean;
}

function ListRow({ isStop, isPinned, ...props }: StopProps) {
  const { row } = props.shown;
  const artCrop = row.displayPrinting?.images[0]?.artCrop;
  const cost = manaSymbolCodes(row.manaCost);

  return (
    <li
      className={styles.row}
      data-tone={rowTone(row)}
      data-entry-id={row.entryId}
      tabIndex={isStop ? 0 : -1}
      aria-current={isPinned ? 'true' : undefined}
    >
      {artCrop !== undefined && (
        <span
          className={styles.art}
          style={{ backgroundImage: `url("${artCrop}")` }}
          aria-hidden="true"
        />
      )}
      <RowTitle row={row} />
      <RowStatus {...props} />
      {cost.length > 0 && (
        <span className={styles.cost}>
          <ManaSymbols codes={cost} label={manaCostLabel(cost)} />
        </span>
      )}
    </li>
  );
}

function GridTile({ isStop, isPinned, ...props }: StopProps) {
  const { row } = props.shown;

  return (
    <li
      className={styles.tile}
      data-tone={rowTone(row)}
      data-entry-id={row.entryId}
      tabIndex={isStop ? 0 : -1}
      aria-current={isPinned ? 'true' : undefined}
    >
      <CardImage key={row.displayPrinting?.id ?? 'none'} row={row} className={styles.tileImage} />
      <div className={styles.tileText}>
        <RowTitle row={row} />
        <RowStatus {...props} />
      </div>
    </li>
  );
}

export type PinSource = 'pointer' | 'keyboard';

interface DeckCardProps {
  readonly arrangement: Arrangement;
  readonly filter: StatusFilter;
  readonly view: ViewMode;
  readonly names: DisplayNames;
  readonly catalog: CatalogIndex;
  readonly pinnedEntryId: string | null;
  readonly onPin: (entryId: string, via: PinSource) => void;
  readonly onUnpin: () => void;
  readonly onClearFilters: () => void;
}

function entryIdAt(target: EventTarget, container: HTMLElement | null): string | undefined {
  if (!(target instanceof Element) || container === null) return undefined;

  const row = target.closest<HTMLElement>('li[data-entry-id]');
  return row !== null && container.contains(row) ? row.dataset.entryId : undefined;
}

export function DeckCards({
  arrangement,
  filter,
  view,
  names,
  catalog,
  pinnedEntryId,
  onPin,
  onUnpin,
  onClearFilters,
}: DeckCardProps) {
  // A new token hides the card, so it must change only with the arrangement or view.
  const token = useMemo(() => ({ arrangement, view }), [arrangement, view]);
  const containerRef = useRef<HTMLDivElement>(null);
  const popup = useCardPopup(token, containerRef);
  const ids = useMemo(() => stopOrder(arrangement), [arrangement]);
  const focus = useListFocus(ids, containerRef);

  if (arrangement.groups.length === 0) {
    if (filter === 'all') return <p className={styles.empty}>No cards in this deck yet.</p>;

    return (
      <div className={styles.empty}>
        <p>No cards match this filter.</p>
        <button type="button" className={styles.clear} onClick={onClearFilters}>
          Clear filters
        </button>
      </div>
    );
  }

  const rowCount = arrangement.groups.reduce((sum, group) => sum + group.rows.length, 0);
  // The pinned card is already in the panel, so its pop-up stays hidden.
  const visible = popup.shown?.entryId === pinnedEntryId ? null : popup.shown;
  const visibleRow =
    visible === null
      ? undefined
      : arrangement.groups
          .flatMap((group) => group.rows)
          .find((shown) => shown.row.entryId === visible.entryId)?.row;

  return (
    <>
      <div
        ref={containerRef}
        className={styles.groups}
        data-view={view}
        data-filtered={filter !== 'all'}
        data-single={filter !== 'all' || rowCount < SINGLE_COLUMN_BELOW}
        onPointerMove={view === 'list' ? popup.onPointerMove : undefined}
        onPointerLeave={popup.onPointerLeave}
        onFocus={(event) => {
          focus.onFocus(event);
          if (view === 'list') popup.onFocus(event);
        }}
        onBlur={popup.onBlur}
        onClick={(event) => {
          const entryId = entryIdAt(event.target, containerRef.current);
          if (entryId !== undefined) onPin(entryId, 'pointer');
        }}
        onKeyDown={(event) => {
          const entryId = entryIdAt(event.target, containerRef.current);
          if (entryId !== undefined && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            onPin(entryId, 'keyboard');
            return;
          }
          if (event.key === 'Escape' && visible === null && pinnedEntryId !== null) {
            onUnpin();
            return;
          }

          popup.onKeyDown(event);
          focus.onKeyDown(event);
        }}
      >
        {arrangement.groups.map((group) => (
          <section key={group.key} className={styles.group}>
            <h2 className={styles.heading}>
              {group.heading}
              {!group.isIdeas && <span className={styles.copies}>{group.copies}</span>}
            </h2>
            <ul className={view === 'grid' ? styles.grid : styles.list}>
              {group.rows.map((shown) =>
                view === 'grid' ? (
                  <GridTile
                    key={shown.row.entryId}
                    shown={shown}
                    filter={filter}
                    names={names}
                    catalog={catalog}
                    isStop={shown.row.entryId === focus.stopId}
                    isPinned={shown.row.entryId === pinnedEntryId}
                  />
                ) : (
                  <ListRow
                    key={shown.row.entryId}
                    shown={shown}
                    filter={filter}
                    names={names}
                    catalog={catalog}
                    isStop={shown.row.entryId === focus.stopId}
                    isPinned={shown.row.entryId === pinnedEntryId}
                  />
                ),
              )}
            </ul>
          </section>
        ))}
      </div>
      {visible !== null && visibleRow !== undefined && (
        <CardPopup
          key={visible.count}
          shown={visible}
          row={visibleRow}
          lines={popupLines(visibleRow, names, catalog)}
          placeTick={popup.placeTick}
        />
      )}
    </>
  );
}
