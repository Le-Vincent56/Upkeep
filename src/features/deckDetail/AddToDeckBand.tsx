import { useEffect, useId, useReducer, useRef, useState, type FormEvent } from 'react';
import type { CatalogIndex } from '../../catalog/catalogIndex';
import { MAX_QUANTITY } from '../../decks/edits';
import { newEntryId } from '../../decks/ids';
import type { DeckEntry, Section } from '../../decks/types';
import { Button } from '../../ui/Button';
import { CardField } from '../../ui/CardField';
import { cardFieldReducer, EMPTY_CARD_FIELD } from '../../ui/cardFieldState';
import { addAttempt, addResultLine } from './addToDeck';
import styles from './AddToDeckBand.module.css';
import type { AddOutcome } from './deckBuildRequests';
import { SECTION_LABELS } from './describe';

const SECTIONS = Object.keys(SECTION_LABELS) as Section[];

interface AddToDeckBandProps {
  readonly catalog: CatalogIndex;
  readonly section: Section;
  readonly onSection: (section: Section) => void;
  readonly onAdd: (entry: DeckEntry) => Promise<AddOutcome>;
  readonly onLanded: (entryId: string) => void;
  readonly onClose: () => void;
}

export function AddToDeckBand({
  catalog,
  section,
  onSection,
  onAdd,
  onLanded,
  onClose,
}: AddToDeckBandProps) {
  const id = useId();
  const [field, dispatch] = useReducer(cardFieldReducer, EMPTY_CARD_FIELD);
  const [quantity, setQuantity] = useState('1');
  const [line, setLine] = useState<string | null>(null);
  const cardRef = useRef<HTMLInputElement>(null);
  const latestSend = useRef(0);

  useEffect(() => {
    cardRef.current?.focus();
    // An addition still settling when the band closes must not write into it.
    return () => {
      latestSend.current = -1;
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const attempt = addAttempt(field, section, quantity, newEntryId());
    if (attempt.kind === 'none') return;
    if (attempt.kind === 'refused') {
      latestSend.current += 1;
      setLine(attempt.line);
      return;
    }

    dispatch({ type: 'reset' });
    setQuantity('1');
    cardRef.current?.focus();

    latestSend.current += 1;
    const send = latestSend.current;
    const outcome = await onAdd(attempt.entry);
    if (send !== latestSend.current) return;

    setLine(addResultLine(attempt.entry, outcome, catalog));
    if (outcome.kind === 'added' || outcome.kind === 'merged') onLanded(outcome.entry.id);
  }

  return (
    <form
      className={styles.band}
      aria-label="Add to deck"
      onSubmit={(event) => void submit(event)}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose();
        // A select doesn't submit its form on Enter by itself, unlike a text field.
        if (event.key === 'Enter' && event.target instanceof HTMLSelectElement) {
          event.preventDefault();
          event.currentTarget.requestSubmit();
        }
      }}
    >
      <div className={styles.fields}>
        <div className={styles.card}>
          <CardField catalog={catalog} state={field} onEvent={dispatch} inputRef={cardRef} />
        </div>
        <div className={styles.field}>
          <label htmlFor={`${id}-section`} className={styles.label}>
            Section
          </label>
          <select
            id={`${id}-section`}
            className={styles.select}
            value={section}
            onChange={(event) => {
              const next = SECTIONS.find((candidate) => candidate === event.target.value);
              if (next !== undefined) onSection(next);
            }}
          >
            {SECTIONS.map((option) => (
              <option key={option} value={option}>
                {SECTION_LABELS[option]}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor={`${id}-quantity`} className={styles.label}>
            Quantity
          </label>
          <input
            id={`${id}-quantity`}
            className={styles.quantity}
            type="number"
            min={1}
            max={MAX_QUANTITY}
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
        </div>
        <div className={styles.actions}>
          <Button weight="next" type="submit">
            Add to deck
          </Button>
          <button type="button" className={styles.done} onClick={onClose}>
            Done
          </button>
        </div>
      </div>
      <p className={styles.line} role="status">
        {line}
      </p>
    </form>
  );
}
