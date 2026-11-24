import { useId, type KeyboardEvent, type Ref } from 'react';
import type { CatalogIndex } from '../catalog/catalogIndex';
import { cardMatches, CARD_MATCH_LIMIT, type CardMatch } from '../catalog/cardSearch';
import { manaSymbolCodes } from '../catalog/manaSymbols';
import { printingLabel } from '../catalog/printingLabel';
import styles from './CardField.module.css';
import type { CardFieldEvent, CardFieldState } from './cardFieldState';
import { ManaSymbols } from './ManaSymbols';

interface CardFieldProps {
  readonly catalog: CatalogIndex;
  readonly state: CardFieldState;
  readonly onEvent: (event: CardFieldEvent) => void;
  readonly inputRef?: Ref<HTMLInputElement>;
}

function MatchOption({ match }: { readonly match: CardMatch }) {
  const codes = manaSymbolCodes(match.card.faces[0]?.manaCost ?? '');

  return (
    <>
      <span className={styles.name}>{match.card.name}</span>
      {match.printing !== null && (
        <span className={styles.printing}>{printingLabel(match.printing, null)}</span>
      )}
      {codes.length > 0 && (
        <span className={styles.cost} aria-hidden="true">
          <ManaSymbols codes={codes} label={codes.join(' ')} />
        </span>
      )}
    </>
  );
}

export function CardField({ catalog, state, onEvent, inputRef }: CardFieldProps) {
  const id = useId();
  const listId = `${id}-matches`;
  const optionId = (index: number) => `${id}-match-${index}`;

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        onEvent({ type: 'down' });
        break;

      case 'ArrowUp':
        event.preventDefault();
        onEvent({ type: 'up' });
        break;

      case 'Escape':
        if (!state.open) return;
        event.stopPropagation();
        onEvent({ type: 'escape' });
        break;
    }
  }

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        Card
      </label>
      <input
        id={id}
        ref={inputRef}
        className={styles.input}
        type="text"
        role="combobox"
        autoComplete="off"
        spellCheck={false}
        aria-autocomplete="list"
        aria-expanded={state.open}
        aria-controls={listId}
        aria-activedescendant={state.open ? optionId(state.highlighted) : undefined}
        value={state.text}
        onChange={(event) =>
          onEvent({
            type: 'typed',
            text: event.target.value,
            matches: cardMatches(catalog, event.target.value, CARD_MATCH_LIMIT),
          })
        }
        onKeyDown={onKeyDown}
        onBlur={() => onEvent({ type: 'leave' })}
      />
      <ul
        id={listId}
        className={styles.list}
        role="listbox"
        aria-label="Matching cards"
        hidden={!state.open}
      >
        {state.open &&
          state.matches.map((match, index) => (
            <li
              key={`${match.card.oracleId}-${match.printing?.id ?? 'any'}`}
              id={optionId(index)}
              className={styles.option}
              role="option"
              aria-selected={index === state.highlighted}
              // Keeps focus in the field, so its blur can't choose the highlighted match first.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onEvent({ type: 'pick', index })}
            >
              <MatchOption match={match} />
            </li>
          ))}
      </ul>
    </div>
  );
}
