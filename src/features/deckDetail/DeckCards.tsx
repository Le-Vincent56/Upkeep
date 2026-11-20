import { useState } from 'react';
import type { CatalogIndex } from '../../catalog/catalogIndex';
import { manaSymbolCodes } from '../../catalog/manaSymbols';
import { ManaSymbols } from '../../ui/ManaSymbols';
import { StatusMark } from '../../ui/StatusMark';
import type { Arrangement, ShownRow, StatusFilter, ViewMode } from './arrangeRows';
import styles from './DeckCards.module.css';
import type { DeckRow } from './deckRows';
import {
  filteredLine,
  manaCostLabel,
  rowNeeds,
  rowSuffix,
  rowTone,
  statusSummary,
  type DisplayNames,
} from './describe';

const SINGLE_COLUMN_BELOW = 14;

function CardImage({ row }: { readonly row: DeckRow }) {
  const [failed, setFailed] = useState(false);
  const image = row.displayPrinting?.images[0];

  if (image === undefined || failed) {
    return (
      <div className={styles.placeholder}>
        <span className={styles.placeholderName}>{row.name}</span>
        <span className={styles.placeholderType}>{row.typeLine}</span>
      </div>
    );
  }

  return (
    <img
      className={styles.image}
      src={image.normal}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

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

function ListRow(props: RowProps) {
  const { row } = props.shown;
  const artCrop = row.displayPrinting?.images[0]?.artCrop;
  const cost = manaSymbolCodes(row.manaCost);

  return (
    <li className={styles.row} data-tone={rowTone(row)}>
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

function GridTile(props: RowProps) {
  const { row } = props.shown;

  return (
    <li className={styles.tile} data-tone={rowTone(row)}>
      <CardImage key={row.displayPrinting?.id ?? 'none'} row={row} />
      <div className={styles.tileText}>
        <RowTitle row={row} />
        <RowStatus {...props} />
      </div>
    </li>
  );
}

interface DeckCardProps {
  readonly arrangement: Arrangement;
  readonly filter: StatusFilter;
  readonly view: ViewMode;
  readonly names: DisplayNames;
  readonly catalog: CatalogIndex;
  readonly onClearFilters: () => void;
}

export function DeckCards({
  arrangement,
  filter,
  view,
  names,
  catalog,
  onClearFilters,
}: DeckCardProps) {
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
  const Row = view === 'grid' ? GridTile : ListRow;

  return (
    <div
      className={styles.groups}
      data-view={view}
      data-filtered={filter !== 'all'}
      data-single={filter !== 'all' || rowCount < SINGLE_COLUMN_BELOW}
    >
      {arrangement.groups.map((group) => (
        <section key={group.key} className={styles.group}>
          <h2 className={styles.heading}>
            {group.heading}
            {!group.isIdeas && <span className={styles.copies}>{group.copies}</span>}
          </h2>
          <ul className={view === 'grid' ? styles.grid : styles.list}>
            {group.rows.map((shown) => (
              <Row
                key={shown.row.entryId}
                shown={shown}
                filter={filter}
                names={names}
                catalog={catalog}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
