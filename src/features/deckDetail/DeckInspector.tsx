import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import type { CatalogIndex } from '../../catalog/catalogIndex';
import { MAX_QUANTITY, type DeckEdit } from '../../decks/edits';
import type { Section } from '../../decks/types';
import { InspectorPanel } from '../../ui/InspectorPanel';
import { StatusMark } from '../../ui/StatusMark';
import { accentProps } from './accent';
import { CardImage } from './CardImage';
import styles from './DeckInspector.module.css';
import type { DeckRow } from './deckRows';
import { popupLines, SECTION_LABELS, type DisplayNames } from './describe';
import {
  ANY,
  finishChoices,
  finishEdit,
  parseQuantity,
  printingChoices,
  printingEdit,
  type AskedValues,
  type Choice,
} from './inspector';

const SECTIONS: readonly Section[] = ['commander', 'main', 'sideboard', 'maybeboard'];

interface FieldProps {
  readonly label: string;
  readonly children: (id: string) => ReactNode;
}

function Field({ label, children }: FieldProps) {
  const id = useId();

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {children(id)}
    </div>
  );
}

interface ChoiceListProps {
  readonly id: string;
  readonly value: string;
  readonly choices: readonly Choice[];
  readonly onChange: (value: string) => void;
}

function ChoiceList({ id, value, choices, onChange }: ChoiceListProps) {
  return (
    <select
      id={id}
      className={styles.select}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {choices.map((choice) => (
        <option key={choice.value} value={choice.value}>
          {choice.label}
        </option>
      ))}
    </select>
  );
}

interface QuantityProps {
  readonly id: string;
  readonly entryId: string;
  readonly quantity: number;
  readonly onEdit: (edit: DeckEdit) => void;
}

function Quantity({ id, entryId, quantity, onEdit }: QuantityProps) {
  const cancelled = useRef(false);
  const [draft, setDraft] = useState<string | null>(null);

  function setQuantity(next: number) {
    setDraft(null);
    if (next !== quantity) onEdit({ kind: 'setQuantity', entryId, quantity: next });
  }

  function commit() {
    if (cancelled.current) {
      cancelled.current = false;
      setDraft(null);
      return;
    }

    const next = draft === null ? null : parseQuantity(draft);
    if (next === null) setDraft(null);
    else setQuantity(next);
  }

  return (
    <div className={styles.stepper}>
      <button
        type="button"
        className={styles.step}
        aria-label="Fewer"
        disabled={quantity <= 1}
        onClick={() => setQuantity(quantity - 1)}
      >
        −
      </button>
      <input
        id={id}
        className={styles.quantity}
        inputMode="numeric"
        maxLength={3}
        value={draft ?? String(quantity)}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') commit();

          // Esc unpins the panel, and the blur that follows must not save the draft.
          if (event.key === 'Escape') cancelled.current = true;
        }}
      />
      <button
        type="button"
        className={styles.step}
        aria-label="More"
        disabled={quantity >= MAX_QUANTITY}
        onClick={() => setQuantity(quantity + 1)}
      >
        +
      </button>
    </div>
  );
}

interface InThisDeckProps {
  readonly row: DeckRow;
  readonly asked: AskedValues;
  readonly names: DisplayNames;
  readonly catalog: CatalogIndex;
  readonly onEdit: (edit: DeckEdit) => void;
  readonly onRemove: () => void;
}

function InThisDeck({ row, asked, names, catalog, onEdit, onRemove }: InThisDeckProps) {
  const headingId = useId();
  const printingId = asked.printing?.printingId ?? ANY;

  return (
    <section className={styles.block} aria-labelledby={headingId}>
      <h3 id={headingId} className={styles.heading}>
        In this deck
      </h3>
      <Field label="Quantity">
        {(id) => (
          <Quantity id={id} entryId={row.entryId} quantity={asked.quantity} onEdit={onEdit} />
        )}
      </Field>
      <Field label="Section">
        {(id) => (
          <ChoiceList
            id={id}
            value={asked.section}
            choices={SECTIONS.map((section) => ({
              value: section,
              label: SECTION_LABELS[section],
            }))}
            onChange={(value) => {
              const section = SECTIONS.find((candidate) => candidate === value);
              if (section !== undefined)
                onEdit({ kind: 'setSection', entryId: row.entryId, section });
            }}
          />
        )}
      </Field>
      <Field label="Printing">
        {(id) => (
          <ChoiceList
            id={id}
            value={printingId}
            choices={printingChoices(row.oracleId, catalog)}
            onChange={(value) => onEdit(printingEdit(row.entryId, value))}
          />
        )}
      </Field>
      {asked.printing !== null && (
        <Field label="Finish">
          {(id) => (
            <ChoiceList
              id={id}
              value={asked.printing?.finish ?? ANY}
              choices={finishChoices(printingId, catalog)}
              onChange={(value) => onEdit(finishEdit(row.entryId, printingId, value))}
            />
          )}
        </Field>
      )}
      <ul className={styles.lines}>
        {popupLines(row, names, catalog).map((line, index) => (
          <li key={index}>
            {line.status !== null && <StatusMark status={line.status} />}
            {line.text}
          </li>
        ))}
      </ul>
      <button type="button" className={styles.textButton} onClick={onRemove}>
        Remove from deck
      </button>
    </section>
  );
}

export interface DeckInspectorProps {
  readonly row: DeckRow | null;
  readonly card: DeckRow;
  readonly removed: boolean;
  readonly asked: AskedValues | null;
  readonly error: string | null;
  readonly names: DisplayNames;
  readonly catalog: CatalogIndex;
  readonly accent: string | null;
  readonly focusKey: number | null;
  readonly onEdit: (edit: DeckEdit) => void;
  readonly onRemove: () => void;
  readonly onPutBack: () => void;
  readonly onUnpin: () => void;
}

export function DeckInspector({
  row,
  card,
  removed,
  asked,
  error,
  names,
  catalog,
  accent,
  focusKey,
  onEdit,
  onRemove,
  onPutBack,
  onUnpin,
}: DeckInspectorProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (focusKey !== null) titleRef.current?.focus();
  }, [focusKey]);

  return (
    <div {...accentProps(accent)}>
      <InspectorPanel
        title={card.name}
        titleRef={titleRef}
        media={
          <CardImage key={card.displayPrinting?.id ?? 'none'} row={card} className={styles.image} />
        }
        onUnpin={onUnpin}
        onKeyDown={(event) => {
          if (event.key !== 'Escape') return;
          event.preventDefault();
          onUnpin();
        }}
      >
        <p className={styles.type}>{card.typeLine}</p>
        {row !== null && asked !== null && (
          <InThisDeck
            row={row}
            asked={asked}
            names={names}
            catalog={catalog}
            onEdit={onEdit}
            onRemove={onRemove}
          />
        )}
        {row === null && removed && (
          <div className={styles.removed}>
            <p>Removed from deck</p>
            {/* Remove unmounts the button that had focus; Put back takes it so the keyboard isn't lost. */}
            <button type="button" className={styles.textButton} autoFocus onClick={onPutBack}>
              Put back
            </button>
          </div>
        )}
        {error !== null && (
          <p className={styles.error} role="alert">
            Couldn't change this card · {error}
          </p>
        )}
      </InspectorPanel>
    </div>
  );
}
